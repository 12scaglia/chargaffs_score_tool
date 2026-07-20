# Chargaff's Score Tool

Web app per l'analisi della Seconda Legge di Chargaff (PR2 — intra-strand parity) su sequenze FASTA: upload, windowing configurabile, calcolo del Chargaff Parity Score, annotazioni genomiche, heatmap/grafico/tabella interattivi.

Il repository contiene due versioni indipendenti, pensate per poter girare anche in parallelo sulla stessa macchina (porte diverse):

- [`bio/`](./bio) — versione base
- [`bio-advanced/`](./bio-advanced) — versione avanzata (skew, sliding window, multi-sequenza, confronto genomi)

## Installazione

### Prerequisiti

- **Python 3.12 o superiore** — `python3 --version` per controllare. Scaricabile da [python.org](https://www.python.org/downloads/).
- **Node.js 18 o superiore** (con npm incluso) — `node --version` per controllare. Scaricabile da [nodejs.org](https://nodejs.org/).
- **git** — `git --version` per controllare.

### 1. Scarica il progetto

```bash
git clone https://github.com/12scaglia/chargaffs_score_tool
cd chargaffs_score_tool
```

Chi non usa git può anche scaricare lo ZIP da GitHub (bottone verde "Code" → "Download ZIP") ed estrarlo.

### 2. Scegli quale versione avviare

Le due versioni sono indipendenti: bastano i passaggi della cartella che ti interessa. Ogni versione richiede **due processi separati** (backend e frontend), da lanciare in due terminali diversi.

#### Versione base (`bio/`)

Terminale 1 — backend:

```bash
cd bio/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Terminale 2 — frontend:

```bash
cd bio/frontend
npm install
npm run dev
```

Quando entrambi sono avviati, apri **http://127.0.0.1:5173** nel browser. L'API risponde su `http://127.0.0.1:8000` (verifica con `curl http://127.0.0.1:8000/health`, deve rispondere `{"status":"ok"}`).

#### Versione avanzata (`bio-advanced/`)

Terminale 1 — backend:

```bash
cd bio-advanced/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8001
```

Terminale 2 — frontend:

```bash
cd bio-advanced/frontend
npm install
npm run dev
```

Apri **http://127.0.0.1:5174**. API su `http://127.0.0.1:8001`.

### 3. Uso quotidiano

Una volta installate le dipendenze (`.venv` e `node_modules`), per i successivi avvii bastano gli ultimi comandi di ciascun terminale (`uvicorn ...` e `npm run dev`) — non serve ripetere `pip install`/`npm install` a meno che `requirements.txt` o `package.json` non cambino.

Per fermare i server: `Ctrl+C` in ciascun terminale.

## Feature

### Versione base

Upload FASTA, windowing configurabile, Chargaff Parity Score, heatmap/grafico/tabella, annotazioni genomiche (BED/GFF3/GTF/TXT, upload o manuali, modificabili e visualizzabili sul grafico), dark mode, italiano/inglese.

### Versione avanzata

Tutto quello della versione base, più: GC-skew/AT-skew per finestra, skew cumulativo (Z-curve), finestre sovrapposte (sliding window), predizione euristica di origine/terminazione di replicazione, supporto multi-sequenza (più cromosomi/contig in un solo FASTA), confronto diretto tra due genomi.

## Stack

- **Backend:** Python 3.12+, FastAPI, Biopython, NumPy/Pandas, Uvicorn
- **Frontend:** Vue 3 (`<script setup>`), Vite, Pinia, Vue Router, Axios, Apache ECharts, TailwindCSS, vue-i18n

## Licenza

MIT — vedi [LICENSE](./LICENSE).
