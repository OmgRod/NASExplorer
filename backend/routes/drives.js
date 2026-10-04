import express from 'express';
import { callOMV, ensureAuth } from '../omvClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await ensureAuth();

    // Query physical disks and mounted filesystems using modern OMV RPC endpoints
    const [disks, mountedFs] = await Promise.all([
      callOMV('Disks', 'getList').catch(() => []),
      callOMV('FileSystemMgmt', 'enumerateMountedFilesystems').catch(() => 
        callOMV('FileSystemMgmt', 'getList', { start: 0, limit: -1 }).catch(() => [])
      ),
    ]);

    const drives = (Array.isArray(mountedFs) ? mountedFs : []).map((fs) => {
      const parentDisk = (Array.isArray(disks) ? disks : []).find(
        (d) => fs.devicefile && d.devicefile && fs.devicefile.startsWith(d.devicefile)
      );

      const total = Number(fs.size) || 0;
      const used = Number(fs.used) || 0;
      const available = Number(fs.available) || Number(fs.free) || 0;
      const usedPercentage = total > 0 ? Math.round((used / total) * 100) : 0;

      return {
        id: fs.uuid || fs.devicefile || fs.mountpoint,
        name: fs.label || (parentDisk ? `${parentDisk.vendor || ''} ${parentDisk.model || ''}`.trim() : 'Storage Volume'),
        device: fs.devicefile || fs.fsname || 'N/A',
        mountPoint: fs.mountpoint || '',
        filesystem: fs.type || fs.fstype || 'ext4',
        capacity: {
          total,
          used,
          available,
          usedPercentage,
        },
      };
    });

    res.json(drives);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drive stats', details: err.message });
  }
});

export default router;