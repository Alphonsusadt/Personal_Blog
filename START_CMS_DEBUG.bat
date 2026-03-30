@echo off
echo ===================================
echo   STARTING CMS SERVER FOR DEBUG
echo ===================================
echo.

cd /d "d:\alphonsus-portfolio-website-design"

echo Step 1: Starting CMS Server (port 5001)...
echo.
cd cms
start "CMS Server" cmd /k "npm run dev"
cd ..

echo.
echo Step 2: Starting Frontend Dev Server (port 5173)...
timeout /t 3 /nobreak >nul
start "Frontend Dev" cmd /k "npm run dev"

echo.
echo ===================================
echo   SERVERS STARTING...
echo ===================================
echo CMS Server: http://localhost:5001
echo Frontend:   http://localhost:5173
echo Admin:      http://localhost:5173/admin
echo.
echo Login dengan:
echo Username: admin
echo Password: [lihat di cms/.env]
echo ===================================

pause