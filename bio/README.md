# Chargaff Genome Analyzer

Web app per l'analisi della Seconda Legge di Chargaff su sequenze FASTA: upload, windowing configurabile, calcolo del Chargaff Parity Score, heatmap/grafico/tabella interattivi.

## Stack
- **Backend:** Python 3.12+, FastAPI, Biopython, NumPy/Pandas, Uvicorn
- **Frontend:** Vue 3 (`<script setup>`), Vite, Pinia, Vue Router, Axios, Apache ECharts, TailwindCSS

## Avvio backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

API disponibile su `http://127.0.0.1:8000` (`/health`, `/analyze`).

## Avvio frontend

```bash
cd frontend
npm install
npm run dev
```

App disponibile su `http://127.0.0.1:5173`. Il dev server proxya le chiamate `/api/*` verso il backend su `:8000` (vedi `vite.config.ts`).

## Build produzione frontend

```bash
cd frontend
npm run build
```

## Struttura

```
backend/
  app/
    api/        # router FastAPI (/analyze, /health)
    domain/      # chargaff.py — logica core isolata (NumPy vettoriale)
    services/    # parsing/pulizia FASTA (Biopython)
    schemas/     # modelli Pydantic (contratto SoA)
    core/        # configurazione
frontend/
  src/
    components/  # layout, upload, controlli, dashboard, charts, table
    stores/      # Pinia (stato analisi)
    services/    # client Axios, setup ECharts
    composables/ # useExport, useSyncedChart
    types/       # contratto dati condiviso col backend
```
