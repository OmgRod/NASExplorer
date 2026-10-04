import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// 1. Directory Content Enumeration
router.get('/browse', async (req, res) => {
  const targetPath = req.query.path || process.env.DEFAULT_STORAGE_ROOT || '/srv';

  try {
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

    res.json({ currentPath: targetPath, items });
  } catch (err) {
    res.status(500).json({ error: 'Unable to read directory', details: err.message });
  }
});

// 2. Download / Stream File
router.get('/download', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'File path required' });

  try {
    await fs.access(filePath);
    res.download(filePath);
  } catch (err) {
    res.status(404).json({ error: 'File not found', details: err.message });
  }
});

// 3. Directory Creation
router.post('/mkdir', async (req, res) => {
  const { currentPath, folderName } = req.body;
  if (!currentPath || !folderName) {
    return res.status(400).json({ error: 'Missing currentPath or folderName' });
  }

  const target = path.join(currentPath, folderName);
  try {
    await fs.mkdir(target, { recursive: true });
    res.json({ success: true, path: target });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create directory', details: err.message });
  }
});

// 4. File / Directory Deletion
router.delete('/delete', async (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Target path required' });

  try {
    await fs.rm(targetPath, { recursive: true, force: true });
    res.json({ success: true, deleted: targetPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete target', details: err.message });
  }
});

export default router;