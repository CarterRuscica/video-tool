FROM python:3.11-slim

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml .
RUN pip install --no-cache-dir .

COPY backend/src ./src

EXPOSE 8765

CMD ["python", "-m", "src.main", "--mode", "server", "--port", "8765"]
