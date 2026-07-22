"""Fetches a FASTA sequence directly from NCBI or Ensembl by accession, as an
alternative to file upload. The returned text is handed to
`fasta_service.parse_fasta_text`, so it goes through the exact same
cleaning/validation pipeline as an uploaded file.
"""

from __future__ import annotations

from typing import Literal

import httpx

from app.core.config import settings

NCBI_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
ENSEMBL_REST_URL = "https://rest.ensembl.org"

FetchSource = Literal["ncbi", "ensembl"]


class FetchServiceError(ValueError):
    """Raised when a sequence can't be fetched from the external source."""


def _looks_like_ensembl_stable_id(accession: str) -> bool:
    # Pragmatic heuristic (ENSG/ENST/ENSP/... and non-human ENS<species>...
    # stable IDs), not a bulletproof check — non-vertebrate Ensembl Genomes
    # divisions may use different prefixes. Good enough to pick the right
    # REST endpoint without forcing a species field when it's not needed.
    return accession.upper().startswith("ENS")


async def _get(client: httpx.AsyncClient, url: str, params: dict | None = None) -> str:
    try:
        response = await client.get(url, params=params)
    except httpx.TimeoutException as exc:
        raise FetchServiceError("Timeout durante il recupero della sequenza dal servizio esterno.") from exc
    except httpx.HTTPError as exc:
        raise FetchServiceError(f"Errore di rete durante il recupero della sequenza: {exc}") from exc

    if response.status_code != 200:
        raise FetchServiceError(
            f"Il servizio esterno ha risposto con errore {response.status_code} per l'accession richiesta."
        )

    content_length = len(response.content)
    if content_length > settings.fetch_max_size_bytes:
        raise FetchServiceError(
            f"La sequenza richiesta supera la dimensione massima consentita per il fetch "
            f"({settings.fetch_max_size_bytes // (1024 * 1024)} MB) — usa l'upload da file per sequenze più grandi."
        )

    return response.text


async def fetch_sequence(source: FetchSource, accession: str, species: str | None = None) -> tuple[str, str]:
    """Returns (fasta_text, synthesized_filename)."""
    accession = accession.strip()
    if not accession:
        raise FetchServiceError("Accession mancante.")

    async with httpx.AsyncClient(timeout=settings.fetch_timeout_seconds) as client:
        if source == "ncbi":
            params = {"db": "nuccore", "id": accession, "rettype": "fasta", "retmode": "text"}
            if settings.ncbi_api_key:
                params["api_key"] = settings.ncbi_api_key
            text = await _get(client, NCBI_EFETCH_URL, params)
        elif source == "ensembl":
            species = species.strip() if species else None
            if species:
                url = f"{ENSEMBL_REST_URL}/sequence/region/{species}/{accession}"
            elif _looks_like_ensembl_stable_id(accession):
                url = f"{ENSEMBL_REST_URL}/sequence/id/{accession}"
            else:
                raise FetchServiceError(
                    "Per una region Ensembl (non uno stable ID come 'ENSG...') è necessario indicare la specie."
                )
            text = await _get(client, url, {"content-type": "text/x-fasta"})
        else:
            raise FetchServiceError(f"Fonte non supportata: {source}")

    if not text.strip().startswith(">"):
        raise FetchServiceError("Il servizio esterno non ha restituito una sequenza FASTA valida per l'accession richiesta.")

    filename = f"{accession}.fasta"
    return text, filename


async def fetch_sequences(source: FetchSource, accessions: list[str], species: str | None = None) -> tuple[str, str]:
    """Fetches each accession in `accessions` (one request at a time, to stay
    polite to NCBI/Ensembl rate limits) and concatenates the resulting FASTA
    bodies into a single multi-record text — the same shape `fetch_sequence`
    returns for one accession, so it flows through `parse_fasta_text` and the
    existing multi-record analyze/significance pipeline unchanged."""
    if not accessions:
        raise FetchServiceError("Nessun accession specificato.")

    texts: list[str] = []
    for accession in accessions:
        try:
            text, _ = await fetch_sequence(source, accession, species)
        except FetchServiceError as exc:
            raise FetchServiceError(f"Errore nel recupero di '{accession}': {exc}") from exc
        texts.append(text.rstrip("\n"))

    filename = f"{accessions[0]}.fasta" if len(accessions) == 1 else f"{accessions[0]}_and_{len(accessions) - 1}_more.fasta"
    return "\n".join(texts) + "\n", filename
