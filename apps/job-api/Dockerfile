FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Build context is the monorepo root so the workspace lockfile is available.
COPY pyproject.toml uv.lock ./
COPY apps/job-api/pyproject.toml ./apps/job-api/pyproject.toml

RUN uv sync --frozen --no-dev --no-editable --package job-api

COPY apps/job-api/app ./apps/job-api/app

WORKDIR /app/apps/job-api

EXPOSE 8000

CMD ["uv", "run", "--package", "job-api", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
