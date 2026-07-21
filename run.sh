#!/usr/bin/env bash
# Launches the Chargaff Score Tool (backend + frontend), setting up
# dependencies on first run if needed.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
BACKEND_PORT=8000

echo "Starting Chargaff Score Tool..."

# --- Backend setup ---
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "Creating virtualenv and installing backend dependencies..."
  python3 -m venv "$BACKEND_DIR/.venv"
  "$BACKEND_DIR/.venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
fi

# --- Frontend setup ---
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

# --- Launch both processes, stop both on Ctrl+C ---
cleanup() {
  echo "Stopping servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$BACKEND_DIR" && ".venv/bin/uvicorn" app.main:app --reload --port "$BACKEND_PORT") &
BACKEND_PID=$!

(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
