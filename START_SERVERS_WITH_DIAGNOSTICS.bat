@echo off
cls
echo ===============================================
echo    ALPHONSUS PORTFOLIO - SERVER DIAGNOSTICS
echo ===============================================
echo.

cd /d "d:\alphonsus-portfolio-website-design"

echo [1/6] Checking directory...
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Make sure you're in the right directory.
    pause
    exit /b 1
)
echo ✓ Main directory OK

echo.
echo [2/6] Checking CMS directory...
if not exist "cms\package.json" (
    echo ERROR: CMS package.json not found!
    pause
    exit /b 1
)
echo ✓ CMS directory OK

echo.
echo [3/6] Checking CMS environment...
if not exist "cms\.env" (
    echo ERROR: CMS .env file not found!
    echo Please create cms\.env file with required settings.
    echo Check cms\.env.example for template.
    pause
    exit /b 1
)
echo ✓ CMS environment file found

echo.
echo [4/6] Checking if MongoDB is needed...
echo Note: MongoDB should be running for CMS to work
echo If you get connection errors, install and start MongoDB

echo.
echo [5/6] Starting CMS Server (Backend)...
cd cms
echo Starting CMS on port 5001...
start "CMS Backend Server" cmd /k "echo Starting CMS Backend... && npm run dev && echo CMS Backend started! && pause"

echo.
echo [6/6] Waiting 5 seconds then starting Frontend...
timeout /t 5 /nobreak >nul
cd ..
start "Frontend Dev Server" cmd /k "echo Starting Frontend... && npm run dev && echo Frontend started! && pause"

echo.
echo ===============================================
echo    SERVERS ARE STARTING...
echo ===============================================
echo 🖥️  CMS Backend:  http://localhost:5001
echo 🌐  Frontend:     http://localhost:5173  
echo 👨‍💼  Admin Panel:   http://localhost:5173/admin
echo.
echo ===============================================
echo    TROUBLESHOOTING TIPS:
echo ===============================================
echo • If CMS fails: Check if MongoDB is running
echo • If Frontend fails: Check for TypeScript errors
echo • Default login: admin / [see cms/.env file]
echo • Press Ctrl+C in terminal windows to stop servers
echo ===============================================
echo.
pause