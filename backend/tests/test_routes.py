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

    response = client.post("/fetch", json={"source": "ncbi", "accessions": ["NC_TEST"], "window_size": 100})
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "NC_TEST.fasta"
    assert body["records"][0]["sequence_info"]["sequence_id"] == "seq1"


def test_fetch_endpoint_multiple_accessions_returns_one_record_each(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        return f">{accession}\nATGCATGCATGCATGCATGC\n", f"{accession}.fasta"

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post(
        "/fetch",
        json={"source": "ncbi", "accessions": ["GENE_A", "GENE_B", "GENE_A"], "window_size": 100},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "GENE_A_and_1_more.fasta"
    ids = [record["sequence_info"]["sequence_id"] for record in body["records"]]
    assert ids == ["GENE_A", "GENE_B"]  # exact duplicate accession deduped


def test_fetch_endpoint_whole_sequence_returns_single_window(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        return SAMPLE_FASTA.decode("ascii"), f"{accession}.fasta"

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post(
        "/fetch",
        json={"source": "ncbi", "accessions": ["NC_TEST"], "window_size": 100, "whole_sequence": True},
    )
    assert response.status_code == 200
    body = response.json()
    record = body["records"][0]
    total_length = record["sequence_info"]["total_length"]
    assert body["window_size"] == total_length
    assert len(record["data"]["score"]) == 1
    assert record["data"]["start"] == [1]
    assert record["data"]["end"] == [total_length]


def test_fetch_endpoint_propagates_fetch_service_error_as_400(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        raise fetch_service.FetchServiceError("accession non trovata")

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post("/fetch", json={"source": "ncbi", "accessions": ["BOGUS"], "window_size": 100})
    assert response.status_code == 400
    assert "accession non trovata" in response.json()["detail"]


def test_fetch_endpoint_rejects_invalid_source():
    response = client.post("/fetch", json={"source": "invalid", "accessions": ["X"], "window_size": 100})
    assert response.status_code == 422


def test_fetch_endpoint_rejects_empty_accession_list():
    response = client.post("/fetch", json={"source": "ncbi", "accessions": [], "window_size": 100})
    assert response.status_code == 422


def test_fetch_endpoint_rejects_blank_only_accession_list():
    response = client.post("/fetch", json={"source": "ncbi", "accessions": ["  ", ""], "window_size": 100})
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
        json={"source": "ncbi", "accessions": ["NC_TEST"], "window_size": 100, "n_permutations": 10},
    )
    assert response.status_code == 200
    assert response.json()["n_permutations"] == 10


def test_fetch_significance_endpoint_uses_record_index_for_gene_list(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        return f">{accession}\n" + "ATGCATGCATGCATGCATGCATGCATGCATGC\n" * 20, f"{accession}.fasta"

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post(
        "/fetch/significance",
        json={
            "source": "ncbi",
            "accessions": ["GENE_A", "GENE_B"],
            "window_size": 100,
            "n_permutations": 10,
            "record_index": 1,
        },
    )
    assert response.status_code == 200
    assert response.json()["n_permutations"] == 10


def test_fetch_significance_endpoint_invalid_record_index_returns_400(monkeypatch):
    async def fake_fetch_sequence(source, accession, species=None):
        return f">{accession}\n" + "ATGCATGCATGCATGCATGCATGCATGCATGC\n" * 20, f"{accession}.fasta"

    monkeypatch.setattr(fetch_service, "fetch_sequence", fake_fetch_sequence)

    response = client.post(
        "/fetch/significance",
        json={"source": "ncbi", "accessions": ["GENE_A"], "window_size": 100, "n_permutations": 10, "record_index": 5},
    )
    assert response.status_code == 400
