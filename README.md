# Chargaff's Score Tool

Web app for analyzing Chargaff's Second Parity Rule (PR2 — intra-strand parity) on FASTA sequences: upload or fetch-by-accession (NCBI/Ensembl), configurable windowing, Chargaff Parity Score, GC/AT-skew, statistical significance testing, genomic annotations, and CSV/PNG/Markdown export.

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

### 2. Run it

The app requires **two separate processes** (backend and frontend).

#### Quick start (launcher script)

A launcher script is included at the repo root that installs dependencies on first run and starts both processes for you:

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

If you prefer to run each process yourself (or need more control), use two terminals:

Terminal 1 — backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Terminal 2 — frontend:

```bash
cd frontend
npm install
npm run dev
```

Once both are running, open **http://127.0.0.1:5173** in your browser. The API responds on `http://127.0.0.1:8000` (check with `curl http://127.0.0.1:8000/health`, it should return `{"status":"ok"}`).

#### Docker (no local Python/Node needed)

Requires **Docker Engine with the Compose plugin** — if `docker compose version` fails, install it from the [official Docker docs](https://docs.docker.com/engine/install/) for your OS.

```bash
docker compose up --build
```

Open **http://localhost:8080**. The frontend container serves the built app and reverse-proxies `/api/*` to the backend container — no ports/CORS to configure. This is a "just run it" path (no hot reload); for day-to-day development use the launcher script or manual start above.

### 3. Everyday use

Once the dependencies are installed (`.venv` and `node_modules`), subsequent runs only need the last command in each terminal (`uvicorn ...` and `npm run dev`) — no need to repeat `pip install`/`npm install` unless `requirements.txt` or `package.json` change.

To stop the servers: `Ctrl+C` in each terminal.

## Testing

```bash
# Backend (from backend/, with the venv set up as above)
.venv/bin/pytest -q

# Frontend (from frontend/, with dependencies installed as above)
npm run test
```

Both suites also run automatically in CI on every push/PR (see `.github/workflows/ci.yml`), along with a `docker compose build` check.

## Features

- **FASTA upload** or **fetch by accession** directly from NCBI E-utilities or Ensembl REST (with an option to score the entire fetched sequence as a single window, useful for whole-gene comparisons)
- Configurable windowing, including overlapping/sliding windows
- Chargaff Parity Score, GC-skew/AT-skew per window, cumulative skew (Z-curve)
- Heuristic prediction of replication origin/terminus
- Multi-sequence support (multiple chromosomes/contigs in a single FASTA) and direct comparison between two genomes
- Statistical significance testing: a permutation test compares the observed score against a shuffled-sequence baseline (z-score/p-value)
- Genomic annotations (BED/GFF3/GTF/TXT, upload or manual): categories are discovered dynamically from the file content (gene biotype, feature type, etc.), with a sortable/filterable score table
- Export: CSV (annotation/region table), PNG (charts), Markdown report
- Save/load a full session (window size, annotations, filters, source) as a local JSON file
- Dark mode, Italian/English

## Stack

- **Backend:** Python 3.12+, FastAPI, Biopython, NumPy/Pandas, httpx, Uvicorn
- **Frontend:** Vue 3 (`<script setup>`), Vite, Pinia, Axios, Apache ECharts, TailwindCSS, vue-i18n

## License

MIT — see [LICENSE](./LICENSE).
