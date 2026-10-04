import express from 'express';
import { callOMV, ensureAuth } from '../omvClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await ensureAuth();

    const [disks, filesystems] = await Promise.all([
      callOMV('Disks', 'getList').catch(() => []),
      callOMV('FileSystemMgmt', 'getList', { start: 0, limit: -1 }).catch(() => []),
    ]);

    const drives = filesystems
      .filter((fs) => fs.mounted)
      .map((fs) => {
        const parentDisk = disks.find((d) => fs.fsname && fs.fsname.startsWith(d.devicefile));
        const total = Number(fs.size) || 0;
        const used = Number(fs.used) || 0;
        const available = Number(fs.available) || 0;
        const usedPercentage = total > 0 ? Math.round((used / total) * 100) : 0;

        return {
          id: fs.uuid || fs.fsname,
          name: fs.label || (parentDisk ? `${parentDisk.vendor} ${parentDisk.model}` : 'Local Volume'),
          device: fs.fsname,
          mountPoint: fs.mountpoint,
          filesystem: fs.type,
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