"""Pydantic response models for the /analyze endpoint.

`WindowData` intentionally follows a Structure-of-Arrays layout (parallel
lists) rather than Array-of-Objects, per the API data contract, so that
payloads with millions of windows stay compact and fast to (de)serialize.

A single upload may contain several FASTA records (chromosomes/contigs), so
the response carries one `SequenceResult` per record under `records`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


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


class FetchRequest(BaseModel):
    source: Literal["ncbi", "ensembl"]
    accession: str = Field(min_length=1, max_length=200)
    species: str | None = None
    window_size: int = Field(gt=0)
    step_size: int | None = Field(default=None, gt=0)


class SignificanceRequest(BaseModel):
    """Fetch-by-accession variant of the significance test: re-fetches (nothing
    is cached server-side) then runs the permutation test on the same source."""

    source: Literal["ncbi", "ensembl"]
    accession: str = Field(min_length=1, max_length=200)
    species: str | None = None
    window_size: int = Field(gt=0)
    step_size: int | None = Field(default=None, gt=0)
    n_permutations: int = Field(default=100, ge=10, le=500)


class SignificanceResponse(BaseModel):
    observed_mean_score: float
    permuted_mean: float
    permuted_std: float
    z_score: float
    p_value: float
    n_permutations: int
    is_significant: bool
