# Chargaff's Score Tool

Web app per l'analisi della Seconda Legge di Chargaff (PR2 — intra-strand parity) su sequenze FASTA: upload, windowing configurabile, calcolo del Chargaff Parity Score, annotazioni genomiche, heatmap/grafico/tabella interattivi.

Il repository contiene due versioni indipendenti:

## [`bio/`](./bio) — versione base

Upload FASTA, windowing configurabile, Chargaff Parity Score, heatmap/grafico/tabella, annotazioni genomiche (BED/GFF3/GTF/TXT, upload o manuali, modificabili), dark mode, italiano/inglese.

```bash
cd bio/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn app.main:app --reload --port 8000
cd bio/frontend && npm install && npm run dev
```

App su `http://127.0.0.1:5173`, API su `http://127.0.0.1:8000`.

## [`bio-advanced/`](./bio-advanced) — versione avanzata

Tutto quello della versione base, più: GC-skew/AT-skew per finestra, skew cumulativo (Z-curve), finestre sovrapposte (sliding window), predizione euristica di origine/terminazione di replicazione, supporto multi-sequenza (più cromosomi/contig in un solo FASTA), confronto diretto tra due genomi.

```bash
cd bio-advanced/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn app.main:app --reload --port 8001
cd bio-advanced/frontend && npm install && npm run dev
```

App su `http://127.0.0.1:5174`, API su `http://127.0.0.1:8001`.

## Stack

- **Backend:** Python 3.12+, FastAPI, Biopython, NumPy/Pandas, Uvicorn
- **Frontend:** Vue 3 (`<script setup>`), Vite, Pinia, Vue Router, Axios, Apache ECharts, TailwindCSS, vue-i18n

## Licenza

MIT — vedi [LICENSE](./LICENSE).
