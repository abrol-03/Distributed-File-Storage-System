#!/usr/bin/env python3
"""
run_local.py — Start ALL components locally (no Docker required)
Jaypee Institute of Information Technology, Noida
Computer Networks Lab (24B15CS313)

Usage:
    python scripts/run_local.py

This script:
  1. Installs dependencies in a virtual environment (first run only)
  2. Starts the coordinator on port 8000
  3. Starts 3 storage nodes on ports 8001, 8002, 8003
  4. Opens the React dev server on port 3000

Press Ctrl+C to stop everything.
"""

import os
import sys
import subprocess
import time
import threading
import signal
import platform

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PYTHON = sys.executable
IS_WIN = platform.system() == "Windows"

procs = []

def kill_all(*_):
    print("\n\n🛑  Stopping all processes…")
    for p in procs:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, kill_all)
if hasattr(signal, "SIGTERM"):
    signal.signal(signal.SIGTERM, kill_all)


def install_deps(folder, label):
    req = os.path.join(BASE, folder, "requirements.txt")
    if not os.path.exists(req):
        return
    print(f"📦  Installing {label} dependencies…")
    subprocess.run([PYTHON, "-m", "pip", "install", "-q", "-r", req], check=True)


def run(cmd, cwd, env=None, label=""):
    merged_env = {**os.environ, **(env or {})}
    p = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=merged_env,
        shell=IS_WIN,
    )
    procs.append(p)
    print(f"✅  Started {label} (pid {p.pid})")
    return p


def stream_output(p, prefix):
    """Print prefixed output from a subprocess (unused — keeping it simple)."""
    pass


if __name__ == "__main__":
    print("=" * 60)
    print("  Distributed File Storage System — Local Runner")
    print("  JIIT CN Lab 24B15CS313")
    print("=" * 60)

    # Install backend deps
    install_deps("coordinator", "coordinator")
    install_deps("storage_node", "storage nodes")

    # 1. Coordinator
    run(
        [PYTHON, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=os.path.join(BASE, "coordinator"),
        label="Coordinator (port 8000)",
    )
    time.sleep(2)

    # 2. Storage Node A
    node_env_a = {
        "NODE_ID": "node_a",
        "NODE_PORT": "8001",
        "NODE_PUBLIC_URL": "http://localhost:8001",
        "COORDINATOR_URL": "http://localhost:8000",
        "STORAGE_DIR": os.path.join(BASE, "data", "node_a"),
    }
    run(
        [PYTHON, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"],
        cwd=os.path.join(BASE, "storage_node"),
        env=node_env_a,
        label="Storage Node A (port 8001)",
    )

    # 3. Storage Node B
    node_env_b = {
        "NODE_ID": "node_b",
        "NODE_PORT": "8002",
        "NODE_PUBLIC_URL": "http://localhost:8002",
        "COORDINATOR_URL": "http://localhost:8000",
        "STORAGE_DIR": os.path.join(BASE, "data", "node_b"),
    }
    run(
        [PYTHON, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"],
        cwd=os.path.join(BASE, "storage_node"),
        env=node_env_b,
        label="Storage Node B (port 8002)",
    )

    # 4. Storage Node C
    node_env_c = {
        "NODE_ID": "node_c",
        "NODE_PORT": "8003",
        "NODE_PUBLIC_URL": "http://localhost:8003",
        "COORDINATOR_URL": "http://localhost:8000",
        "STORAGE_DIR": os.path.join(BASE, "data", "node_c"),
    }
    run(
        [PYTHON, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"],
        cwd=os.path.join(BASE, "storage_node"),
        env=node_env_c,
        label="Storage Node C (port 8003)",
    )

    time.sleep(1)

    print("\n" + "=" * 60)
    print("  🎉  All backend services started!")
    print()
    print("  Coordinator API:  http://localhost:8000")
    print("  API Docs:         http://localhost:8000/docs")
    print("  Node A:           http://localhost:8001")
    print("  Node B:           http://localhost:8002")
    print("  Node C:           http://localhost:8003")
    print()
    print("  To start the React frontend:")
    print("    cd frontend && npm install && npm start")
    print("  Frontend will open at:  http://localhost:3000")
    print("=" * 60)
    print("\nPress Ctrl+C to stop all services.\n")

    # Keep alive
    for p in procs:
        p.wait()
