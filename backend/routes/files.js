import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { assertPathAllowed, filterVisiblePaths } from '../permissions.js';

const router = express.Router();
const storageRoot = path.resolve(process.env.DEFAULT_STORAGE_ROOT || '/srv');

router.use((req, res, next) => {
  if (!req.headers.authorization && process.env.ALLOW_ANONYMOUS !== 'true') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

function resolveSafePath(inputPath = storageRoot) {
  const candidate = path.resolve(inputPath);
  if (candidate !== storageRoot && !candidate.startsWith(`${storageRoot}${path.sep}`)) {
    const error = new Error('Path is outside the configured storage root');
    error.status = 403;
    throw error;
  }
  return candidate;
}

async function resolveAuthorizedPath(req, inputPath = storageRoot) {
  const safePath = resolveSafePath(inputPath);
  return assertPathAllowed(req, safePath);
}

router.get('/browse', async (req, res) => {
  let targetPath;

  try {
    targetPath = await resolveAuthorizedPath(req, req.query.path || storageRoot);
    const entries = await fs.readdir(targetPath, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(targetPath, entry.name);
        let size = 0;
        let modified = null;

        try {
          const stats = await fs.stat(fullPath);
          size = stats.size;
          modified = stats.mtime;
        } catch (_) {}

        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size,
          modified,
        };
      })
    );

    const visiblePaths = await filterVisiblePaths(req, items.map((item) => item.path));
    const visiblePathSet = new Set(visiblePaths);
    items = items.filter((item) => visiblePathSet.has(item.path));
    items.sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
    res.json({ currentPath: targetPath, rootPath: storageRoot, items });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Unable to read directory', details: err.message });
  }
});

router.get('/download', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'File path required' });

  try {
    const safePath = await resolveAuthorizedPath(req, filePath);
    await fs.access(safePath);
    res.download(safePath);
  } catch (err) {
    res.status(err.status || 404).json({ error: 'File not found', details: err.message });
  }
});

router.post('/mkdir', async (req, res) => {
  const { currentPath, folderName } = req.body;
  if (!currentPath || !folderName) {
    return res.status(400).json({ error: 'Missing currentPath or folderName' });
  }

  try {
    const safeCurrentPath = await resolveAuthorizedPath(req, currentPath);
    if (!/^[^\\/]+$/.test(folderName) || folderName === '.' || folderName === '..') {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    const target = await resolveAuthorizedPath(req, path.join(safeCurrentPath, folderName));
    await fs.mkdir(target, { recursive: true });
    res.json({ success: true, path: target });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to create directory', details: err.message });
  }
});

router.post('/upload', express.raw({ type: '*/*', limit: '2gb' }), async (req, res) => {
  const { currentPath, fileName } = req.query;
  if (!currentPath || !fileName || !/^[^\\/]+$/.test(fileName) || !req.body?.length) {
    return res.status(400).json({ error: 'A file, current path, and valid file name are required' });
  }

  try {
    const destination = await resolveAuthorizedPath(req, path.join(resolveSafePath(currentPath), fileName));
    await fs.writeFile(destination, req.body, { flag: 'wx' });
    res.json({ success: true, path: destination });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to upload file', details: err.message });
  }
});

router.delete('/delete', async (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Target path required' });

  try {
    const safePath = await resolveAuthorizedPath(req, targetPath);
    if (safePath === storageRoot) return res.status(400).json({ error: 'Cannot delete storage root' });
    await fs.rm(safePath, { recursive: true, force: true });
    res.json({ success: true, deleted: safePath });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to delete target', details: err.message });
  }
});

router.post('/rename', async (req, res) => {
  const { targetPath, newName } = req.body || {};
  if (!targetPath || !newName || !/^[^\\/]+$/.test(newName)) {
    return res.status(400).json({ error: 'Target path and valid new name are required' });
  }

  try {
    const safePath = await resolveAuthorizedPath(req, targetPath);
    const destination = await resolveAuthorizedPath(req, path.join(path.dirname(safePath), newName));
    await fs.rename(safePath, destination);
    res.json({ success: true, path: destination });
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to rename target', details: err.message });
  }
});

export default router;