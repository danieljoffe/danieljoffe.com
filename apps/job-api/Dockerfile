FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home-dir /app --shell /sbin/nologin app

WORKDIR /app

# Build context is the monorepo root so the workspace lockfile is available.
COPY pyproject.toml uv.lock ./
COPY apps/job-api/pyproject.toml ./apps/job-api/pyproject.toml

RUN uv sync --frozen --no-dev --no-editable --package job-api

COPY apps/job-api/app ./apps/job-api/app

RUN chown -R app:app /app

USER app

WORKDIR /app/apps/job-api

ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/health', timeout=3).status == 200 else 1)"

ENV FORWARDED_ALLOW_IPS="*"

CMD ["sh", "-c", "exec uv run --package job-api uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips=${FORWARDED_ALLOW_IPS}"]
