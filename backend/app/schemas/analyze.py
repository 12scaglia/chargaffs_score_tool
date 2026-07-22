"""Pydantic response models for the /analyze endpoint.

`WindowData` intentionally follows a Structure-of-Arrays layout (parallel
lists) rather than Array-of-Objects, per the API data contract, so that
payloads with millions of windows stay compact and fast to (de)serialize.

A single upload may contain several FASTA records (chromosomes/contigs), so
the response carries one `SequenceResult` per record under `records`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.config import settings


class SequenceInfo(BaseModel):
    sequence_id: str
    description: str = ""
    total_length: int


class Statistics(BaseModel):
    mean: float
    median: float
    min: float
    max: float
    std_dev: float
    total_windows: int


class WindowData(BaseModel):
    start: list[int]
    end: list[int]
    A: list[int]
    T: list[int]
    G: list[int]
    C: list[int]
    score: list[float]
    gc_skew: list[float]
    at_skew: list[float]


class SequenceResult(BaseModel):
    sequence_info: SequenceInfo
    statistics: Statistics
    data: WindowData


class AnalyzeResponse(BaseModel):
    filename: str
    window_size: int = Field(gt=0)
    step_size: int = Field(gt=0)
    records: list[SequenceResult]


class HealthResponse(BaseModel):
    status: str = "ok"


def _clean_accessions(value: list[str]) -> list[str]:
    """Trims whitespace, drops blank entries, dedupes while preserving order —
    shared by FetchRequest/SignificanceRequest so a pasted gene list behaves
    the same way (extra blank lines, stray commas, repeated IDs) regardless
    of which endpoint receives it."""
    seen: dict[str, None] = {}
    for raw in value:
        accession = raw.strip()
        if not accession:
            continue
        if len(accession) > 200:
            raise ValueError(f"Accession troppo lungo: '{accession[:40]}...'")
        seen.setdefault(accession, None)
    if not seen:
        raise ValueError("Nessun accession valido nella lista.")
    return list(seen.keys())


class FetchRequest(BaseModel):
    source: Literal["ncbi", "ensembl"]
    accessions: list[str] = Field(min_length=1, max_length=settings.fetch_max_accessions)
    species: str | None = None
    window_size: int = Field(gt=0)
    step_size: int | None = Field(default=None, gt=0)
    # When true, window_size/step_size above are ignored and a single window
    # spanning the whole fetched sequence is used instead — one PR2 score for
    # the entire gene/record, rather than per-window scores across it.
    whole_sequence: bool = False

    _clean_accessions = field_validator("accessions")(_clean_accessions)


class SignificanceRequest(BaseModel):
    """Fetch-by-accession variant of the significance test: re-fetches (nothing
    is cached server-side) then runs the permutation test on the same source."""

    source: Literal["ncbi", "ensembl"]
    accessions: list[str] = Field(min_length=1, max_length=settings.fetch_max_accessions)
    species: str | None = None
    window_size: int = Field(gt=0)
    step_size: int | None = Field(default=None, gt=0)
    n_permutations: int = Field(default=100, ge=10, le=500)
    # Which fetched record (in accessions order) to run the permutation test
    # against — mirrors /significance's record_index for multi-record uploads.
    record_index: int = Field(default=0, ge=0)

    _clean_accessions = field_validator("accessions")(_clean_accessions)


class SignificanceResponse(BaseModel):
    observed_mean_score: float
    permuted_mean: float
    permuted_std: float
    z_score: float
    p_value: float
    n_permutations: int
    is_significant: bool
