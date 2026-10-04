import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OMV_URL = process.env.OMV_URL || 'http://127.0.0.1/rpc.php';
const OMV_USER = process.env.OMV_USER || 'admin';
const OMV_PASS = process.env.OMV_PASS || 'openmediavault';

let sessionId = null;

/**
 * Authenticates with OMV using the Session::login service endpoint.
 * Captures the session token for the X-OPENMEDIAVAULT-SESSIONID header.
 */
export async function ensureAuth() {
  if (sessionId) return;

  try {
    console.log(`Authenticating with OpenMediaVault RPC at ${OMV_URL}...`);

    const response = await axios.post(
      OMV_URL,
      {
        service: 'Session',
        method: 'login',
        params: {
          username: OMV_USER,
          password: OMV_PASS,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 5000,
      }
    );

    // OMV 7+ returns the session identifier in the response body or set-cookie header
    if (response.data?.response) {
      // Check response body for session ID or token
      sessionId = response.data.response.authenticated
        ? response.data.response.sessionid || response.data.response.token
        : null;
    }

    // Fallback: Check set-cookie header for OMVSESSID
    if (!sessionId && response.headers['set-cookie']) {
      const setCookie = response.headers['set-cookie'];
      const sessCookie = setCookie.find((c) => c.includes('OMVSESSID'));
      if (sessCookie) {
        sessionId = sessCookie.split(';')[0].split('=')[1];
      }
    }

    if (response.data?.error) {
      throw new Error(`OMV Auth Error: ${response.data.error.message}`);
    }

    if (!sessionId) {
      // If authentication flag passed but no explicit ID was returned, set placeholder flag
      sessionId = 'authenticated-session';
    }

    console.log('OMV Authentication successful.');
  } catch (err) {
    sessionId = null;
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`OMV Auth failed: ${msg}`);
    throw new Error(`Authentication failed: ${msg}`);
  }
}

/**
 * Calls an OMV JSON-RPC endpoint with the session header attached.
 */
export async function callOMV(service, method, params = null) {
  await ensureAuth();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (sessionId) {
      headers['X-OPENMEDIAVAULT-SESSIONID'] = sessionId;
      headers['Cookie'] = `OMVSESSID=${sessionId}`;
    }

    const response = await axios.post(
      OMV_URL,
      { service, method, params },
      { headers, timeout: 10000 }
    );

    if (response.data?.error) {
      // Handling expired or invalid session token (Code 4001/5001)
      if (response.data.error.code === 4001 || response.data.error.code === 5001) {
        console.warn('OMV Session expired. Resetting token and re-authenticating...');
        sessionId = null;
        await ensureAuth();
        return callOMV(service, method, params);
      }
      throw new Error(`OMV Error [${response.data.error.code}]: ${response.data.error.message}`);
    }

    return response.data?.response;
  } catch (error) {
    if (error.response?.status === 401) {
      sessionId = null;
    }
    console.error(`RPC Call Failed (${service}.${method}):`, error.response?.data?.error?.message || error.message);
    throw error;
  }
}