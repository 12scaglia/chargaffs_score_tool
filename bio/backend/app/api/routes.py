from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.domain import chargaff
from app.schemas.analyze import AnalyzeResponse, HealthResponse, SequenceInfo, Statistics, WindowData
from app.services.fasta_service import FastaValidationError, parse_fasta_upload

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/analyze", response_model=AnalyzeResponse, tags=["analysis"])
async def analyze(
    file: UploadFile = File(..., description="File FASTA (.fasta, .fa, .fna)"),
    window_size: int = Query(..., gt=0, description="Dimensione della finestra in bp"),
) -> AnalyzeResponse:
    try:
        parsed = await parse_fasta_upload(file)
    except FastaValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    finally:
        await file.close()

    if parsed.total_length == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sequenza non contiene basi valide (A, T, G, C) dopo la pulizia.",
        )

    try:
        windows = chargaff.compute_window_counts(parsed.cleaned_sequence, window_size)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    stats = chargaff.compute_statistics(windows.score)

    return AnalyzeResponse(
        sequence_info=SequenceInfo(
            filename=parsed.filename,
            sequence_id=parsed.sequence_id,
            total_length=parsed.total_length,
        ),
        window_size=window_size,
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
        ),
    )
