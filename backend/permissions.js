import path from 'path';
import { callOMVWithReq, getCredentialsFromReq } from './omvClient.js';

const storageRoot = path.resolve(process.env.DEFAULT_STORAGE_ROOT || '/srv');

function sharePath(share, mounts) {
  const mountPath = mounts.find((mount) => mount.uuid === share.mntentuuid)?.mountpoint || storageRoot;
  return path.resolve(mountPath, share.reldirpath || '');
}

function privilegeNames(share) {
  const privileges = share.privileges || share.permissions || share.acl || [];
  if (!Array.isArray(privileges)) return null;

  const names = privileges
    .filter((entry) => entry && (!entry.type || ['user', 'group'].includes(entry.type.toLowerCase())))
    .map((entry) => entry.name || entry.username || entry.user || entry.group)
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());

  return names.length > 0 ? names : null;
}

export async function getShareContext(req) {
  const [shares, mounts] = await Promise.all([
    callOMVWithReq(req, 'ShareMgmt', 'getList', { start: 0, limit: -1 }).catch(() => []),
    callOMVWithReq(req, 'FileSystemMgmt', 'enumerateMountedFilesystems').catch(() => []),
  ]);
  const username = getCredentialsFromReq(req).username.toLowerCase();
  const mountList = Array.isArray(mounts) ? mounts : [];

  const allShares = (Array.isArray(shares) ? shares : []).map((share) => ({
    ...share,
    absolutePath: sharePath(share, mountList),
    privilegeNames: privilegeNames(share),
    username,
  }));

  return {
    allShares,
    accessibleShares: allShares.filter((share) => !share.privilegeNames || share.privilegeNames.includes(username)),
  };
}

export async function getAccessibleShares(req) {
  const { accessibleShares } = await getShareContext(req);
  return accessibleShares;
}

export async function assertPathAllowed(req, targetPath) {
  const candidate = path.resolve(targetPath);
  if (candidate !== storageRoot && !candidate.startsWith(`${storageRoot}${path.sep}`)) {
    const error = new Error('Path is outside the configured storage root');
    error.status = 403;
    throw error;
  }

  const { allShares, accessibleShares } = await getShareContext(req);
  const allowed = accessibleShares.some((share) => candidate === share.absolutePath || candidate.startsWith(`${share.absolutePath}${path.sep}`));
  const belongsToShare = allShares.some((share) => candidate === share.absolutePath || candidate.startsWith(`${share.absolutePath}${path.sep}`));

  if (belongsToShare && !allowed) {
    const error = new Error('You do not have permission to access this shared folder');
    error.status = 403;
    throw error;
  }
  return candidate;
}

export async function filterVisiblePaths(req, paths) {
  const { allShares, accessibleShares } = await getShareContext(req);
  const isAllowed = (targetPath) => accessibleShares.some((share) => targetPath === share.absolutePath || targetPath.startsWith(`${share.absolutePath}${path.sep}`));
  const isProtected = (targetPath) => allShares.some((share) => targetPath === share.absolutePath || targetPath.startsWith(`${share.absolutePath}${path.sep}`));
  return paths.filter((targetPath) => !isProtected(targetPath) || isAllowed(targetPath));
}