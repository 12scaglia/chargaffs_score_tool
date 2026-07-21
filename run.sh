#!/usr/bin/env bash
# Launches either the base or advanced version of the Chargaff Score Tool
# (backend + frontend), setting up dependencies on first run if needed.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Which version do you want to start?"
echo "  1) Base       (bio/)          - backend:8000  frontend:5173"
echo "  2) Advanced   (bio-advanced/) - backend:8001  frontend:5174"
read -rp "Choice [1/2]: " choice

case "$choice" in
  1)
    NAME="base"
    DIR="$REPO_DIR/bio"
    BACKEND_PORT=8000
    ;;
  2)
    NAME="advanced"
    DIR="$REPO_DIR/bio-advanced"
    BACKEND_PORT=8001
    ;;
  *)
    echo "Invalid choice: $choice" >&2
    exit 1
    ;;
esac

BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

echo "Starting $NAME version..."

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
