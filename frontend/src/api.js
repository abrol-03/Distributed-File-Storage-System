// API base URL — via CRA proxy or direct
const BASE = process.env.REACT_APP_API_URL || '';

// ── Helper ─────────────────────────────────────────
const json = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
};

// ── System ─────────────────────────────────────────
export const fetchStats  = () => fetch(`${BASE}/stats`).then(json);
export const fetchHealth = () => fetch(`${BASE}/health`).then(json);

// ── Nodes ──────────────────────────────────────────
export const fetchNodes  = () => fetch(`${BASE}/nodes`).then(json);

// ── Files ──────────────────────────────────────────
export const fetchFiles    = () => fetch(`${BASE}/files`).then(json);
export const fetchFileInfo = (id) => fetch(`${BASE}/files/${id}`).then(json);
export const deleteFile    = (id) =>
  fetch(`${BASE}/files/${id}`, { method: 'DELETE' }).then(json);

// ── Upload ─────────────────────────────────────────
export const uploadFile = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);

    xhr.open('POST', `${BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve(xhr.responseText); }
      } else {
        reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(fd);
  });
};

// ── Download ───────────────────────────────────────
export const downloadFile = async (fileId, filename) => {
  const res = await fetch(`${BASE}/download/${fileId}`);
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename || fileId;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
