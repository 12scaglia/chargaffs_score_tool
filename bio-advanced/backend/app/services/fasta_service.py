"""FASTA upload parsing, validation and cleaning.

Reads directly from the UploadFile's underlying spooled file (which
Starlette itself spills to disk beyond its in-memory threshold) through
Biopython's SeqIO, so the raw multipart body is never additionally
buffered into a second Python `bytes`/`str` object here. The resulting
sequence is cleaned and converted to a NumPy uint8 array in chunks to
avoid extra full-length intermediate copies.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from Bio import SeqIO
from fastapi import UploadFile

from app.core.config import settings

VALID_BASES = frozenset(b"ATGC")
# Maps every byte to itself if it's A/T/G/C, otherwise to 0 (used as a
# drop sentinel — FASTA sequence bytes are never legitimately \x00).
_CLEAN_TABLE = bytes(byte if byte in VALID_BASES else 0 for byte in range(256))


@dataclass(frozen=True, slots=True)
class ParsedFasta:
    sequence_id: str
    filename: str
    total_length: int
    cleaned_sequence: np.ndarray  # uint8 ASCII codes, only A/T/G/C


class FastaValidationError(ValueError):
    """Raised when the uploaded file is not a valid/supported FASTA file."""


def _validate_extension(filename: str | None) -> None:
    if not filename or not filename.lower().endswith(settings.allowed_extensions):
        raise FastaValidationError(
            f"Formato file non supportato. Estensioni ammesse: {', '.join(settings.allowed_extensions)}"
        )


def _clean_to_uint8(raw_ascii: bytes, chunk_size: int) -> np.ndarray:
    """Uppercase is assumed already applied. Strips anything that is not
    A/T/G/C, processing in chunks to bound peak intermediate memory."""
    chunks: list[np.ndarray] = []
    for offset in range(0, len(raw_ascii), chunk_size):
        piece = raw_ascii[offset : offset + chunk_size].translate(_CLEAN_TABLE)
        arr = np.frombuffer(piece, dtype=np.uint8)
        chunks.append(arr[arr != 0])
    if not chunks:
        return np.array([], dtype=np.uint8)
    return np.concatenate(chunks)


def _build_parsed(records: list, filename: str) -> list[ParsedFasta]:
    """Shared tail of both parsing entry points: id extraction + cleaning to
    uint8. `records` are Biopython SeqRecord objects, already parsed from
    either an uploaded file or fetched FASTA text."""
    parsed: list[ParsedFasta] = []
    for record in records:
        sequence_id = record.id
        raw_ascii = str(record.seq).upper().encode("ascii", errors="ignore")
        cleaned_sequence = _clean_to_uint8(raw_ascii, settings.read_chunk_size_bytes)
        del raw_ascii
        parsed.append(
            ParsedFasta(
                sequence_id=sequence_id,
                filename=filename,
                total_length=int(cleaned_sequence.shape[0]),
                cleaned_sequence=cleaned_sequence,
            )
        )
    return parsed


async def parse_fasta_records(file: UploadFile) -> list[ParsedFasta]:
    """Validate, parse (via Biopython SeqIO) and clean every record of an
    uploaded (possibly multi-FASTA) file — one chromosome/contig per record.
    """
    _validate_extension(file.filename)

    if file.size is not None and file.size > settings.max_upload_size_bytes:
        raise FastaValidationError("Il file supera la dimensione massima consentita.")

    await file.seek(0)
    text_stream = io.TextIOWrapper(file.file, encoding="utf-8", errors="ignore")
    try:
        records = list(SeqIO.parse(text_stream, "fasta"))
    finally:
        text_stream.detach()  # keep the underlying UploadFile usable/closable

    if not records:
        raise FastaValidationError("Nessuna sequenza FASTA valida trovata nel file.")

    return _build_parsed(records, file.filename or "unknown")


def parse_fasta_text(text: str, filename: str) -> list[ParsedFasta]:
    """Same cleaning/validation as parse_fasta_records, for FASTA text that
    was fetched from an external source (NCBI/Ensembl) instead of uploaded —
    keeps the fetch-by-accession path on the exact same pipeline as upload."""
    if len(text.encode("utf-8")) > settings.max_upload_size_bytes:
        raise FastaValidationError("Il testo scaricato supera la dimensione massima consentita.")

    records = list(SeqIO.parse(io.StringIO(text), "fasta"))
    if not records:
        raise FastaValidationError("Nessuna sequenza FASTA valida trovata nella risposta del servizio esterno.")

    return _build_parsed(records, filename)
