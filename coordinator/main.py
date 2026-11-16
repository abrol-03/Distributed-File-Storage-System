"""
Coordinator / Metadata Server — Distributed File Storage System
Jaypee Institute of Information Technology, Noida
Computer Networks Lab (24B15CS313)

Responsibilities:
  - Node registration & heartbeat monitoring
  - File upload coordination (chunking + round-robin placement)
  - SHA-256 checksum management
  - Download plan generation with replica fallback
  - Metadata persistence in SQLite
  - REST API (FastAPI / HTTP) for client and storage nodes
"""

import asyncio
import hashlib
import json
import logging
import os
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
CHUNK_SIZE_BYTES = 1 * 1024 * 1024          # 1 MiB per chunk
REPLICATION_FACTOR = 2                       # copies of each chunk
HEARTBEAT_INTERVAL = 10                      # seconds between health checks
NODE_TIMEOUT = 30                            # seconds before marking node dead
DB_PATH = os.path.join(os.path.dirname(__file__), "metadata.db")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [COORDINATOR] %(levelname)s %(message)s",
)
logger = logging.getLogger("coordinator")


# ─────────────────────────────────────────────
# In-memory node registry  {node_id -> info}
# ─────────────────────────────────────────────
nodes: Dict[str, dict] = {}


# ─────────────────────────────────────────────
# Database helpers
# ─────────────────────────────────────────────
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS files (
            file_id     TEXT PRIMARY KEY,
            filename    TEXT NOT NULL,
            size        INTEGER NOT NULL,
            checksum    TEXT NOT NULL,
            chunk_count INTEGER NOT NULL,
            uploaded_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chunks (
            chunk_id    TEXT PRIMARY KEY,
            file_id     TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            size        INTEGER NOT NULL,
            checksum    TEXT NOT NULL,
            FOREIGN KEY (file_id) REFERENCES files(file_id)
        );

        CREATE TABLE IF NOT EXISTS chunk_locations (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            chunk_id TEXT NOT NULL,
            node_id  TEXT NOT NULL,
            is_primary INTEGER DEFAULT 1,
            FOREIGN KEY (chunk_id) REFERENCES chunks(chunk_id)
        );
    """)
    conn.commit()
    conn.close()
    logger.info("Database initialised at %s", DB_PATH)


# ─────────────────────────────────────────────
# Background heartbeat monitor
# ─────────────────────────────────────────────
async def heartbeat_monitor():
    """Pings each registered node every HEARTBEAT_INTERVAL seconds."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            for node_id, info in list(nodes.items()):
                url = f"{info['url']}/health"
                try:
                    r = await client.get(url)
                    if r.status_code == 200:
                        nodes[node_id]["status"] = "online"
                        nodes[node_id]["last_seen"] = time.time()
                        nodes[node_id]["free_space"] = r.json().get("free_space", 0)
                    else:
                        nodes[node_id]["status"] = "degraded"
                except Exception:
                    elapsed = time.time() - nodes[node_id].get("last_seen", 0)
                    if elapsed > NODE_TIMEOUT:
                        nodes[node_id]["status"] = "offline"
                    logger.warning("Heartbeat failed for node %s", node_id)


# ─────────────────────────────────────────────
# App lifespan
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task = asyncio.create_task(heartbeat_monitor())
    logger.info("Coordinator started — heartbeat monitor running")
    yield
    task.cancel()


app = FastAPI(
    title="DFS Coordinator",
    description="Central metadata server for the Distributed File Storage System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────
class NodeRegistration(BaseModel):
    node_id: str
    url: str
    capacity: int = 10 * 1024 * 1024 * 1024   # 10 GiB default


class HeartbeatPayload(BaseModel):
    node_id: str
    free_space: int = 0
    chunk_count: int = 0


# ─────────────────────────────────────────────
# Node management endpoints
# ─────────────────────────────────────────────
@app.post("/nodes/register", tags=["nodes"])
async def register_node(payload: NodeRegistration):
    """Storage node calls this on startup to announce itself."""
    nodes[payload.node_id] = {
        "url": payload.url,
        "capacity": payload.capacity,
        "status": "online",
        "last_seen": time.time(),
        "free_space": payload.capacity,
    }
    logger.info("Node registered: %s @ %s", payload.node_id, payload.url)
    return {"message": "registered", "node_id": payload.node_id}


@app.post("/nodes/heartbeat", tags=["nodes"])
async def heartbeat(payload: HeartbeatPayload):
    """Storage node sends periodic heartbeat."""
    if payload.node_id not in nodes:
        raise HTTPException(status_code=404, detail="Node not registered")
    nodes[payload.node_id]["status"] = "online"
    nodes[payload.node_id]["last_seen"] = time.time()
    nodes[payload.node_id]["free_space"] = payload.free_space
    return {"message": "ok"}


@app.get("/nodes", tags=["nodes"])
async def list_nodes():
    """Return current status of all registered nodes."""
    result = []
    for nid, info in nodes.items():
        result.append({
            "node_id": nid,
            "url": info["url"],
            "status": info["status"],
            "last_seen": info["last_seen"],
            "free_space": info.get("free_space", 0),
            "capacity": info.get("capacity", 0),
        })
    return result


# ─────────────────────────────────────────────
# Helper: pick nodes via round-robin with replication
# ─────────────────────────────────────────────
_rr_counter = 0

def pick_nodes(n: int) -> List[str]:
    """Pick n distinct online nodes (round-robin)."""
    global _rr_counter
    online = [nid for nid, info in nodes.items() if info["status"] == "online"]
    if len(online) < n:
        raise HTTPException(
            status_code=503,
            detail=f"Need {n} online nodes but only {len(online)} available",
        )
    chosen = []
    for _ in range(n):
        chosen.append(online[_rr_counter % len(online)])
        _rr_counter += 1
    # deduplicate while maintaining order
    seen = set()
    unique = []
    for nid in chosen:
        if nid not in seen:
            seen.add(nid)
            unique.append(nid)
    # if we de-duped to fewer than needed, fill from remaining
    for nid in online:
        if len(unique) >= n:
            break
        if nid not in seen:
            unique.append(nid)
            seen.add(nid)
    return unique[:n]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ─────────────────────────────────────────────
# Upload endpoint
# ─────────────────────────────────────────────
@app.post("/upload", tags=["files"])
async def upload_file(file: UploadFile = File(...)):
    """
    1. Read file, compute overall checksum
    2. Split into 1 MiB chunks
    3. Push each chunk to REPLICATION_FACTOR nodes
    4. Commit metadata to SQLite
    """
    if not nodes:
        raise HTTPException(status_code=503, detail="No storage nodes registered")

    file_data = await file.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Empty file")

    file_id = str(uuid.uuid4())
    file_checksum = sha256_bytes(file_data)
    filename = file.filename or "unknown"

    # Split into chunks
    chunks_data = [
        file_data[i: i + CHUNK_SIZE_BYTES]
        for i in range(0, len(file_data), CHUNK_SIZE_BYTES)
    ]
    chunk_count = len(chunks_data)
    logger.info("Uploading '%s' (%d bytes, %d chunks)", filename, len(file_data), chunk_count)

    db_conn = get_db()
    try:
        # Persist file record
        db_conn.execute(
            "INSERT INTO files VALUES (?,?,?,?,?,?)",
            (file_id, filename, len(file_data), file_checksum, chunk_count, time.time()),
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            for idx, chunk_data in enumerate(chunks_data):
                chunk_id = f"{file_id}_c{idx}"
                chunk_checksum = sha256_bytes(chunk_data)

                # Choose replication nodes
                rf = min(REPLICATION_FACTOR, len(nodes))
                target_nodes = pick_nodes(rf)

                # Push chunk to each target node
                for node_id in target_nodes:
                    node_url = nodes[node_id]["url"]
                    try:
                        resp = await client.post(
                            f"{node_url}/chunks/{chunk_id}",
                            content=chunk_data,
                            headers={"X-Checksum": chunk_checksum},
                        )
                        resp.raise_for_status()
                    except Exception as e:
                        logger.error("Failed to store chunk %s on node %s: %s", chunk_id, node_id, e)
                        raise HTTPException(
                            status_code=502,
                            detail=f"Failed to store chunk {idx} on node {node_id}",
                        )

                # Persist chunk + locations
                db_conn.execute(
                    "INSERT INTO chunks VALUES (?,?,?,?,?)",
                    (chunk_id, file_id, idx, len(chunk_data), chunk_checksum),
                )
                for i, node_id in enumerate(target_nodes):
                    db_conn.execute(
                        "INSERT INTO chunk_locations (chunk_id, node_id, is_primary) VALUES (?,?,?)",
                        (chunk_id, node_id, 1 if i == 0 else 0),
                    )

        db_conn.commit()
        logger.info("Upload complete: file_id=%s", file_id)
        return {
            "file_id": file_id,
            "filename": filename,
            "size": len(file_data),
            "checksum": file_checksum,
            "chunk_count": chunk_count,
            "replication_factor": rf,
        }
    except HTTPException:
        db_conn.rollback()
        raise
    except Exception as e:
        db_conn.rollback()
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_conn.close()


# ─────────────────────────────────────────────
# Download endpoint
# ─────────────────────────────────────────────
@app.get("/download/{file_id}", tags=["files"])
async def download_file(file_id: str):
    """
    1. Fetch metadata from DB
    2. For each chunk, try primary node first, then replicas
    3. Verify SHA-256 of each chunk and assembled file
    4. Stream reconstructed file back
    """
    db_conn = get_db()
    try:
        file_row = db_conn.execute(
            "SELECT * FROM files WHERE file_id = ?", (file_id,)
        ).fetchone()
        if not file_row:
            raise HTTPException(status_code=404, detail="File not found")

        chunks = db_conn.execute(
            "SELECT * FROM chunks WHERE file_id = ? ORDER BY chunk_index",
            (file_id,),
        ).fetchall()

        chunk_locations = {}
        for row in db_conn.execute(
            """SELECT cl.chunk_id, cl.node_id, cl.is_primary
               FROM chunk_locations cl
               JOIN chunks c ON c.chunk_id = cl.chunk_id
               WHERE c.file_id = ?
               ORDER BY cl.is_primary DESC""",
            (file_id,),
        ).fetchall():
            chunk_locations.setdefault(row["chunk_id"], []).append(row["node_id"])

    finally:
        db_conn.close()

    logger.info("Download requested: file_id=%s (%s)", file_id, file_row["filename"])

    async def stream_file():
        assembled = b""
        async with httpx.AsyncClient(timeout=30.0) as client:
            for chunk in chunks:
                cid = chunk["chunk_id"]
                expected_checksum = chunk["checksum"]
                node_list = chunk_locations.get(cid, [])

                chunk_data = None
                for node_id in node_list:
                    if nodes.get(node_id, {}).get("status") != "online":
                        logger.warning("Node %s offline, trying next replica for chunk %s", node_id, cid)
                        continue
                    try:
                        resp = await client.get(f"{nodes[node_id]['url']}/chunks/{cid}")
                        resp.raise_for_status()
                        data = resp.content
                        actual_checksum = sha256_bytes(data)
                        if actual_checksum != expected_checksum:
                            logger.error("Checksum mismatch for chunk %s on node %s", cid, node_id)
                            continue
                        chunk_data = data
                        break
                    except Exception as e:
                        logger.warning("Failed to fetch chunk %s from %s: %s", cid, node_id, e)

                if chunk_data is None:
                    raise HTTPException(
                        status_code=503,
                        detail=f"Chunk {chunk['chunk_index']} unavailable on all nodes",
                    )
                assembled += chunk_data

        # Verify complete file checksum
        actual_file_checksum = sha256_bytes(assembled)
        if actual_file_checksum != file_row["checksum"]:
            raise HTTPException(status_code=500, detail="File integrity check failed")

        yield assembled

    return StreamingResponse(
        stream_file(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{file_row["filename"]}"'},
    )


# ─────────────────────────────────────────────
# File listing & metadata
# ─────────────────────────────────────────────
@app.get("/files", tags=["files"])
async def list_files():
    db_conn = get_db()
    try:
        rows = db_conn.execute(
            "SELECT file_id, filename, size, checksum, chunk_count, uploaded_at FROM files ORDER BY uploaded_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db_conn.close()


@app.get("/files/{file_id}", tags=["files"])
async def file_info(file_id: str):
    db_conn = get_db()
    try:
        file_row = db_conn.execute(
            "SELECT * FROM files WHERE file_id = ?", (file_id,)
        ).fetchone()
        if not file_row:
            raise HTTPException(status_code=404, detail="File not found")

        chunks = db_conn.execute(
            "SELECT c.*, GROUP_CONCAT(cl.node_id) AS nodes FROM chunks c "
            "LEFT JOIN chunk_locations cl ON cl.chunk_id = c.chunk_id "
            "WHERE c.file_id = ? GROUP BY c.chunk_id ORDER BY c.chunk_index",
            (file_id,),
        ).fetchall()

        return {
            **dict(file_row),
            "chunks": [dict(c) for c in chunks],
        }
    finally:
        db_conn.close()


@app.delete("/files/{file_id}", tags=["files"])
async def delete_file(file_id: str):
    db_conn = get_db()
    try:
        file_row = db_conn.execute(
            "SELECT * FROM files WHERE file_id = ?", (file_id,)
        ).fetchone()
        if not file_row:
            raise HTTPException(status_code=404, detail="File not found")

        # Get all chunk locations to delete from nodes
        locations = db_conn.execute(
            "SELECT cl.chunk_id, cl.node_id FROM chunk_locations cl "
            "JOIN chunks c ON c.chunk_id = cl.chunk_id WHERE c.file_id = ?",
            (file_id,)
        ).fetchall()

        async with httpx.AsyncClient(timeout=10.0) as client:
            for loc in locations:
                node_id = loc["node_id"]
                if nodes.get(node_id, {}).get("status") == "online":
                    try:
                        await client.delete(f"{nodes[node_id]['url']}/chunks/{loc['chunk_id']}")
                    except Exception:
                        pass

        db_conn.execute("DELETE FROM chunk_locations WHERE chunk_id IN "
                        "(SELECT chunk_id FROM chunks WHERE file_id = ?)", (file_id,))
        db_conn.execute("DELETE FROM chunks WHERE file_id = ?", (file_id,))
        db_conn.execute("DELETE FROM files WHERE file_id = ?", (file_id,))
        db_conn.commit()
        return {"message": "deleted", "file_id": file_id}
    finally:
        db_conn.close()


# ─────────────────────────────────────────────
# Health & stats
# ─────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "online", "component": "coordinator"}


@app.get("/stats", tags=["system"])
async def stats():
    db_conn = get_db()
    try:
        file_count = db_conn.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        chunk_count = db_conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
        total_size = db_conn.execute("SELECT SUM(size) FROM files").fetchone()[0] or 0
        online_nodes = sum(1 for n in nodes.values() if n["status"] == "online")
        return {
            "total_files": file_count,
            "total_chunks": chunk_count,
            "total_size_bytes": total_size,
            "online_nodes": online_nodes,
            "total_nodes": len(nodes),
            "replication_factor": REPLICATION_FACTOR,
            "chunk_size_bytes": CHUNK_SIZE_BYTES,
        }
    finally:
        db_conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
