FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home-dir /app --shell /sbin/nologin app

WORKDIR /app

# Build context is the monorepo root so the workspace lockfile is available.
COPY pyproject.toml uv.lock ./
COPY apps/audit-api/pyproject.toml ./apps/audit-api/pyproject.toml

RUN uv sync --frozen --no-dev --no-editable --package audit-api

COPY apps/audit-api/app ./apps/audit-api/app

RUN chown -R app:app /app

USER app

WORKDIR /app/apps/audit-api

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8001/health', timeout=3).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--proxy-headers", "--forwarded-allow-ips=*"]
