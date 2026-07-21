from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import fetch_service

client = TestClient(app)

SAMPLE_FASTA = b">seq1\n" + b"ATGCATGCATGCATGCATGCATGCATGCATGC\n" * 20


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_valid_upload():
    files = {"file": ("sample.fasta", io.BytesIO(SAMPLE_FASTA), "text/plain")}
    response = client.post("/analyze", files=files, params={"window_size": 100})
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "sample.fasta"
    assert body["records"][0]["sequence_info"]["sequence_id"] == "seq1"
    assert len(body["records"][0]["data"]["score"]) > 0


def test_analyze_invalid_extension_returns_400():
    files = {"file": ("sample.txt", io.BytesIO(SAMPLE_FASTA), "text/plain")}
    response = client.post("/analyze", files=files, params={"window_size": 100})
    assert response.status_code == 400


def test_fetch_endpoint_success(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        return SAMPLE_FASTA.decode("ascii"), f"{accession}.fasta"

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post("/fetch", json={"source": "ncbi", "accession": "NC_TEST", "window_size": 100})
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "NC_TEST.fasta"
    assert body["records"][0]["sequence_info"]["sequence_id"] == "seq1"


def test_fetch_endpoint_propagates_fetch_service_error_as_400(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        raise fetch_service.FetchServiceError("accession non trovata")

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post("/fetch", json={"source": "ncbi", "accession": "BOGUS", "window_size": 100})
    assert response.status_code == 400
    assert "accession non trovata" in response.json()["detail"]


def test_fetch_endpoint_rejects_invalid_source():
    response = client.post("/fetch", json={"source": "invalid", "accession": "X", "window_size": 100})
    assert response.status_code == 422


def test_significance_endpoint_valid():
    files = {"file": ("sample.fasta", io.BytesIO(SAMPLE_FASTA), "text/plain")}
    response = client.post(
        "/significance", files=files, params={"window_size": 100, "n_permutations": 10}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["n_permutations"] == 10
    assert 0.0 <= body["p_value"] <= 1.0
    assert isinstance(body["is_significant"], bool)


def test_significance_endpoint_too_long_sequence_returns_400(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "significance_max_sequence_length", 10)
    files = {"file": ("sample.fasta", io.BytesIO(SAMPLE_FASTA), "text/plain")}
    response = client.post(
        "/significance", files=files, params={"window_size": 100, "n_permutations": 10}
    )
    assert response.status_code == 400


def test_fetch_significance_endpoint_success(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        return SAMPLE_FASTA.decode("ascii"), f"{accession}.fasta"

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post(
        "/fetch/significance",
        json={"source": "ncbi", "accession": "NC_TEST", "window_size": 100, "n_permutations": 10},
    )
    assert response.status_code == 200
    assert response.json()["n_permutations"] == 10
