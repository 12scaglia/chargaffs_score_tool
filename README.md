# Chargaff's Score Tool

Web app for analyzing Chargaff's Second Parity Rule (PR2 — intra-strand parity) on FASTA sequences: upload, configurable windowing, Chargaff Parity Score calculation, genomic annotations, interactive heatmap/chart/table.

The repository contains two independent versions, designed to also run in parallel on the same machine (different ports):

- [`bio/`](./bio) — base version
- [`bio-advanced/`](./bio-advanced) — advanced version (skew, sliding window, multi-sequence, genome comparison)

## Installation

### Prerequisites

- **Python 3.12 or higher** — run `python3 --version` to check. Download from [python.org](https://www.python.org/downloads/).
- **Node.js 18 or higher** (npm included) — run `node --version` to check. Download from [nodejs.org](https://nodejs.org/).
- **git** — run `git --version` to check.

### 1. Get the project

```bash
git clone https://github.com/12scaglia/chargaffs_score_tool
cd chargaffs_score_tool
```

If you don't use git, you can also download the ZIP from GitHub (green "Code" button → "Download ZIP") and extract it.

### 2. Choose which version to run

The two versions are independent: you only need the steps for the folder you're interested in. Each version requires **two separate processes** (backend and frontend).

#### Quick start (launcher script)

A launcher script is included at the repo root that lets you pick a version interactively, installs dependencies on first run, and starts both processes for you:

- **Linux/macOS:**

  ```bash
  ./run.sh
  ```

  Runs backend and frontend in the same terminal; `Ctrl+C` stops both.

- **Windows:**

  ```bat
  run.bat
  ```

  Opens backend and frontend each in their own window; close those windows (or `Ctrl+C` in each) to stop the servers.

#### Manual start

If you prefer to run each process yourself (or need more control), use the commands below in two different terminals.

#### Base version (`bio/`)

Terminal 1 — backend:

```bash
cd bio/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Terminal 2 — frontend:

```bash
cd bio/frontend
npm install
npm run dev
```

Once both are running, open **http://127.0.0.1:5173** in your browser. The API responds on `http://127.0.0.1:8000` (check with `curl http://127.0.0.1:8000/health`, it should return `{"status":"ok"}`).

#### Advanced version (`bio-advanced/`)

Terminal 1 — backend:

```bash
cd bio-advanced/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8001
```

Terminal 2 — frontend:

```bash
cd bio-advanced/frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5174**. API on `http://127.0.0.1:8001`.

### 3. Everyday use

Once the dependencies are installed (`.venv` and `node_modules`), subsequent runs only need the last command in each terminal (`uvicorn ...` and `npm run dev`) — no need to repeat `pip install`/`npm install` unless `requirements.txt` or `package.json` change.

To stop the servers: `Ctrl+C` in each terminal.

## Features

### Base version

FASTA upload, configurable windowing, Chargaff Parity Score, heatmap/chart/table, genomic annotations (BED/GFF3/GTF/TXT, upload or manual, editable and displayed on the chart), dark mode, Italian/English.

### Advanced version

Everything in the base version, plus: GC-skew/AT-skew per window, cumulative skew (Z-curve), overlapping windows (sliding window), heuristic prediction of replication origin/terminus, multi-sequence support (multiple chromosomes/contigs in a single FASTA), direct comparison between two genomes.

## Stack

- **Backend:** Python 3.12+, FastAPI, Biopython, NumPy/Pandas, Uvicorn
- **Frontend:** Vue 3 (`<script setup>`), Vite, Pinia, Vue Router, Axios, Apache ECharts, TailwindCSS, vue-i18n

## License

MIT — see [LICENSE](./LICENSE).
