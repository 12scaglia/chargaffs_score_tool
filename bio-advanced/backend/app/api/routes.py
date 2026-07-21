from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.config import settings
from app.domain import chargaff
from app.domain.significance import run_permutation_test
from app.schemas.analyze import (
    AnalyzeResponse,
    FetchRequest,
    HealthResponse,
    SequenceInfo,
    SequenceResult,
    SignificanceRequest,
    SignificanceResponse,
    Statistics,
    WindowData,
)
from app.services import fetch_service
from app.services.fasta_service import FastaValidationError, ParsedFasta, parse_fasta_records, parse_fasta_text
from app.services.fetch_service import FetchServiceError

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


def _build_analyze_response(parsed_records: list[ParsedFasta], window_size: int, step_size: int | None) -> AnalyzeResponse:
    """Shared by /analyze (upload) and /fetch (accession): turns cleaned
    sequences into the windowed score response. Raises HTTPException on
    empty/invalid input, following the router-level error convention."""
    non_empty = [record for record in parsed_records if record.total_length > 0]
    if not non_empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sequenza non contiene basi valide (A, T, G, C) dopo la pulizia.",
        )

    effective_step = step_size or window_size

    results: list[SequenceResult] = []
    for record in non_empty:
        try:
            windows = chargaff.compute_window_counts(record.cleaned_sequence, window_size, effective_step)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        stats = chargaff.compute_statistics(windows.score)

        results.append(
            SequenceResult(
                sequence_info=SequenceInfo(
                    sequence_id=record.sequence_id, description=record.description, total_length=record.total_length
                ),
                statistics=Statistics(
                    mean=stats.mean,
                    median=stats.median,
                    min=stats.min,
                    max=stats.max,
                    std_dev=stats.std_dev,
                    total_windows=stats.total_windows,
                ),
                data=WindowData(
                    start=windows.start.tolist(),
                    end=windows.end.tolist(),
                    A=windows.a.tolist(),
                    T=windows.t.tolist(),
                    G=windows.g.tolist(),
                    C=windows.c.tolist(),
                    score=windows.score.tolist(),
                    gc_skew=windows.gc_skew.tolist(),
                    at_skew=windows.at_skew.tolist(),
                ),
            )
        )

    return AnalyzeResponse(
        filename=non_empty[0].filename,
        window_size=window_size,
        step_size=effective_step,
        records=results,
    )


@router.post("/analyze", response_model=AnalyzeResponse, tags=["analysis"])
async def analyze(
    file: UploadFile = File(..., description="File FASTA (.fasta, .fa, .fna), anche multi-record"),
    window_size: int = Query(..., gt=0, description="Dimensione della finestra in bp"),
    step_size: int | None = Query(
        None, gt=0, description="Distanza tra l'inizio di finestre consecutive; default = window_size (nessuna sovrapposizione)"
    ),
) -> AnalyzeResponse:
    try:
        parsed_records = await parse_fasta_records(file)
    except FastaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    finally:
        await file.close()

    return _build_analyze_response(parsed_records, window_size, step_size)


@router.post("/fetch", response_model=AnalyzeResponse, tags=["analysis"])
async def fetch_and_analyze(payload: FetchRequest) -> AnalyzeResponse:
    try:
        fasta_text, filename = await fetch_service.fetch_sequence(payload.source, payload.accession, payload.species)
    except FetchServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        parsed_records = parse_fasta_text(fasta_text, filename)
    except FastaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if payload.whole_sequence:
        lengths = [record.total_length for record in parsed_records if record.total_length > 0]
        whole_window_size = max(lengths) if lengths else payload.window_size
        return _build_analyze_response(parsed_records, whole_window_size, None)

    return _build_analyze_response(parsed_records, payload.window_size, payload.step_size)


def _build_significance_response(
    parsed_records: list[ParsedFasta], record_index: int, window_size: int, step_size: int | None, n_permutations: int
) -> SignificanceResponse:
    non_empty = [record for record in parsed_records if record.total_length > 0]
    if not non_empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sequenza non contiene basi valide (A, T, G, C) dopo la pulizia.",
        )
    if record_index < 0 or record_index >= len(non_empty):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="record_index non valido.")

    record = non_empty[record_index]
    if record.total_length > settings.significance_max_sequence_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "La sequenza è troppo lunga per il test di permutazione "
                f"(limite: {settings.significance_max_sequence_length:,} bp); usa l'upload/analisi normale."
            ),
        )

    effective_step = step_size or window_size
    try:
        result = run_permutation_test(record.cleaned_sequence, window_size, effective_step, n_permutations)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return SignificanceResponse(
        observed_mean_score=result.observed_mean_score,
        permuted_mean=result.permuted_mean,
        permuted_std=result.permuted_std,
        z_score=result.z_score,
        p_value=result.p_value,
        n_permutations=result.n_permutations,
        is_significant=result.p_value < 0.05,
    )


@router.post("/significance", response_model=SignificanceResponse, tags=["analysis"])
async def significance(
    file: UploadFile = File(..., description="File FASTA (.fasta, .fa, .fna), anche multi-record"),
    window_size: int = Query(..., gt=0, description="Dimensione della finestra in bp"),
    step_size: int | None = Query(None, gt=0),
    n_permutations: int = Query(100, ge=10, le=500),
    record_index: int = Query(0, ge=0, description="Indice del record da testare in un FASTA multi-sequenza"),
) -> SignificanceResponse:
    try:
        parsed_records = await parse_fasta_records(file)
    except FastaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    finally:
        await file.close()

    return _build_significance_response(parsed_records, record_index, window_size, step_size, n_permutations)


@router.post("/fetch/significance", response_model=SignificanceResponse, tags=["analysis"])
async def fetch_significance(payload: SignificanceRequest) -> SignificanceResponse:
    try:
        fasta_text, filename = await fetch_service.fetch_sequence(payload.source, payload.accession, payload.species)
    except FetchServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        parsed_records = parse_fasta_text(fasta_text, filename)
    except FastaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return _build_significance_response(parsed_records, 0, payload.window_size, payload.step_size, payload.n_permutations)
