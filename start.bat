@echo off
echo ============================================================
echo   Distributed File Storage System - Clean Start (Windows)
echo   JIIT CN Lab 24B15CS313
echo ============================================================
echo.

:: Free up ports 3000, 8000, 8001, 8002, 8003 if already occupied
echo [0/4] Cleaning up any previously running processes on ports 3000 and 8000-8003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8002 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8003 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.9+ and add to PATH.
    pause
    exit /b 1
)

:: Start Coordinator
echo [1/4] Starting Coordinator on port 8000...
start "DFS Coordinator" cmd /k "cd /d %~dp0coordinator && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

:: Start Storage Nodes
echo [2/4] Starting Storage Nodes A, B, C...
start "DFS Node A" cmd /k "cd /d %~dp0storage_node && set NODE_ID=node_a && set NODE_PORT=8001 && set NODE_PUBLIC_URL=http://localhost:8001 && set COORDINATOR_URL=http://localhost:8000 && set STORAGE_DIR=..\data\node_a && uvicorn main:app --host 0.0.0.0 --port 8001"
timeout /t 1 /nobreak >nul

start "DFS Node B" cmd /k "cd /d %~dp0storage_node && set NODE_ID=node_b && set NODE_PORT=8002 && set NODE_PUBLIC_URL=http://localhost:8002 && set COORDINATOR_URL=http://localhost:8000 && set STORAGE_DIR=..\data\node_b && uvicorn main:app --host 0.0.0.0 --port 8002"
timeout /t 1 /nobreak >nul

start "DFS Node C" cmd /k "cd /d %~dp0storage_node && set NODE_ID=node_c && set NODE_PORT=8003 && set NODE_PUBLIC_URL=http://localhost:8003 && set COORDINATOR_URL=http://localhost:8000 && set STORAGE_DIR=..\data\node_c && uvicorn main:app --host 0.0.0.0 --port 8003"
timeout /t 2 /nobreak >nul

:: Start Frontend
echo [3/4] Starting React Frontend on port 3000...
cd frontend
start "DFS Frontend" cmd /k "npm start"
cd ..

echo.
echo ============================================================
echo   All services started cleanly!
echo.
echo   Coordinator:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo   Node A:       http://localhost:8001
echo   Node B:       http://localhost:8002
echo   Node C:       http://localhost:8003
echo   Frontend:     http://localhost:3000
echo ============================================================
echo.
