@echo off
echo ===================================
echo  PORTFOLIO WEBSITE FIX SCRIPT  
echo ===================================
echo.

cd /d d:\alphonsus-portfolio-website-design

echo [1/5] Clearing Vite cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist "src\test-compile.tsx" del "src\test-compile.tsx"

echo [2/5] Checking npm...
call npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Install Node.js first!
    pause
    exit /b 1
)

echo [3/5] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [4/5] Starting CMS Backend on port 5001...
cd cms
call npm install
start "CMS Backend (Port 5001)" cmd /k "npm run dev"
cd ..

echo.
echo [5/5] Waiting for CMS to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend on port 5173...
start "Frontend (Port 5173)" cmd /k "npm run dev"

echo.
echo ========================================
echo  STARTUP COMPLETE!
echo ========================================  
echo.
echo  OPEN IN BROWSER:
echo  - Homepage: http://localhost:5173
echo  - CMS Admin: http://localhost:5173/admin
echo.
echo  If page is blank, press F12 to see errors
echo ========================================
echo.
pause