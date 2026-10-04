import express from 'express';
import path from 'path';
import { callOMV, ensureAuth } from '../omvClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await ensureAuth();

    const [shares, mounts] = await Promise.all([
      callOMV('ShareMgmt', 'getList').catch(() => []),
      callOMV('FileSystemMgmt', 'getMountList').catch(() => []),
    ]);

    const mountMap = new Map(mounts.map((m) => [m.uuid, m.mountpoint]));

    const resolvedShares = shares.map((share) => {
      const baseMount = mountMap.get(share.mntentuuid) || '';
      const absolutePath = path.join(baseMount, share.reldirpath || '');

      return {
        id: share.uuid,
        name: share.name,
        comment: share.comment || '',
        relativePath: share.reldirpath,
        absolutePath,
      };
    });

    res.json(resolvedShares);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OMV shares', details: err.message });
  }
});

export default router;