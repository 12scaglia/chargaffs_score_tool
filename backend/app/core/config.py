from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Chargaff Genome Analyzer"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    allowed_extensions: tuple[str, ...] = (".fasta", ".fa", ".fna")
    max_upload_size_bytes: int = 500 * 1024 * 1024  # 500 MB
    read_chunk_size_bytes: int = 4 * 1024 * 1024  # 4 MB

    # Fetch-by-accession (NCBI/Ensembl)
    ncbi_api_key: str | None = None
    fetch_timeout_seconds: float = 30.0
    # Cap well below max_upload_size_bytes: a synchronous fetch of a whole
    # chromosome (~250MB) would tie up a stateless worker for too long. This
    # tool targets bacterial/viral/fungal genome scale (see chargaff.py); for
    # anything bigger, use file upload instead.
    fetch_max_size_bytes: int = 50 * 1024 * 1024  # 50 MB
    # A pasted gene/accession list is fetched sequentially (one request per
    # accession, to stay polite to NCBI/Ensembl rate limits), so this also
    # bounds worst-case request latency.
    fetch_max_accessions: int = 50

    # Permutation-test significance endpoint
    significance_max_sequence_length: int = 5_000_000  # 5 Mb

    class Config:
        env_prefix = "CGA_"


settings = Settings()
