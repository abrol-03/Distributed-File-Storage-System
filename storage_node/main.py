"""
Storage Node — Distributed File Storage System
Jaypee Institute of Information Technology, Noida
Computer Networks Lab (24B15CS313)

Each storage node:
  - Registers with the coordinator on startup
  - Accepts chunk uploads (PUT /chunks/{chunk_id})
  - Returns chunk bytes on download (GET /chunks/{chunk_id})
  - Sends periodic heartbeats to coordinator
  - Reports health (disk free space, chunk count)
"""

import asyncio
import hashlib
import logging
import os
import shutil
import time
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# ─────────────────────────────────────────────
# Configuration  (overridden by environment variables)
# ─────────────────────────────────────────────
NODE_ID = os.environ.get("NODE_ID", "node_a")
NODE_PORT = int(os.environ.get("NODE_PORT", "8001"))
NODE_HOST = os.environ.get("NODE_HOST", "0.0.0.0")
NODE_PUBLIC_URL = os.environ.get("NODE_PUBLIC_URL", f"http://localhost:{NODE_PORT}")
COORDINATOR_URL = os.environ.get("COORDINATOR_URL", "http://localhost:8000")
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", f"./data/{NODE_ID}"))
HEARTBEAT_INTERVAL = int(os.environ.get("HEARTBEAT_INTERVAL", "10"))

logging.basicConfig(
    level=logging.INFO,
    format=f"%(asctime)s [{NODE_ID.upper()}] %(levelname)s %(message)s",
)
logger = logging.getLogger(NODE_ID)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def get_free_space() -> int:
    usage = shutil.disk_usage(str(STORAGE_DIR))
    return usage.free


def get_chunk_count() -> int:
    return sum(1 for f in STORAGE_DIR.iterdir() if f.is_file())


# ─────────────────────────────────────────────
# Background: register + heartbeat loop
# ─────────────────────────────────────────────
async def registration_and_heartbeat():
    """Register with coordinator and then send periodic heartbeats."""
    await asyncio.sleep(2)   # small delay to let FastAPI start
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Registration loop — retry until coordinator is reachable
        while True:
            try:
                resp = await client.post(
                    f"{COORDINATOR_URL}/nodes/register",
                    json={
                        "node_id": NODE_ID,
                        "url": NODE_PUBLIC_URL,
                        "capacity": get_free_space(),
                    },
                )
                resp.raise_for_status()
                logger.info("Registered with coordinator at %s", COORDINATOR_URL)
                break
            except Exception as e:
                logger.warning("Registration failed (%s) — retrying in 5s", e)
                await asyncio.sleep(5)

        # Heartbeat loop
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            try:
                await client.post(
                    f"{COORDINATOR_URL}/nodes/heartbeat",
                    json={
                        "node_id": NODE_ID,
                        "free_space": get_free_space(),
                        "chunk_count": get_chunk_count(),
                    },
                )
            except Exception as e:
                logger.warning("Heartbeat failed: %s", e)


# ─────────────────────────────────────────────
# App lifespan
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Storage directory: %s", STORAGE_DIR.resolve())
    task = asyncio.create_task(registration_and_heartbeat())
    yield
    task.cancel()


app = FastAPI(
    title=f"Storage Node — {NODE_ID}",
    description="Storage node for the Distributed File Storage System",
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
# Chunk endpoints
# ─────────────────────────────────────────────
@app.post("/chunks/{chunk_id}", tags=["chunks"])
async def store_chunk(chunk_id: str, request: Request):
    """Receive and persist a chunk from the coordinator."""
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="Empty chunk body")

    # Optional integrity check using header sent by coordinator
    expected = request.headers.get("X-Checksum")
    actual = sha256_bytes(data)
    if expected and actual != expected:
        raise HTTPException(status_code=400, detail="Checksum mismatch on store")

    chunk_path = STORAGE_DIR / chunk_id
    chunk_path.write_bytes(data)
    logger.info("Stored chunk %s (%d bytes)", chunk_id, len(data))
    return {"chunk_id": chunk_id, "size": len(data), "checksum": actual}


@app.get("/chunks/{chunk_id}", tags=["chunks"])
async def get_chunk(chunk_id: str):
    """Return chunk bytes to the coordinator for file reconstruction."""
    chunk_path = STORAGE_DIR / chunk_id
    if not chunk_path.exists():
        raise HTTPException(status_code=404, detail=f"Chunk {chunk_id} not found")
    data = chunk_path.read_bytes()
    checksum = sha256_bytes(data)
    logger.info("Served chunk %s (%d bytes)", chunk_id, len(data))
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"X-Checksum": checksum},
    )


@app.delete("/chunks/{chunk_id}", tags=["chunks"])
async def delete_chunk(chunk_id: str):
    """Delete a chunk (called by coordinator on file delete)."""
    chunk_path = STORAGE_DIR / chunk_id
    if chunk_path.exists():
        chunk_path.unlink()
        logger.info("Deleted chunk %s", chunk_id)
    return {"message": "deleted", "chunk_id": chunk_id}


@app.get("/chunks", tags=["chunks"])
async def list_chunks():
    """List all chunk IDs stored on this node."""
    chunks = [f.name for f in STORAGE_DIR.iterdir() if f.is_file()]
    return {"node_id": NODE_ID, "chunks": chunks, "count": len(chunks)}


# ─────────────────────────────────────────────
# Health endpoint
# ─────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {
        "status": "online",
        "node_id": NODE_ID,
        "free_space": get_free_space(),
        "chunk_count": get_chunk_count(),
        "storage_dir": str(STORAGE_DIR.resolve()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=NODE_HOST, port=NODE_PORT, reload=False)
