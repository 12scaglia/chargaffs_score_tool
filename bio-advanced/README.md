# Chargaff Genome Analyzer — Advanced

Fork di [Chargaff Genome Analyzer](../bio) con le estensioni per un'analisi
genomica più completa della Seconda Legge di Chargaff (PR2): GC/AT-skew,
skew cumulativo (Z-curve), finestre sovrapposte, predizione euristica di
origine/terminazione di replicazione, supporto multi-sequenza e confronto
tra due genomi. Il progetto originale in `../bio` resta invariato.

## Stack
- **Backend:** Python 3.12+, FastAPI, Biopython, NumPy/Pandas, Uvicorn
- **Frontend:** Vue 3 (`<script setup>`), Vite, Pinia, Vue Router, Axios, Apache ECharts, TailwindCSS, vue-i18n

## Avvio backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8001
```

API disponibile su `http://127.0.0.1:8001` (`/health`, `/analyze`).

## Avvio frontend

```bash
cd frontend
npm install
npm run dev
```

App disponibile su `http://127.0.0.1:5174`. Il dev server proxya le chiamate `/api/*` verso il backend su `:8001` (vedi `vite.config.ts`). Le porte sono distinte dal progetto originale (`:8000`/`:5173`) per poter far girare entrambe le versioni in parallelo.

## Build produzione frontend

```bash
cd frontend
npm run build
```

## Feature aggiuntive rispetto alla versione base

- **GC-skew / AT-skew per finestra** — `(G-C)/(G+C)` e `(A-T)/(A+T)`, calcolati nel backend insieme allo score.
- **Skew cumulativo (Z-curve)** — somma cumulativa dello skew lungo il genoma, calcolata client-side, visualizzabile nel grafico skew.
- **Finestre sovrapposte** — `step_size` configurabile indipendentemente dalla window size (checkbox "sovrapposizione" nella sidebar).
- **Predizione origine/terminazione di replicazione** — euristica basata su minimo/massimo dello skew cumulativo, sovrapponibile ai grafici.
- **Multi-sequenza** — un FASTA con più record viene analizzato interamente; selettore per passare da un cromosoma/contig all'altro.
- **Confronto tra due genomi** — upload di un secondo FASTA, score e skew sovrapposti in un grafico dedicato con statistiche comparative.

## Struttura

```
backend/
  app/
    api/        # router FastAPI (/analyze, /health)
    domain/      # chargaff.py — logica core isolata (NumPy vettoriale, prefix-sum windowing + skew)
    services/    # parsing/pulizia FASTA multi-record (Biopython)
    schemas/     # modelli Pydantic (contratto SoA multi-record)
    core/        # configurazione
frontend/
  src/
    components/  # layout, upload, controlli, dashboard, charts, table, annotations, comparison
    stores/      # Pinia (analysis store factory: analysis + comparison)
    services/    # client Axios, setup ECharts
    composables/ # useExport, useSyncedChart, useAnnotationOverlay, useSkewAnalysis, useChartTheme, useNumberFormat
    i18n/        # it/en
    theme/       # dark mode
    types/       # contratto dati condiviso col backend
```
