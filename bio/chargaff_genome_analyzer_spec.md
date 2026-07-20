# Specifica Tecnica – Chargaff Genome Analyzer

**Ruolo e Contesto per l'Agente IA:** Sei un Senior Full-Stack Developer e Bioinformatico. Il tuo compito è sviluppare un'applicazione web completa per l'analisi del genoma basata sulle specifiche seguenti. Scrivi codice pulito, modulare, fortemente tipizzato e pronto per la produzione.

---

## 1. Obiettivo del progetto
Realizzare una web application per l'analisi della Seconda Legge di Chargaff (intra-strand parity) su sequenze di DNA in formato FASTA.
L'applicazione dovrà permettere all'utente di caricare file FASTA, suddividere la sequenza in finestre (window size) definite, calcolare il punteggio di parità per ogni segmento e visualizzare i risultati tramite heatmap interattive, grafici e tabelle. L'interfaccia deve gestire fluidamente l'esplorazione di dataset genomici (centinaia di MB).

## 2. Stack Tecnologico
*   **Frontend:** Vue 3 (Composition API, `<script setup>`), Vite, Pinia (State Management), Vue Router, Axios, TailwindCSS, Apache ECharts (con rendering Canvas/WebGL per performance).
*   **Backend:** Python 3.12+, FastAPI, Biopython (parsing FASTA), NumPy/Pandas (calcolo vettoriale), Uvicorn.
*   **Linguaggi:** TypeScript (Frontend), Python con Type Hints strict (Backend).

## 3. Architettura
`Frontend (Vue) -> REST API -> FastAPI -> Chargaff Engine (NumPy/Biopython)`
*   Il frontend è puramente presentazionale.
*   La logica biologica e le aggregazioni dati avvengono nel backend.

## 4. Funzionalità Richieste

### 4.1 Upload FASTA
*   **Formati supportati:** `.fasta`, `.fa`, `.fna`
*   Validazione file, lettura tramite `Biopython.SeqIO`.
*   Pulizia: rimozione newline, conversione uppercase, mascheramento o ignoramento dei caratteri non standard (tutto ciò che non è A, T, G, C).
*   Output info file: Nome file, Lunghezza totale, ID Sequenza.

### 4.2 Impostazione della finestra (Window Size)
*   **Preset predefiniti:** 50, 100, 200, 500, 1000, 5000, 10000, 25000 bp.
*   **Custom:** Input numerico positivo maggiore di zero.
*   Il backend suddivide la sequenza in finestre sequenziali senza overlap. L'ultima finestra può essere più corta se non copre interamente la size.

### 4.3 Calcolo della Seconda Legge di Chargaff
⚠️ **Logica Core:** Implementare un modulo `chargaff.py` isolato.
Per ogni finestra, contare le occorrenze assolute di A, T, G, C.
Calcolare il **Chargaff Parity Score** usando la seguente formula (dove $N$ è la somma di $A+T+G+C$ nella finestra):

`Score = 1 - ( |A - T| + |G - C| ) / N`

*(Nota per l'agente: Un punteggio di 1 indica perfetta parità, < 1 indica deviazione).*

### 4.4 Statistiche Globali
Calcolare sull'intero set di finestre: Numero di segmenti, Score medio, Minimo, Massimo, Mediana, Deviazione standard.

## 5. Interfaccia e Dashboard
Layout responsive con:
*   **Sidebar Sinistra:** Upload Component, Selezione Window Size, Bottone "Analizza".
*   **Centro (Dashboard):** 
    1. Card Statistiche Globali.
    2. Grafico Andamento Score.
    3. Heatmap.
    4. Tabella Risultati.
*   **Sidebar Destra:** Dettagli del segmento selezionato (A, T, G, C counts, %GC, Score).

## 6. Visualizzazioni (Apache ECharts)
### 6.1 Heatmap
*   Rappresenta ogni segmento. Scala colori continua: `Rosso (Score Basso) -> Giallo -> Verde (Score Alto = 1)`.
*   **Tooltip:** Mostra Index, Start, End, Score esatto.
*   **Interattività:** Supporto a DataZoom (Pan/Zoom) e click per evidenziare il segmento e aggiornare la Sidebar Destra.

### 6.2 Grafico Andamento Score
*   Line chart. Asse X: Indice Segmento (o Start bp). Asse Y: Chargaff Score.
*   Sincronizzato con il DataZoom della Heatmap (usando ECharts `connect`).

## 7. Tabella e Top Segmenti
*   **Tabella Completa:** Colonne: Rank/ID, Start, End, A, T, G, C, GC%, Score. Virtualizzata se i record > 1000.
*   **Pannello Top Segmenti:** Bottoni rapidi per filtrare (Top 10, Top 50 peggiori/migliori). Click sulla riga aggiorna la heatmap e la sidebar.

## 8. Esportazione
Export dei risultati della tabella in formato `.csv` e `.json` lato frontend.

## 9. API Backend e Payload Data Contract
Per garantire performance con milioni di segmenti, l'API DEVE usare una struttura **Structure of Arrays (SoA)** e non Array of Objects.

**POST /analyze**
*   **Input:** `multipart/form-data` (file) e query param `window_size`.
*   **Output (JSON):**
```json
{
  "statistics": { "mean": 0.95, "median": 0.96, "min": 0.8, "max": 0.99, "std_dev": 0.02, "total_windows": 1000 },
  "data": {
    "start": [1, 51, 101],
    "end": [50, 100, 150],
    "A": [15, 12, 14],
    "T": [14, 13, 11],
    "G": [10, 12, 12],
    "C": [11, 13, 13],
    "score": [0.96, 0.98, 0.95]
  }
}
```

**GET /health**
*   Ritorna `{"status": "ok"}`

## 10. Requisiti di Performance e Architettura del Codice
*   **Memoria:** Usare iteratori di Biopython e vettorizzazione in NumPy per calcolare i conteggi scorrendo il file a chunk, evitando di caricare stringhe di 300MB interamente in RAM.
*   **Frontend Performance:** ECharts deve essere configurato con `renderer: 'canvas'`. Se le finestre superano le 50.000 unità, attivare il `large: true` nelle series di ECharts per ottimizzare il rendering.
*   **SOLID & Clean Code:** Netta separazione nel backend tra router (FastAPI), logica di dominio (`chargaff.py`), e layer dati. Tipizzazione rigorosa con Pydantic. Nel frontend, usare i Composables per isolare la logica UI dalle chiamate API.
