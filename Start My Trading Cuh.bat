@echo off
title My Trading Cuh
cd /d "%~dp0"
echo Starting My Trading Cuh on http://localhost:8642 ...
echo (Keep this window open while you use the app. Close it to stop.)
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8642/index.html"
python -m http.server 8642 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo Could not start the local server. Is Python installed? You can also just double-click index.html.
  pause
)
