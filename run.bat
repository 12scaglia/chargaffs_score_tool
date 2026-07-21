@echo off
setlocal
REM Launches the Chargaff Score Tool (backend + frontend), setting up
REM dependencies on first run if needed.
REM Backend and frontend each open in their own window; close those windows
REM (or Ctrl+C in each) to stop the servers.

set "REPO_DIR=%~dp0"
set "BACKEND_DIR=%REPO_DIR%backend"
set "FRONTEND_DIR=%REPO_DIR%frontend"
set "BACKEND_PORT=8000"

echo Starting Chargaff Score Tool...

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
start "Chargaff backend" cmd /k "cd /d "%BACKEND_DIR%" && .venv\Scripts\uvicorn.exe app.main:app --reload --port %BACKEND_PORT%"
start "Chargaff frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Backend and frontend started in separate windows.
echo Close those windows (or press Ctrl+C in each) to stop the servers.
