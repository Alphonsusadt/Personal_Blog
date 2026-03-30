@echo off
echo ========================================
echo   STARTING PORTFOLIO SERVERS
echo ========================================
echo.

REM Start CMS Backend in new window
echo [1/2] Starting CMS Backend...
cd /d "%~dp0cms"
start "CMS Backend (Port 5001)" cmd /k "npm run dev"

REM Wait 5 seconds for CMS to initialize
echo [2/2] Waiting 5 seconds, then starting Frontend...
timeout /t 5 /nobreak >nul

REM Start Frontend in new window
cd /d "%~dp0"
start "Frontend (Port 5173)" cmd /k "npm run dev"

echo.
echo ========================================
echo   SERVERS STARTED!
echo ========================================
echo.
echo CMS Backend:  http://localhost:5001
echo Frontend:     http://localhost:5173
echo Admin Panel:  http://localhost:5173/admin
echo.
echo Press any key to close this window...
echo (The servers will keep running in separate windows)
pause >nul
