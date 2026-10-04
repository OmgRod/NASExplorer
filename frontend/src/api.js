const API_BASE = '/api';

export function getAuthHeaders() {
  const creds = sessionStorage.getItem('nas_creds');
  if (!creds) return {};
  const { username, password } = JSON.parse(creds);
  return {
    'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
  };
}

export function saveCredentials(username, password) {
  sessionStorage.setItem('nas_creds', JSON.stringify({ username, password }));
}

export function clearCredentials() {
  sessionStorage.removeItem('nas_creds');
}

export async function fetchDrives() {
  const res = await fetch(`${API_BASE}/drives`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Unauthorized or failed to fetch drives');
  return res.json();
}

export async function fetchShares() {
  const res = await fetch(`${API_BASE}/shares`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Unauthorized or failed to fetch shares');
  return res.json();
}

export async function browseFiles(path = '/srv') {
  const res = await fetch(`${API_BASE}/files/browse?path=${encodeURIComponent(path)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to browse path');
  return res.json();
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.details || data.error || 'Request failed');
  return data;
}

export function createFolder(currentPath, folderName) {
  return requestJson(`${API_BASE}/files/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPath, folderName }),
  });
}

export function renameFile(targetPath, newName) {
  return requestJson(`${API_BASE}/files/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPath, newName }),
  });
}

export function deleteFile(targetPath) {
  return requestJson(`${API_BASE}/files/delete?path=${encodeURIComponent(targetPath)}`, {
    method: 'DELETE',
  });
}

export function getDownloadUrl(targetPath) {
  return `${API_BASE}/files/download?path=${encodeURIComponent(targetPath)}`;
}

export async function downloadFile(targetPath, fileName) {
  const res = await fetch(getDownloadUrl(targetPath), { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Unable to download file');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// frontend/src/api.js

export async function loginUser(username, password) {
  const credentials = btoa(`${username}:${password}`);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Invalid username or password');
  }

  // Save validated credentials to sessionStorage
  saveCredentials(username, password);
  return res.json();
}

export async function uploadFile(currentPath, file) {
  const res = await fetch(`${API_BASE}/files/upload?currentPath=${encodeURIComponent(currentPath)}&fileName=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.details || data.error || 'Unable to upload file');
  return data;
}