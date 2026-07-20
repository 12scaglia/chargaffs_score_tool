from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.domain import chargaff
from app.schemas.analyze import AnalyzeResponse, HealthResponse, SequenceInfo, SequenceResult, Statistics, WindowData
from app.services.fasta_service import FastaValidationError, parse_fasta_records

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


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
                sequence_info=SequenceInfo(sequence_id=record.sequence_id, total_length=record.total_length),
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
