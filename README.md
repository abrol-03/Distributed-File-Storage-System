# Distributed File Storage System
## Computer Networks Lab (24B15CS313) — PBL Project
### Jaypee Institute of Information Technology, Noida

---

## 📌 Project Overview

A fully functional **Distributed File Storage System** that demonstrates core Computer Networks concepts:

- **TCP/IP** communication via HTTP (FastAPI)
- **Socket Programming** (underlying HTTP transport)
- **Client-Server Architecture** (Coordinator + 3 Storage Nodes)
- **File Chunking** — 1 MiB fixed-size chunks
- **Data Replication** — 2 copies of every chunk across different nodes
- **SHA-256 Integrity Verification** — per-chunk and full-file checksums
- **Heartbeat Monitoring** — periodic node health checks every 10 seconds
- **Failure Recovery** — automatic fallback to replica when a node is offline
- **Performance Metrics** — upload/download throughput, reconstruction time

---

## 🏗️ System Architecture

```
Client (React Web Browser)
         │
         │ HTTP (upload / download)
         ▼
┌─────────────────────────────────────┐
│  Coordinator / Metadata Server      │  Port 8000
│  FastAPI + SQLite                   │
│  - File & chunk metadata            │
│  - Round-robin chunk placement      │
│  - Heartbeat monitor (async)        │
│  - Failure recovery logic           │
└──────┬──────────┬────────┬──────────┘
       │          │        │   HTTP chunk transfer
       ▼          ▼        ▼
  Node A       Node B    Node C
  Port 8001  Port 8002  Port 8003
  FastAPI    FastAPI    FastAPI
  Stores     Stores     Stores
  chunks     chunks     chunks
```

**Upload flow:**
1. Client POSTs file to `/upload`
2. Coordinator splits file into 1 MiB chunks
3. Chunks distributed using **round-robin** across online nodes
4. Each chunk replicated on **2 different nodes**
5. SHA-256 verified at each node; metadata committed to SQLite
6. Client receives `file_id`, checksum, chunk count

**Download flow:**
1. Client requests `/download/{file_id}`
2. Coordinator fetches chunk metadata from SQLite
3. Each chunk retrieved from primary node (or replica if primary offline)
4. SHA-256 verified per chunk
5. Chunks assembled in order → file streamed back
6. Final SHA-256 verified against stored file checksum

---

## 🗂️ Project Structure

```
distributed-file-storage/
├── coordinator/
│   ├── main.py              ← FastAPI coordinator server
│   ├── requirements.txt
│   └── Dockerfile
├── storage_node/
│   ├── main.py              ← FastAPI storage node (3 instances)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js           ← Main React component
│   │   ├── api.js           ← API client functions
│   │   ├── index.js
│   │   └── index.css        ← Dark-theme UI styles
│   ├── public/index.html
│   ├── package.json
│   └── Dockerfile
├── scripts/
│   ├── run_local.py         ← Start everything locally (no Docker)
│   └── test_system.py       ← Automated end-to-end test suite
├── docker-compose.yml       ← One-command full deployment
└── README.md
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Programming Language | Python 3.11 |
| Backend Framework | FastAPI + Uvicorn |
| Frontend | React 18 + vanilla CSS |
| Networking | TCP/IP, HTTP, Socket Programming |
| Database | SQLite (metadata.db) |
| Data Integrity | SHA-256 (hashlib) |
| Containerization | Docker + Docker Compose |
| Network Analysis | Wireshark (see section below) |
| File Handling | Python `io`, `pathlib` |

---

## 🚀 Running the Project

### Option 1 — Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Services started:
#   Coordinator   → http://localhost:8000
#   API Docs      → http://localhost:8000/docs
#   Storage Node A → http://localhost:8001
#   Storage Node B → http://localhost:8002
#   Storage Node C → http://localhost:8003
#   Frontend      → http://localhost:3000
```

### Option 2 — Local (no Docker)

**Prerequisites:** Python 3.9+, Node.js 18+

```bash
# Install Python deps
pip install -r coordinator/requirements.txt
pip install -r storage_node/requirements.txt

# Start everything with one script
python scripts/run_local.py

# In a separate terminal — start the React frontend
cd frontend
npm install
npm start
```

---

## 🧪 Running Tests

```bash
# Start services first (Option 1 or 2 above)
# Then run the test suite:
python scripts/test_system.py
```

