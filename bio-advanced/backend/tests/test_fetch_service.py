from __future__ import annotations

import asyncio

import httpx
import pytest

from app.services import fetch_service
from app.services.fetch_service import FetchServiceError, _looks_like_ensembl_stable_id


@pytest.mark.parametrize(
    ("accession", "expected"),
    [
        ("ENSG00000141510", True),
        ("ensg00000141510", True),
        ("ENST00000269305", True),
        ("22:10529036-10529164", False),
        ("NC_005816.1", False),
    ],
)
def test_looks_like_ensembl_stable_id(accession: str, expected: bool):
    assert _looks_like_ensembl_stable_id(accession) is expected


def test_fetch_sequence_missing_accession_raises():
    with pytest.raises(FetchServiceError):
        asyncio.run(fetch_service.fetch_sequence("ncbi", "   ", None))


def test_fetch_sequence_ensembl_region_without_species_raises():
    with pytest.raises(FetchServiceError, match="specie"):
        asyncio.run(fetch_service.fetch_sequence("ensembl", "22:10529036-10529164", None))


def _fake_get(status_code: int, content: bytes):
    async def get(self, url, params=None):  # noqa: ARG001 - matches httpx.AsyncClient.get signature
        return httpx.Response(status_code, content=content, request=httpx.Request("GET", url))

    return get


def test_fetch_sequence_non_200_upstream_raises(monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, "get", _fake_get(404, b"not found"))
    with pytest.raises(FetchServiceError, match="404"):
        asyncio.run(fetch_service.fetch_sequence("ncbi", "BOGUS", None))


def test_fetch_sequence_non_fasta_response_raises(monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, "get", _fake_get(200, b"not a fasta file"))
    with pytest.raises(FetchServiceError, match="FASTA valida"):
        asyncio.run(fetch_service.fetch_sequence("ncbi", "NC_005816.1", None))


def test_fetch_sequence_oversized_response_raises(monkeypatch):
    monkeypatch.setattr(fetch_service.settings, "fetch_max_size_bytes", 10)
    monkeypatch.setattr(httpx.AsyncClient, "get", _fake_get(200, b">seq\n" + b"A" * 100))
    with pytest.raises(FetchServiceError, match="dimensione massima"):
        asyncio.run(fetch_service.fetch_sequence("ncbi", "NC_005816.1", None))


def test_fetch_sequence_success(monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, "get", _fake_get(200, b">NC_005816.1\nATGCATGC\n"))
    text, filename = asyncio.run(fetch_service.fetch_sequence("ncbi", "NC_005816.1", None))
    assert text.startswith(">NC_005816.1")
    assert filename == "NC_005816.1.fasta"
