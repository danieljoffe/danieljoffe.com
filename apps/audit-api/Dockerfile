FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Build context is the monorepo root so the workspace lockfile is available.
COPY pyproject.toml uv.lock ./
COPY apps/audit-api/pyproject.toml ./apps/audit-api/pyproject.toml

RUN uv sync --frozen --no-dev --no-editable --package audit-api

COPY apps/audit-api/app ./apps/audit-api/app

WORKDIR /app/apps/audit-api

EXPOSE 8001

CMD ["uv", "run", "--package", "audit-api", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