Tests cover:
- Coordinator and node health checks
- Small file upload (single chunk)
- Large file upload (multi-chunk, >1 MiB)
- File listing verification
- Download + SHA-256 integrity check
- Chunk distribution across ≥2 nodes
- Node failure recovery (manual demo step)
- Checksum verification logic
- File deletion

---

## 🔬 Wireshark Analysis

To capture traffic between coordinator and storage nodes:

```bash
# Capture on loopback (all DFS ports)
# Windows: capture on "Loopback Adapter" or use NPcap
wireshark -i lo -f "tcp port 8000 or tcp port 8001 or tcp port 8002 or tcp port 8003"

# Useful display filters in Wireshark:
# http                          → all HTTP frames
# tcp.port == 8001              → Node A traffic
# http.request.method == "POST" → chunk uploads
# http.request.method == "GET"  → chunk downloads
# http && ip.addr == 127.0.0.1  → all local DFS traffic
```

**What to observe:**
- TCP 3-way handshake before each chunk transfer
- HTTP POST to `/chunks/{chunk_id}` during upload
- HTTP GET to `/chunks/{chunk_id}` during download
- Heartbeat POSTs every 10 seconds to `/nodes/heartbeat`
- TCP FIN/RST when a node goes offline

---

## 📊 Performance Metrics

| Metric | Description |
|--------|-------------|
| Upload throughput | MB/s — displayed in UI after each upload |
| Download throughput | MB/s — measured during reconstruction |
| Chunk count | Files ≥ 1 MiB split into multiple chunks |
| Replication overhead | 2× storage per chunk (replication factor = 2) |
| Heartbeat interval | 10 seconds |
| Node failure detection | ≤ 30 seconds (configurable via NODE_TIMEOUT) |
| Checksum pass rate | 100% under normal conditions |

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CHUNK_SIZE_BYTES` | 1 MiB | Size of each file chunk |
| `REPLICATION_FACTOR` | 2 | Copies of each chunk |
| `HEARTBEAT_INTERVAL` | 10 s | Node ping interval |
| `NODE_TIMEOUT` | 30 s | Time before marking node offline |
| `NODE_PORT` | 8001-8003 | Storage node port (env var) |
| `COORDINATOR_URL` | localhost:8000 | Coordinator address (env var) |

---

## 🎓 CN Concepts Demonstrated

| Concept | Implementation |
|---------|---------------|
| **TCP/IP** | HTTP over TCP — all chunk transfers use TCP |
| **Socket Programming** | FastAPI/Uvicorn uses Python sockets internally |
| **Client-Server Model** | Coordinator = server, Nodes & Browser = clients |
| **Data Transfer** | Large files transferred as ordered chunks |
| **Replication** | Each chunk stored on 2 different nodes |
| **Error Detection** | SHA-256 checksums catch corruption/incomplete transfers |
| **Heartbeat** | Nodes send `/nodes/heartbeat` every 10s |
| **Failure Recovery** | Download falls back to replica if primary offline |
| **IP Addressing** | Each node has unique host:port (IP equivalent) |
| **Distributed Systems** | Coordinator tracks global state across 3 nodes |

---

## 📋 Viva Preparation

**Q: What is a distributed system?**
A: A system where computation and data are spread across multiple independent components (nodes) that communicate over a network.

**Q: Why use chunks instead of one large file?**
A: Chunks allow parallel storage across multiple nodes, enable replication without duplicating the full file on one node, and allow recovery of individual missing pieces rather than the entire file.

**Q: What is the role of the metadata server?**
A: The coordinator stores file IDs, chunk indexes, sizes, checksums and node locations. Without it, nodes have no way to know which chunks belong to which file.

**Q: What is replication factor?**
A: The number of copies stored for each chunk. We use RF=2, so each chunk is on 2 different nodes.

**Q: How do you know a downloaded chunk is correct?**
A: We compute SHA-256 of the chunk at upload time, store it in SQLite, and recompute SHA-256 at download time. If they differ, the chunk is rejected.

**Q: What is a heartbeat?**
A: A periodic message (every 10 seconds) sent from each storage node to the coordinator at `/nodes/heartbeat`. If a node misses heartbeats for >30 seconds, it is marked offline.

**Q: What happens if all replicas fail?**
A: The download fails with a 503 error. This is an expected limitation — data is only recoverable if at least one replica is online.

---

## 👨‍💻 Team

Submitted to: **Dr. Mukta Goyal**
Course: **Computer Networks Lab (24B15CS313)**
Institution: **Jaypee Institute of Information Technology, Noida**
Session: **ODD 2026**
