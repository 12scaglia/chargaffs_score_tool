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

    class Config:
        env_prefix = "CGA_"


settings = Settings()
