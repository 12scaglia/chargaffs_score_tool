# syntax=docker/dockerfile:1
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so this layer is cached and reused as long as
# requirements.txt doesn't change — app code changes far more often.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code only (tests/ is intentionally not copied: CI runs pytest
# directly on the runner, not inside the built image).
COPY app ./app

# Runs as a non-root user: this container only serves HTTP over uvicorn and
# needs no elevated privileges.
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
