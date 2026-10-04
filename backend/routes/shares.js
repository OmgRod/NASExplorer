import express from 'express';
import path from 'path';
import { callOMV, ensureAuth } from '../omvClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await ensureAuth();

    // Query OMV configured share definitions and mounted filesystem points
    const [shares, mounts] = await Promise.all([
      callOMV('ShareMgmt', 'getList').catch(() => []),
      callOMV('FileSystemMgmt', 'enumerateMountedFilesystems').catch(() => []),
    ]);

    const mountMap = new Map();
    if (Array.isArray(mounts)) {
      mounts.forEach((m) => {
        if (m.uuid) mountMap.set(m.uuid, m.mountpoint);
      });
    }

    const resolvedShares = (Array.isArray(shares) ? shares : []).map((share) => {
      const baseMount = mountMap.get(share.mntentuuid) || '/srv';
      const absolutePath = path.join(baseMount, share.reldirpath || '');

      return {
        id: share.uuid,
        name: share.name,
        comment: share.comment || '',
        relativePath: share.reldirpath || '',
        absolutePath,
      };
    });

    res.json(resolvedShares);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OMV shares', details: err.message });
  }
});

export default router;