import express from 'express';
import { authenticateUser, getCredentialsFromReq } from '../omvClient.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  // Extract credentials either from request body or headers
  let username = req.body?.username;
  let password = req.body?.password;

  if (!username || !password) {
    const creds = getCredentialsFromReq(req);
    username = creds.username;
    password = creds.password;
  }

  try {
    // Attempt authentication against OpenMediaVault's Session::login RPC
    const sessionId = await authenticateUser(username, password);

    res.json({
      success: true,
      message: 'Authentication successful',
      username,
      sessionId,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Invalid OMV credentials',
      details: err.message,
    });
  }
});

export default router;