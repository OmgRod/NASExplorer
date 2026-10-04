import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OMV_URL = process.env.OMV_URL || 'http://127.0.0.1/rpc.php';

/**
 * Helper to extract username and password from HTTP headers.
 * Supports standard HTTP Basic Auth or custom x-omv-* headers,
 * falling back to .env defaults if none are supplied.
 */
export function getCredentialsFromReq(req) {
  let username = process.env.OMV_USER || 'admin';
  let password = process.env.OMV_PASS || 'openmediavault';

  // 1. Check HTTP Basic Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii');
    const [user, pass] = credentials.split(':');
    if (user && pass) {
      username = user;
      password = pass;
    }
  } 
  // 2. Check custom headers
  else if (req.headers['x-omv-username'] && req.headers['x-omv-password']) {
    username = req.headers['x-omv-username'];
    password = req.headers['x-omv-password'];
  }

  return { username, password };
}

/**
 * Obtains an active session ID from OMV for a given set of credentials.
 */
export async function authenticateUser(username, password) {
  try {
    const response = await axios.post(
      OMV_URL,
      {
        service: 'Session',
        method: 'login',
        params: { username, password },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 5000,
      }
    );

    let sessionId = null;

    // Check set-cookie header for OMVSESSID
    const setCookie = response.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      const sessCookie = setCookie.find((c) => c.includes('OMVSESSID'));
      if (sessCookie) {
        const rawValue = sessCookie.split(';')[0];
        sessionId = rawValue.includes('=') ? rawValue.split('=')[1] : rawValue;
      }
    }

    // Fallback: Check response body payload
    if (!sessionId && response.data?.response) {
      const resData = response.data.response;
      if (typeof resData === 'string') sessionId = resData;
      else if (resData.sessionid) sessionId = resData.sessionid;
      else if (resData.token) sessionId = resData.token;
    }

    if (response.data?.error) {
      throw new Error(`OMV Auth Error: ${response.data.error.message}`);
    }

    if (!sessionId) {
      throw new Error('Authentication succeeded but failed to capture OMV session ID');
    }

    return sessionId;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`OMV Auth failed for user ${username}: ${msg}`);
    throw new Error(`Unauthorized: ${msg}`);
  }
}

/**
 * Main execution function: Authenticates dynamically with credentials from req
 * and invokes the target OMV RPC method.
 */
export async function callOMVWithReq(req, service, method, params = null) {
  const { username, password } = getCredentialsFromReq(req);
  const sessionId = await authenticateUser(username, password);

  try {
    const response = await axios.post(
      OMV_URL,
      { service, method, params },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-OPENMEDIAVAULT-SESSIONID': sessionId,
          'Cookie': `OMVSESSID=${sessionId}`,
        },
        timeout: 10000,
      }
    );

    if (response.data?.error) {
      throw new Error(`OMV Error [${response.data.error.code}]: ${response.data.error.message}`);
    }

    return response.data?.response;
  } catch (error) {
    console.error(`RPC Call Failed (${service}.${method}):`, error.response?.data?.error?.message || error.message);
    throw error;
  }
}