"""Pydantic response models for the /analyze endpoint.

`WindowData` intentionally follows a Structure-of-Arrays layout (parallel
lists) rather than Array-of-Objects, per the API data contract, so that
payloads with millions of windows stay compact and fast to (de)serialize.

A single upload may contain several FASTA records (chromosomes/contigs), so
the response carries one `SequenceResult` per record under `records`.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SequenceInfo(BaseModel):
    sequence_id: str
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
