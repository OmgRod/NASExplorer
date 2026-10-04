import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OMV_URL = process.env.OMV_URL || 'http://127.0.0.1/rpc.php';
const OMV_USER = process.env.OMV_USER || 'admin';
const OMV_PASS = process.env.OMV_PASS || 'openmediavault';

let omvCookie = null;

export async function callOMV(service, method, params = null) {
  try {
    const response = await axios.post(
      OMV_URL,
      { service, method, params },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(omvCookie && { Cookie: omvCookie }),
        },
        timeout: 10000,
      }
    );

    // Capture and save session cookie if returned
    const setCookie = response.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      omvCookie = setCookie[0].split(';')[0];
    }

    if (response.data?.error) {
      // If session expired, reset cookie and attempt re-login once
      if (response.data.error.code === 5001 && service !== 'Auth') {
        omvCookie = null;
        await ensureAuth();
        return callOMV(service, method, params);
      }
      throw new Error(`OMV Error [${response.data.error.code}]: ${response.data.error.message}`);
    }

    return response.data?.response;
  } catch (error) {
    console.error(`RPC Call Failed (${service}.${method}):`, error.message);
    throw error;
  }
}

export async function ensureAuth() {
  if (!omvCookie) {
    try {
      console.log('Authenticating with OpenMediaVault RPC...');
      // Explicitly hit 127.0.0.1 and pass credentials
      const res = await axios.post(
        process.env.OMV_URL || 'http://127.0.0.1/rpc.php',
        {
          service: 'Auth',
          method: 'login',
          params: {
            username: process.env.OMV_USER || 'admin',
            password: process.env.OMV_PASS || 'openmediavault',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Host': 'localhost', // Some OMV Nginx configs require Host header on loopback
          },
        }
      );

      const setCookie = res.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        omvCookie = setCookie[0].split(';')[0];
        console.log('OMV Authentication successful.');
      } else if (res.data?.error) {
        throw new Error(res.data.error.message);
      }
    } catch (err) {
      console.error('OMV Auth failed:', err.message);
    }
  }
}