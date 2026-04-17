FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS base

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home-dir /app --shell /sbin/nologin app

# System deps: Chromium (for Lighthouse + Playwright), Node (for Lighthouse CLI).
# The Lighthouse CLI bundles puppeteer which expects Chrome/Chromium.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        chromium \
        fonts-liberation \
        curl \
        gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Lighthouse CLI + axe-core globally
RUN npm install -g lighthouse@12.8.0 \
    && mkdir -p /app/vendor \
    && npm pack axe-core@4.11.3 --pack-destination=/tmp \
    && tar -xzf /tmp/axe-core-*.tgz -C /tmp \
    && cp /tmp/package/axe.min.js /app/vendor/axe.min.js \
    && rm -rf /tmp/package /tmp/axe-core-*.tgz

WORKDIR /app

# Build context is the monorepo root so the workspace lockfile is available.
COPY pyproject.toml uv.lock ./
COPY apps/audit-api/pyproject.toml ./apps/audit-api/pyproject.toml

RUN uv sync --frozen --no-dev --no-editable --package audit-api

# Playwright Chromium install (used for axe injection + screenshots)
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
RUN /app/.venv/bin/python -m playwright install chromium --with-deps

COPY apps/audit-api/app ./apps/audit-api/app

RUN chown -R app:app /app

USER app

WORKDIR /app/apps/audit-api

ENV PATH="/app/.venv/bin:$PATH" \
    LIGHTHOUSE_BIN=lighthouse \
    AXE_SCRIPT_PATH=/app/vendor/axe.min.js \
    PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8001\")}/health', timeout=3).status == 200 else 1)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips=*"]
