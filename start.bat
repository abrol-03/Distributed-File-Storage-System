@echo off
echo ============================================================
echo   Distributed File Storage System - Quick Start (Windows)
echo   JIIT CN Lab 24B15CS313
echo ============================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.9+ and add to PATH.
    pause
    exit /b 1
)

:: Install Python deps
echo [1/4] Installing coordinator dependencies...
pip install -q -r coordinator\requirements.txt
pip install -q -r storage_node\requirements.txt

:: Start Coordinator
echo [2/4] Starting Coordinator on port 8000...
start "DFS Coordinator" cmd /k "cd /d %~dp0coordinator && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

:: Start Node A
echo [3/4] Starting Storage Nodes...
start "DFS Node A" cmd /k "cd /d %~dp0storage_node && set NODE_ID=node_a && set NODE_PORT=8001 && set NODE_PUBLIC_URL=http://localhost:8001 && set COORDINATOR_URL=http://localhost:8000 && set STORAGE_DIR=..\data\node_a && uvicorn main:app --host 0.0.0.0 --port 8001"
timeout /t 1 /nobreak >nul

start "DFS Node B" cmd /k "cd /d %~dp0storage_node && set NODE_ID=node_b && set NODE_PORT=8002 && set NODE_PUBLIC_URL=http://localhost:8002 && set COORDINATOR_URL=http://localhost:8000 && set STORAGE_DIR=..\data\node_b && uvicorn main:app --host 0.0.0.0 --port 8002"
timeout /t 1 /nobreak >nul

start "DFS Node C" cmd /k "cd /d %~dp0storage_node && set NODE_ID=node_c && set NODE_PORT=8003 && set NODE_PUBLIC_URL=http://localhost:8003 && set COORDINATOR_URL=http://localhost:8000 && set STORAGE_DIR=..\data\node_c && uvicorn main:app --host 0.0.0.0 --port 8003"
timeout /t 2 /nobreak >nul

:: Start Frontend
echo [4/4] Starting React Frontend...
cd frontend
call npm install --silent
start "DFS Frontend" cmd /k "npm start"
cd ..

echo.
echo ============================================================
echo   All services started!
echo.
echo   Coordinator:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo   Node A:       http://localhost:8001
echo   Node B:       http://localhost:8002
echo   Node C:       http://localhost:8003
echo   Frontend:     http://localhost:3000
echo ============================================================
echo.
echo Close the individual terminal windows to stop each service.
pause
