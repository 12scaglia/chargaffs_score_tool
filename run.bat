@echo off
setlocal enabledelayedexpansion
REM Launches either the base or advanced version of the Chargaff Score Tool
REM (backend + frontend), setting up dependencies on first run if needed.
REM Backend and frontend each open in their own window; close those windows
REM (or Ctrl+C in each) to stop the servers.

set "REPO_DIR=%~dp0"

echo Which version do you want to start?
echo   1) Base       (bio\)          - backend:8000  frontend:5173
echo   2) Advanced   (bio-advanced\) - backend:8001  frontend:5174
set /p choice="Choice [1/2]: "

if "%choice%"=="1" (
    set "NAME=base"
    set "DIR=%REPO_DIR%bio"
    set "BACKEND_PORT=8000"
) else if "%choice%"=="2" (
    set "NAME=advanced"
    set "DIR=%REPO_DIR%bio-advanced"
    set "BACKEND_PORT=8001"
) else (
    echo Invalid choice: %choice%
    exit /b 1
)

set "BACKEND_DIR=%DIR%\backend"
set "FRONTEND_DIR=%DIR%\frontend"

echo Starting %NAME% version...

REM --- Backend setup ---
if not exist "%BACKEND_DIR%\.venv" (
    echo Creating virtualenv and installing backend dependencies...
    python -m venv "%BACKEND_DIR%\.venv"
    "%BACKEND_DIR%\.venv\Scripts\pip.exe" install -q -r "%BACKEND_DIR%\requirements.txt"
)

REM --- Frontend setup ---
if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend dependencies...
    pushd "%FRONTEND_DIR%"
    call npm install
    popd
)

REM --- Launch both processes, each in its own window ---
start "Chargaff backend (%NAME%)" cmd /k "cd /d "%BACKEND_DIR%" && .venv\Scripts\uvicorn.exe app.main:app --reload --port %BACKEND_PORT%"
start "Chargaff frontend (%NAME%)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Backend and frontend started in separate windows.
echo Close those windows (or press Ctrl+C in each) to stop the servers.
