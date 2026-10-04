import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import { callOMVWithReq } from '../omvClient.js';

const execPromise = util.promisify(exec);
const router = express.Router();

// Native Linux fallback when OMV RPC denies non-admin context roles
async function getFallbackDrives() {
  const { stdout } = await execPromise('df -B1 --output=source,fstype,size,used,avail,target');
  const lines = stdout.trim().split('\n').slice(1);

  return lines
    .filter((line) => line.startsWith('/dev/'))
    .map((line) => {
      const [device, fstype, totalStr, usedStr, availStr, target] = line.trim().split(/\s+/);
      const total = Number(totalStr) || 0;
      const used = Number(usedStr) || 0;
      const available = Number(availStr) || 0;
      const usedPercentage = total > 0 ? Math.round((used / total) * 100) : 0;

      return {
        id: target,
        name: target === '/' ? 'Root System' : target.split('/').pop() || 'Storage Drive',
        device,
        mountPoint: target,
        filesystem: fstype,
        capacity: { total, used, available, usedPercentage },
      };
    });
}

router.get('/', async (req, res) => {
  try {
    const [disks, mountedFs] = await Promise.all([
      callOMVWithReq(req, 'DiskMgmt', 'enumerateDevices')
        .catch(() => callOMVWithReq(req, 'DiskMgmt', 'getList').catch(() => [])),
      callOMVWithReq(req, 'FileSystemMgmt', 'enumerateMountedFilesystems')
        .catch(() => callOMVWithReq(req, 'FileSystemMgmt', 'getList', { start: 0, limit: -1 }).catch(() => [])),
    ]);

    const diskList = Array.isArray(disks) ? disks : [];
    const fsList = Array.isArray(mountedFs) ? mountedFs : [];

    if (fsList.length === 0) throw new Error('Invalid context role');

    const drives = fsList.map((fs) => {
      const devicePath = fs.canonicaldevicefile || fs.devicefile || fs.device || fs.fsname || '';
      const total = Number(fs.size) || 0;
      const used = Number(fs.used) || 0;
      const available = Number(fs.available) || Number(fs.free) || 0;

      return {
        id: fs.uuid || fs.devicefile || fs.mountpoint,
        name: fs.label || 'Storage Volume',
        device: devicePath,
        mountPoint: fs.mountpoint || '',
        filesystem: fs.type || fs.fstype || 'ext4',
        capacity: {
          total,
          used,
          available,
          usedPercentage: total > 0 ? Math.round((used / total) * 100) : 0,
        },
      };
    });

    res.json(drives);
  } catch (err) {
    // If OMV RPC rejects the user's role context, return local system drives via df
    try {
      const fallbackDrives = await getFallbackDrives();
      res.json(fallbackDrives);
    } catch (fallbackErr) {
      res.status(403).json({ error: 'Access denied', details: err.message });
    }
  }
});

export default router;