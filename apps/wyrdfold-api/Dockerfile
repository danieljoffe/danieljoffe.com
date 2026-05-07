FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update \
    && apt-get install -y --no-install-recommends pandoc \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home-dir /app --shell /sbin/nologin app

WORKDIR /app

# Build context is the monorepo root so the workspace lockfile is available.
COPY pyproject.toml uv.lock ./
COPY apps/wyrdfold-api/pyproject.toml ./apps/wyrdfold-api/pyproject.toml

RUN uv sync --frozen --no-dev --no-editable --package wyrdfold-api

COPY apps/wyrdfold-api/app ./apps/wyrdfold-api/app

RUN chown -R app:app /app

USER app

WORKDIR /app/apps/wyrdfold-api

ENV PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8001\")}/health', timeout=3).status == 200 else 1)"

ENV FORWARDED_ALLOW_IPS="*"

CMD ["sh", "-c", "exec uv run --package wyrdfold-api uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips=${FORWARDED_ALLOW_IPS}"]
