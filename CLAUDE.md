# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A web app for analyzing Chargaff's Second Parity Rule (PR2 — intra-strand parity) on DNA sequences: FASTA upload or fetch-by-accession (NCBI/Ensembl), configurable windowing, the Chargaff Parity Score, GC/AT-skew, a permutation-test significance check, genomic annotations, and CSV/PNG/Markdown export. FastAPI backend + Vue 3 frontend, two independent services (`backend/`, `frontend/`) talking over a `/api` proxy.

## Commands

### Backend (`backend/`)

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000   # dev server, http://127.0.0.1:8000
.venv/bin/pytest -q                                    # all tests
.venv/bin/pytest tests/test_chargaff.py -q              # one file
.venv/bin/pytest tests/test_chargaff.py::test_invalid_window_and_step_size_raise  # one test
```

No `pytest.ini`/`pyproject.toml`/`conftest.py` — plain pytest discovery from `backend/`.

### Frontend (`frontend/`)

```bash
npm install
npm run dev              # dev server, http://127.0.0.1:5173, proxies /api/* to :8000
npm run build             # vue-tsc -b (type-check) && vite build — CI's source of truth for type errors
npm run test               # vitest run (all tests)
npx vitest run src/stores/analysis.test.ts   # one file
npx vitest run -t "topIndices sorts"          # by test name
```

### Docker

```bash
docker compose up --build   # http://localhost:8080 — frontend (nginx) reverse-proxies /api/* to backend, internal-only
```

### Launcher scripts (repo root)

`./run.sh` (Linux/macOS) / `run.bat` (Windows) install dependencies on first run and start both backend + frontend together.

### CI

`.github/workflows/ci.yml` runs on push/PR: backend pytest, frontend build+test, `docker compose build`. Treat `npm run build` and `pytest -q` as the pre-commit bar — CI runs nothing you can't run locally first.

## Architecture

### Backend: stateless, layered, upload and fetch-by-accession share one pipeline

`backend/app/`:
- `api/routes.py` — the **only** router, mounted with **no path prefix** (routes are `/health`, `/analyze`, `/fetch`, `/significance`, `/fetch/significance` — the frontend's `/api` prefix is stripped by the dev proxy / nginx before reaching here, not present in the FastAPI app itself).
- `services/fasta_service.py` — upload validation + Biopython parsing + cleaning to a `np.uint8` array. `services/fetch_service.py` — NCBI E-utilities / Ensembl REST client (httpx).
- `domain/chargaff.py` — pure NumPy, no FastAPI/IO: `compute_window_counts` (vectorized via per-base `np.cumsum` prefix sums, supports overlapping windows via `step_size < window_size`) and `compute_statistics`. `domain/significance.py` — permutation test (shuffles the sequence N times, reuses `compute_window_counts`, never duplicates the score formula).
- `schemas/analyze.py` — Pydantic response models. `WindowData` is deliberately **Structure-of-Arrays** (parallel `start`/`end`/`A`/`T`/`G`/`C`/`score`/`gc_skew`/`at_skew` lists), not array-of-objects — keeps large-window-count payloads compact.

**Key pattern**: both the upload path (`/analyze`) and the fetch-by-accession path (`/fetch`) funnel through the same shared tail — `fasta_service._build_parsed()` (id extraction + cleaning) and `routes._build_analyze_response()` (windowing + stats). A fetched accession is never treated as a separate code path from an uploaded file; it's converted to FASTA text and handed to `parse_fasta_text()`, which calls the identical cleaning logic as `parse_fasta_records()`. The same sharing applies to `/significance` vs `/fetch/significance` via `_build_significance_response()`. When adding a third "how do I get a sequence into the pipeline" path, extend these shared helpers rather than duplicating the windowing/response-building logic.

**No database, no server-side session/cache.** Every endpoint recomputes from scratch — significance and fetch-by-accession re-fetch/re-derive rather than reading anything cached. `core/config.py` (`Settings`, env-prefixed `CGA_`) holds all tunables (upload/fetch size caps, significance sequence-length cap, CORS origins).

### Frontend: Pinia setup-stores, one state-population choke point

`frontend/src/`:
- `stores/analysis.ts` exports a **factory** (`createAnalysisStore(id)`) instantiated twice — `useAnalysisStore` (primary) and `useComparisonStore` (the second-genome comparison panel) — so both share identical state/actions without duplicating ~150 lines.
- `applyResponse(response)` is the **single place** analysis state is populated from a backend response, called by `runAnalysis()` (upload), `runFetch()` (accession), and session restore. It always resets `selectedIndex`/`activeTopFilter`/`significance` — a fresh analysis or record switch must invalidate any prior significance result or top-N selection tied to the old data. When adding a new way to populate results, route it through `applyResponse()` rather than setting `records`/`filename` directly.
- `lastOrigin`/`lastFetchSource` track whether the current results came from upload or fetch-by-accession (source, accession, species, whole-sequence flag) — needed because nothing is cached server-side, so re-running significance or saving a session has to know whether to re-send a file or re-fetch by accession.
- `stores/annotations.ts` is fully client-side (no API calls) — `regions: Annotation[]`, with `restore()` (preserves an id, used by session load) distinct from `addManual()` (always mints a fresh id).
- **Annotation categories are not a fixed enum.** `types/analysis.ts`: `BASE_ANNOTATION_CATEGORIES` (`centromere`/`telomere`/`gene`/`custom`) have fixed colors; any other category value discovered from an uploaded GFF/GTF/BED/TXT file (a gene biotype like `lncRNA`, or a bare feature type like `exon`) gets a color assigned from `DYNAMIC_PALETTE` on first sight and cached for the session (`getCategoryColor`/`isBaseCategory`/`formatCategoryLabel`). The category filter dropdown in `AnnotationStatsPanel.vue` is built from whatever categories are actually present in the loaded annotations, not a static list.
- **Sessions** (`composables/useSession.ts`) are local-only JSON snapshots — never embed `WindowData` (large, regenerable). Loading a fetch-based session silently re-fetches; loading an upload-based session can only restore settings/annotations and prompt the user to re-select the file, because a browser cannot restore a `File` handle from JSON. This is a hard platform constraint, not a design choice — don't try to "fix" it.
- ECharts is manually tree-shaken (`services/echarts-setup.ts`); every chart component uses the `useSyncedChart` composable, which joins a shared `dataZoom` group so charts pan/zoom together (pass `sync: false` to opt a chart out, e.g. the genome-comparison chart, which has an independently-sized x-axis). The chart instance is kept as a **local variable per component**, never `defineExpose`d — PNG export is done by each chart component calling its own `chart.getDataURL()` locally, not via a shared/global export mechanism.
- `i18n/locales/en.ts` and `it.ts` must stay structurally identical (same nested keys in both) — `i18n/index.ts` picks the locale at module load time based on `localStorage`/`navigator.language`, which is why frontend tests need `environment: 'jsdom'` set globally in `vite.config.ts`'s `test` block (importing almost any store/composable transitively imports `i18n/index.ts`).

### Testing conventions

Backend: pure-NumPy unit tests against `domain/` modules, plus `TestClient`-based route tests in `test_routes.py` that mock `fetch_service.fetch_sequence` (via `monkeypatch`) rather than hitting NCBI/Ensembl. Frontend: Vitest covers **stores and composables only** (no component rendering tests) — `setActivePinia(createPinia())` in `beforeEach` is enough for store/Pinia-dependent code; composables that call `useI18n()` (e.g. `useSession`) need a throwaway host component mounted via `@vue/test-utils` since `useI18n()` only works inside an active component `setup()` — see `composables/useSession.test.ts` for the pattern.

### Deployment

`docker-compose.yml`: `backend` (uvicorn, **not** published to the host — internal network only) and `frontend` (multi-stage build → static assets served by nginx, which also reverse-proxies `/api/*` to `backend:8000`, stripping the prefix — same behavior as the Vite dev proxy, and it means the browser never sees CORS in the Docker path since it only talks to one origin). `frontend/nginx.conf` sets `client_max_body_size` to match the backend's own upload cap — nginx's 1MB default would otherwise reject large FASTA uploads before they reach the backend.
