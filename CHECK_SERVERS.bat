@echo off
echo ========================================
echo   CHECKING SERVER STATUS
echo ========================================
echo.

echo Checking port 5001 (CMS Backend)...
netstat -ano | findstr ":5001" | findstr "LISTENING"
if %ERRORLEVEL% EQU 0 (
    echo ✓ CMS Backend is RUNNING on port 5001
) else (
    echo ✗ CMS Backend is NOT running
)

echo.
echo Checking port 5173 (Frontend)...
netstat -ano | findstr ":5173" | findstr "LISTENING"
if %ERRORLEVEL% EQU 0 (
    echo ✓ Frontend is RUNNING on port 5173
) else (
    echo ✗ Frontend is NOT running
)

echo.
echo Checking MongoDB (port 27017)...
netstat -ano | findstr ":27017" | findstr "LISTENING"
if %ERRORLEVEL% EQU 0 (
    echo ✓ MongoDB is RUNNING on port 27017
) else (
    echo ⚠ MongoDB is NOT running - CMS needs this!
)

echo.
echo ========================================
echo Press any key to exit...
pause >nul
