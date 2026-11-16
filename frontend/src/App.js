import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchStats, fetchNodes, fetchFiles, fetchFileInfo,
  uploadFile, downloadFile, deleteFile
} from './api';

// ── Lucide-style SVG Icons (strokeWidth 1.75) ────────────────────────
const Icons = {
  Server: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
      <line x1="6" x2="6.01" y1="6" y2="6"/>
      <line x1="6" x2="6.01" y1="18" y2="18"/>
    </svg>
  ),
  HardDrive: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" x2="2" y1="12" y2="12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
      <line x1="6" x2="6.01" y1="16" y2="16"/>
      <line x1="10" x2="10.01" y1="16" y2="16"/>
    </svg>
  ),
  UploadCloud: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
      <path d="M12 12v9"/>
      <path d="m8 17 4-4 4 4"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  FileText: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  ),
  Layers: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" x2="16.65" y1="21" y2="16.65"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10"/>
      <line x1="12" x2="12" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="14"/>
    </svg>
  ),
  Activity: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  MoreVertical: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1"/>
      <circle cx="12" cy="12" r="1"/>
      <circle cx="12" cy="19" r="1"/>
    </svg>
  ),
  Database: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
};

// ── Formatting Utilities ──────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
};

const formatDate = (epoch) => {
  if (!epoch) return '—';
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const shortHash = (hash, len = 12) => {
  if (!hash) return '—';
  return `${hash.slice(0, len)}…`;
};

// ── Node tint class helper ────────────────────────────
const NODE_TINT_CLASSES = ['node-card-a', 'node-card-b', 'node-card-c'];
const BAR_FILL_CLASSES = ['bar-fill-a', 'bar-fill-b', 'bar-fill-c'];

const getNodeTintClass = (nodeId) => {
  if (!nodeId) return NODE_TINT_CLASSES[0];
  const lower = nodeId.toLowerCase();
  if (lower.includes('node_a') || lower.includes('node-a') || lower.endsWith('a')) return 'node-card-a';
  if (lower.includes('node_b') || lower.includes('node-b') || lower.endsWith('b')) return 'node-card-b';
  if (lower.includes('node_c') || lower.includes('node-c') || lower.endsWith('c')) return 'node-card-c';
  return NODE_TINT_CLASSES[0];
};

const getBarFillClass = (nodeId, index) => {
  if (!nodeId) return BAR_FILL_CLASSES[index % BAR_FILL_CLASSES.length];
  const lower = nodeId.toLowerCase();
  if (lower.includes('node_a') || lower.includes('node-a') || lower.endsWith('a')) return 'bar-fill-a';
  if (lower.includes('node_b') || lower.includes('node-b') || lower.endsWith('b')) return 'bar-fill-b';
  if (lower.includes('node_c') || lower.includes('node-c') || lower.endsWith('c')) return 'bar-fill-c';
  return BAR_FILL_CLASSES[index % BAR_FILL_CLASSES.length];
};

// ── Main Dashboard Application ────────────────────────
export default function App() {
  const [stats, setStats] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastTransferStats, setLastTransferStats] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const addToast = (msg, type = 'normal') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [s, n, f] = await Promise.all([fetchStats(), fetchNodes(), fetchFiles()]);
      setStats(s);
      setNodes(n);
      setFiles(f);
    } catch (e) {
      // Coordinator might be booting
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load details modal
  useEffect(() => {
    if (!selectedFileId) {
      setFileDetails(null);
      return;
    }
    fetchFileInfo(selectedFileId)
      .then(setFileDetails)
      .catch(() => addToast('Failed to load file metadata', 'error'));
  }, [selectedFileId]);

  // File Upload Handling
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setLastTransferStats(null);
    const t0 = performance.now();

    try {
      const res = await uploadFile(file, (pct) => setUploadProgress(pct));
      const t1 = performance.now();
      const elapsed = (t1 - t0) / 1000;
      const speed = (file.size / (1024 * 1024)) / Math.max(elapsed, 0.05);

      setLastTransferStats({
        name: file.name,
        size: file.size,
        chunks: res.chunk_count,
        speed: speed.toFixed(2),
        duration: elapsed.toFixed(2),
        rf: res.replication_factor
      });

      addToast(`${file.name} distributed across nodes successfully`, 'success');
      loadData();
      setActiveTab('files');
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Download File
  const handleDownload = async (file) => {
    try {
      addToast(`Reconstructing ${file.filename} from replicas…`);
      await downloadFile(file.file_id, file.filename);
      addToast(`Verified SHA-256 for ${file.filename}`, 'success');
    } catch (err) {
      addToast(`Download error: ${err.message}`, 'error');
    }
  };

  // Delete File
  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.filename}" and its distributed chunks?`)) return;
    try {
      await deleteFile(file.file_id);
      addToast(`File and replicas purged`, 'normal');
      loadData();
    } catch (err) {
      addToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  // Derived data
  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsedBytes = nodes.reduce((acc, n) => {
    return acc + (n.capacity - n.free_space);
  }, 0);

  const totalCapacityBytes = nodes.reduce((acc, n) => acc + (n.capacity || 0), 0);
  const totalUsedPct = totalCapacityBytes > 0
    ? Math.min(100, Math.round((totalUsedBytes / totalCapacityBytes) * 100))
    : 0;

  const maxChunks = nodes.reduce((acc, n) => Math.max(acc, n.chunk_count || 0), 1);

  return (
    <div className="page-wrapper">
      <div className="app-shell">

        {/* ══════════════════════════════════════
            SIDEBAR
        ══════════════════════════════════════ */}
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="logo-mark">
              <Icons.Database />
            </div>
            <div>
              <div className="logo-wordmark">DFS</div>
              <div className="logo-sub">Storage Lab</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            <button className="nav-item active">
              <span className="nav-icon"><Icons.Activity /></span>
              <span className="nav-label">Dashboard</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon"><Icons.HardDrive /></span>
              <span className="nav-label">Nodes</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon"><Icons.FileText /></span>
              <span className="nav-label">Files</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon"><Icons.BarChart /></span>
              <span className="nav-label">Analytics</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon"><Icons.ShieldCheck /></span>
              <span className="nav-label">Health</span>
            </button>
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="storage-summary-label">Cluster Storage</div>
            <div className="storage-summary-value">
              {formatBytes(totalUsedBytes)} used
            </div>
            <div className="sidebar-progress-track">
              <div
                className="sidebar-progress-fill"
                style={{ width: `${totalUsedPct}%` }}
              />
            </div>
            <button
              className="btn-distribute"
              onClick={() => setActiveTab('upload')}
            >
              Distribute File
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════ */}
        <main className="main-content">
          {/* Top Bar */}
          <div className="topbar">
            <div className="search-wrapper">
              <span className="search-icon">
                <Icons.Search />
              </span>
              <input
                className="search-input"
                type="text"
                placeholder="Search files…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="coordinator-pill">
              <span className="coordinator-dot" />
              <span className="coordinator-text">Coordinator :8000</span>
            </div>
            <div className="avatar-circle">DS</div>
          </div>

          {/* Scrollable content */}
          <div className="main-scroll">

            {/* ── Storage Nodes ── */}
            <section>
              <div className="section-header">
                <span className="section-title">Storage Nodes</span>
                <div className="section-action">
                  <button className="btn btn-secondary btn-sm" onClick={loadData}>
                    <Icons.Refresh /> Refresh
                  </button>
                </div>
              </div>

              <div className="nodes-grid">
                {nodes.length === 0 ? (
                  <div className="empty-box" style={{ gridColumn: '1 / -1' }}>
                    <div className="empty-box-icon">
                      <Icons.HardDrive />
                    </div>
                    No storage nodes connected. Start daemon instances on ports 8001–8003.
                  </div>
                ) : (
                  nodes.map((n, idx) => {
                    const used = n.capacity - n.free_space;
                    const pct = n.capacity > 0 ? Math.min(100, Math.round((used / n.capacity) * 100)) : 0;
                    const isOnline = n.status === 'online';
                    const tintClass = getNodeTintClass(n.node_id);
                    const fillClass = pct >= 90
                      ? 'node-fill-danger'
                      : pct >= 70
                        ? 'node-fill-warn'
                        : 'node-fill-normal';

                    return (
                      <div key={n.node_id} className={`node-card ${tintClass}`}>
                        <button className="node-menu-btn">
                          <Icons.MoreVertical />
                        </button>

                        <div>
                          <div className="node-icon-wrap">
                            <Icons.HardDrive />
                          </div>
                        </div>

                        <div>
                          <div className="node-name">{n.node_id}</div>
                          <div className="node-url">{n.url}</div>
                        </div>

                        <div>
                          <span className={`node-badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                            {isOnline ? '● Online' : '○ Offline'}
                          </span>
                        </div>

                        <div>
                          <div className="node-disk-label">
                            <span>Disk Usage</span>
                            <span>{formatBytes(used)} / {formatBytes(n.capacity)}</span>
                          </div>
                          <div className="node-progress-track">
                            <div
                              className={`node-progress-fill ${fillClass}`}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </div>

                        <div className="node-chunk-count">
                          {n.chunk_count ?? 0} chunks stored
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ── Stats Strip ── */}
            <div className="stats-strip">
              <div className="stat-block primary">
                <div className="stat-label">Total Storage Used</div>
                <div className="stat-value">{formatBytes(totalUsedBytes)}</div>
                <div className="stat-sub">{nodes.length} node{nodes.length !== 1 ? 's' : ''} in cluster</div>
                <span
                  className="stat-badge"
                  style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                >
                  ● Active
                </span>
              </div>
              <div className="stat-block">
                <div className="stat-label">Stored Files</div>
                <div className="stat-value">{stats?.total_files ?? '—'}</div>
                <div className="stat-sub">{stats ? formatBytes(stats.total_size_bytes) : '—'} logical</div>
              </div>
              <div className="stat-block">
                <div className="stat-label">Chunks Distributed</div>
                <div className="stat-value">{stats?.total_chunks ?? '—'}</div>
                <div className="stat-sub">1 MiB segment size</div>
              </div>
              <div className="stat-block">
                <div className="stat-label">Replication Factor</div>
                <div className="stat-value">{stats ? `${stats.replication_factor}×` : '—'}</div>
                <div className="stat-sub">Mirror copies</div>
              </div>
            </div>

            {/* ── Content Grid: Files + Upload ── */}
            <div className="content-grid">

              {/* Files Card */}
              <div className="files-card">
                <div className="files-card-header">
                  <span className="files-card-title">File Objects</span>
                  <span className="files-count-pill">{files.length} files</span>
                </div>

                <div className="files-tabs">
                  <button
                    className={`file-tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                  >
                    <Icons.FileText />
                    Stored Files
                    <span className="panel-tab-count">{files.length}</span>
                  </button>
                  <button
                    className={`file-tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                  >
                    <Icons.UploadCloud />
                    Distribute File
                  </button>
                </div>

                {/* Files Table */}
                {activeTab === 'files' && (
                  <div className="table-responsive">
                    {filteredFiles.length === 0 ? (
                      <div className="empty-box">
                        <div className="empty-box-icon">
                          <Icons.FileText />
                        </div>
                        {searchQuery
                          ? `No files match "${searchQuery}"`
                          : 'No files currently stored. Switch to "Distribute File" to upload your first object.'}
                      </div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Filename</th>
                            <th>Size</th>
                            <th>Chunks</th>
                            <th>SHA-256 Digest</th>
                            <th>Uploaded</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFiles.map(f => (
                            <tr key={f.file_id}>
                              <td>
                                <div className="file-icon-cell">
                                  <div className="file-icon-tile">
                                    <Icons.FileText />
                                  </div>
                                  <span className="file-title">{f.filename}</span>
                                </div>
                              </td>
                              <td>{formatBytes(f.size)}</td>
                              <td>
                                <span className="chunk-count-pill">{f.chunk_count}</span>
                              </td>
                              <td className="font-mono" title={f.checksum}>
                                {shortHash(f.checksum, 14)}
                              </td>
                              <td>{formatDate(f.uploaded_at)}</td>
                              <td>
                                <div className="actions-cell">
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setSelectedFileId(f.file_id)}
                                    title="Inspect chunk layout"
                                  >
                                    <Icons.Info /> Details
                                  </button>
                                  <button
                                    className="btn btn-download btn-sm"
                                    onClick={() => handleDownload(f)}
                                    title="Reconstruct from storage nodes"
                                  >
                                    <Icons.Download /> Retrieve
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(f)}
                                    title="Delete from nodes"
                                  >
                                    <Icons.Trash />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div style={{ padding: '24px' }}>
                    <div className="dropzone">
                      <input type="file" onChange={handleFileUpload} disabled={isUploading} />
                      <div className="dropzone-icon">
                        <Icons.UploadCloud />
                      </div>
                      <div className="dropzone-main">Choose a file to chunk and distribute</div>
                      <div className="dropzone-sub">
                        File will be divided into 1 MiB segments, checksummed (SHA-256),
                        and mirrored across nodes
                      </div>
                    </div>

                    {isUploading && (
                      <div className="transfer-card" style={{ marginTop: '16px' }}>
                        <div className="transfer-info">
                          <span>Uploading &amp; Chunking Data…</span>
                          <span className="transfer-pct">{uploadProgress}%</span>
                        </div>
                        <div className="transfer-bar-track">
                          <div
                            className="transfer-bar-fill"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {lastTransferStats && (
                      <div className="transfer-card" style={{ marginTop: '16px' }}>
                        <div className="transfer-info">
                          <span>Transfer Analysis</span>
                          <span className="transfer-pct">Complete</span>
                        </div>
                        <div className="transfer-meta-grid">
                          <div className="transfer-meta-item">
                            <p>Throughput</p>
                            <p>{lastTransferStats.speed} MB/s</p>
                          </div>
                          <div className="transfer-meta-item">
                            <p>Elapsed Time</p>
                            <p>{lastTransferStats.duration}s</p>
                          </div>
                          <div className="transfer-meta-item">
                            <p>Segment Count</p>
                            <p>{lastTransferStats.chunks} chunks</p>
                          </div>
                          <div className="transfer-meta-item">
                            <p>Redundancy</p>
                            <p>{lastTransferStats.rf}x Replicas</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Sidebar Card (shown when files tab active) */}
              {activeTab === 'files' && (
                <div className="upload-card">
                  <div className="upload-card-title">Quick Upload</div>
                  <div className="dropzone">
                    <input type="file" onChange={handleFileUpload} disabled={isUploading} />
                    <div className="dropzone-icon">
                      <Icons.UploadCloud />
                    </div>
                    <div className="dropzone-main">Drop a file here</div>
                    <div className="dropzone-sub">
                      Chunks &amp; distributes across all nodes
                    </div>
                  </div>

                  {isUploading && (
                    <div className="transfer-card">
                      <div className="transfer-info">
                        <span>Uploading…</span>
                        <span className="transfer-pct">{uploadProgress}%</span>
                      </div>
                      <div className="transfer-bar-track">
                        <div
                          className="transfer-bar-fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {lastTransferStats && !isUploading && (
                    <div className="transfer-card">
                      <div className="transfer-info">
                        <span style={{ fontSize: '12px' }}>Last transfer</span>
                        <span className="transfer-pct">Done</span>
                      </div>
                      <div className="transfer-meta-grid">
                        <div className="transfer-meta-item">
                          <p>Speed</p>
                          <p>{lastTransferStats.speed} MB/s</p>
                        </div>
                        <div className="transfer-meta-item">
                          <p>Chunks</p>
                          <p>{lastTransferStats.chunks}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload tab: full-width, no sidebar card needed (content-grid handles it) */}
              {activeTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="replication-banner">
                    <div className="replication-banner-icon">
                      <Icons.ShieldCheck />
                    </div>
                    <div className="replication-banner-title">Automatic Replication</div>
                    <div className="replication-banner-desc">
                      Every chunk is replicated to {stats?.replication_factor ?? '—'} nodes automatically.
                      SHA-256 integrity is verified at each step.
                    </div>
                  </div>

                  <div className="replication-banner" style={{ background: 'var(--success-bg)', borderColor: 'rgba(23,178,106,0.15)' }}>
                    <div className="replication-banner-icon" style={{ background: 'var(--success)' }}>
                      <Icons.Layers />
                    </div>
                    <div className="replication-banner-title">Cluster Status</div>
                    <div className="replication-banner-desc">
                      {stats?.online_nodes ?? 0}/{stats?.total_nodes ?? 0} nodes online ·{' '}
                      {stats?.total_chunks ?? 0} chunks distributed
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>

        {/* ══════════════════════════════════════
            RIGHT PANEL
        ══════════════════════════════════════ */}
        <aside className="right-panel">

          {/* Node Storage Bar Chart */}
          <div>
            <div className="panel-section-title">Node Storage</div>
            {nodes.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                No nodes connected.
              </div>
            ) : (
              <div className="bar-chart">
                {nodes.map((n, idx) => {
                  const used = n.capacity - n.free_space;
                  const pct = n.capacity > 0
                    ? Math.min(100, Math.round((used / n.capacity) * 100))
                    : 0;
                  const fillClass = getBarFillClass(n.node_id, idx);
                  return (
                    <div key={n.node_id} className="bar-chart-row">
                      <div className="bar-chart-label">
                        <span className="bar-chart-node">{n.node_id}</span>
                        <span className="bar-chart-val">{formatBytes(used)}</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${fillClass}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chunk Distribution */}
          {nodes.length > 0 && (
            <div>
              <div className="panel-section-title">Chunk Distribution</div>
              <div className="bar-chart">
                {nodes.map((n, idx) => {
                  const chunks = n.chunk_count || 0;
                  const pct = maxChunks > 0 ? Math.round((chunks / maxChunks) * 100) : 0;
                  const fillClass = getBarFillClass(n.node_id, idx);
                  return (
                    <div key={n.node_id} className="bar-chart-row">
                      <div className="bar-chart-label">
                        <span className="bar-chart-node">{n.node_id}</span>
                        <span className="bar-chart-val">{chunks} chunks</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${fillClass}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cluster Health */}
          <div>
            <div className="panel-section-title">Cluster Health</div>
            {nodes.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                No nodes to show.
              </div>
            ) : (
              <div className="health-list">
                {nodes.map(n => {
                  const isOnline = n.status === 'online';
                  return (
                    <div key={n.node_id} className="health-row">
                      <span className={`health-dot ${isOnline ? 'health-dot-online' : 'health-dot-offline'}`} />
                      <span className="health-name">{n.node_id}</span>
                      <span className={`health-status ${isOnline ? 'health-status-online' : 'health-status-offline'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Replication Info */}
          <div className="replication-banner">
            <div className="replication-banner-icon">
              <Icons.ShieldCheck />
            </div>
            <div className="replication-banner-title">Replication Active</div>
            <div className="replication-banner-desc">
              {stats?.replication_factor ?? '—'}× redundancy · SHA-256 verified · 1 MiB chunks · fault-tolerant
            </div>
          </div>

        </aside>

      </div>

      {/* ── Chunk Distribution Modal ── */}
      {selectedFileId && fileDetails && (
        <div className="modal-backdrop" onClick={() => setSelectedFileId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <h2>{fileDetails.filename}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Chunk &amp; Node Placement Topology
                </p>
              </div>
              <button className="close-btn" onClick={() => setSelectedFileId(null)}>✕</button>
            </div>

            <div className="modal-meta-row">
              <span className="modal-meta-label">Full SHA-256</span>
              <span className="modal-meta-value font-mono">{shortHash(fileDetails.checksum, 24)}</span>
            </div>
            <div className="modal-meta-row">
              <span className="modal-meta-label">Total Size</span>
              <span className="modal-meta-value">{formatBytes(fileDetails.size)} ({fileDetails.chunk_count} chunks)</span>
            </div>

            <div className="modal-section-label">Replicated Chunk Mappings</div>

            <div>
              {fileDetails.chunks?.map(c => (
                <div key={c.chunk_id} className="chunk-row">
                  <div>
                    <span className="chunk-tag">Chunk {c.chunk_index}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatBytes(c.size)}</span>
                  </div>
                  <div>
                    {c.nodes?.split(',').map(nid => (
                      <span key={nid} className="node-badge badge-online" style={{ marginLeft: '4px' }}>
                        {nid}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Shelf ── */}
      <div className="toast-shelf">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
