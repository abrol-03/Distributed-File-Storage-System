import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchStats, fetchNodes, fetchFiles, fetchFileInfo,
  uploadFile, downloadFile, deleteFile
} from './api';

// ── Minimalist Clean SVG Icons ────────────────────────
const Icons = {
  Server: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
      <line x1="6" x2="6.01" y1="6" y2="6"/>
      <line x1="6" x2="6.01" y1="18" y2="18"/>
    </svg>
  ),
  HardDrive: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" x2="2" y1="12" y2="12"/>
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
      <line x1="6" x2="6.01" y1="16" y2="16"/>
      <line x1="10" x2="10.01" y1="16" y2="16"/>
    </svg>
  ),
  UploadCloud: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 14.899 1.4-1.4A5.5 5.5 0 0 1 12 10a5 5 0 0 1 8.8 2.65A4.5 4.5 0 0 1 20 20H6a4 4 0 0 1-2-5.1Z"/>
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" x2="12" y1="12" y2="21"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  FileText: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  ),
  Layers: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  )
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

  return (
    <div className="app-container">
      {/* ── Top Bar ── */}
      <header className="nav-header">
        <div className="brand-section">
          <div className="brand-mark">
            <Icons.Server />
          </div>
          <div className="brand-text">
            <h1>Distributed Storage System</h1>
            <p>Computer Networks Laboratory · 24B15CS313</p>
          </div>
        </div>

        <div className="header-status-pill">
          <div className="pulse-dot" />
          <span>Coordinator Active :8000</span>
        </div>
      </header>

      {/* ── System Metrics ── */}
      <section className="metrics-row">
        <div className="metric-card">
          <div className="metric-header">
            <span>Registered Nodes</span>
            <Icons.HardDrive />
          </div>
          <div className="metric-val">{stats ? `${stats.online_nodes}/${stats.total_nodes}` : '—'}</div>
          <div className="metric-foot">Active storage daemons</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Stored Objects</span>
            <Icons.FileText />
          </div>
          <div className="metric-val">{stats?.total_files ?? '—'}</div>
          <div className="metric-foot">{stats ? formatBytes(stats.total_size_bytes) : '—'} logical data</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Distributed Chunks</span>
            <Icons.Layers />
          </div>
          <div className="metric-val">{stats?.total_chunks ?? '—'}</div>
          <div className="metric-foot">1 MiB fixed segment size</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Replication Factor</span>
            <Icons.ShieldCheck />
          </div>
          <div className="metric-val">{stats ? `${stats.replication_factor}x` : '—'}</div>
          <div className="metric-foot">Fault-tolerant mirror copies</div>
        </div>
      </section>

      {/* ── Storage Nodes Telemetry ── */}
      <section>
        <div className="section-title">
          <span>Active Storage Daemons</span>
          <button className="btn btn-secondary" onClick={loadData} title="Refresh telemetry">
            <Icons.Refresh /> Refresh
          </button>
        </div>

        <div className="nodes-grid">
          {nodes.length === 0 ? (
            <div className="empty-box" style={{ gridColumn: '1 / -1' }}>
              No storage nodes connected. Start daemon instances on ports 8001–8003.
            </div>
          ) : (
            nodes.map(n => {
              const used = n.capacity - n.free_space;
              const pct = n.capacity > 0 ? Math.min(100, Math.round((used / n.capacity) * 100)) : 0;
              const isOnline = n.status === 'online';

              return (
                <div key={n.node_id} className="node-card">
                  <div className="node-top">
                    <div className="node-identity">
                      <Icons.HardDrive />
                      <span className="node-name">{n.node_id}</span>
                    </div>
                    <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                      {n.status}
                    </span>
                  </div>

                  <div className="node-address">{n.url}</div>

                  <div>
                    <div className="storage-bar-label">
                      <span>Disk Allocation</span>
                      <span>{formatBytes(used)}</span>
                    </div>
                    <div className="storage-track">
                      <div className="storage-fill" style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Main Data & Upload Area ── */}
      <section className="panel">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <Icons.FileText /> Stored Files
            <span className="panel-tab-count">{files.length}</span>
          </button>
          <button
            className={`panel-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Icons.UploadCloud /> Distribute File
          </button>
        </div>

        <div className="panel-body">
          {activeTab === 'upload' && (
            <div>
              <div className="dropzone">
                <input type="file" onChange={handleFileUpload} disabled={isUploading} />
                <div className="dropzone-icon">
                  <Icons.UploadCloud />
                </div>
                <div className="dropzone-main">Choose a file to chunk and distribute</div>
                <div className="dropzone-sub">
                  File will be divided into 1 MiB segments, checksummed (SHA-256), and mirrored across nodes
                </div>
              </div>

              {isUploading && (
                <div className="transfer-card">
                  <div className="transfer-info">
                    <span>Uploading & Chunking Data…</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="transfer-bar-track">
                    <div className="transfer-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {lastTransferStats && (
                <div className="transfer-card">
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                    Transfer Analysis
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

          {activeTab === 'files' && (
            <div className="table-responsive">
              {files.length === 0 ? (
                <div className="empty-box">
                  No files currently stored. Switch to "Distribute File" to upload your first object.
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
                    {files.map(f => (
                      <tr key={f.file_id}>
                        <td>
                          <span className="file-title">{f.filename}</span>
                        </td>
                        <td>{formatBytes(f.size)}</td>
                        <td>
                          <span className="badge badge-online">{f.chunk_count}</span>
                        </td>
                        <td className="font-mono" title={f.checksum}>
                          {shortHash(f.checksum, 14)}
                        </td>
                        <td>{formatDate(f.uploaded_at)}</td>
                        <td>
                          <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setSelectedFileId(f.file_id)}
                              title="Inspect chunk layout"
                            >
                              <Icons.Info /> Details
                            </button>
                            <button
                              className="btn btn-download"
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
        </div>
      </section>

      {/* ── Chunk Distribution Modal ── */}
      {selectedFileId && fileDetails && (
        <div className="modal-backdrop" onClick={() => setSelectedFileId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <h2>{fileDetails.filename}</h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Chunk & Node Placement Topology
                </p>
              </div>
              <button className="close-btn" onClick={() => setSelectedFileId(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-dim)' }}>Full SHA-256</span>
                <span className="font-mono" style={{ color: 'var(--text-main)' }}>{shortHash(fileDetails.checksum, 24)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-dim)' }}>Total Size</span>
                <span>{formatBytes(fileDetails.size)} ({fileDetails.chunk_count} chunks)</span>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Replicated Chunk Mappings
            </div>

            <div>
              {fileDetails.chunks?.map(c => (
                <div key={c.chunk_id} className="chunk-row">
                  <div>
                    <span className="chunk-tag">Chunk {c.chunk_index}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatBytes(c.size)}</span>
                  </div>
                  <div>
                    {c.nodes?.split(',').map(nid => (
                      <span key={nid} className="badge badge-online" style={{ marginLeft: '0.35rem' }}>
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
