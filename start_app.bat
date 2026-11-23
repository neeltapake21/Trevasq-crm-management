@echo off
title TrevasQ Marketing & Lead Management Platform
echo ==========================================================
echo Starting TrevasQ Full-Stack Platform (Backend + Frontend)
echo ==========================================================

cd /d "%~dp0"

echo [1/3] Starting Backend API (Port 8000)...
start "TrevasQ Backend" cmd /k "set PYTHONPATH=. && "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Dev Server (Port 5173)...
start "TrevasQ Frontend" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0"

timeout /t 4 /nobreak >nul

echo [3/3] Launching Web Browser...
start http://localhost:5173

echo ==========================================================
echo TrevasQ Platform is LIVE!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000/docs
echo ==========================================================
pause
