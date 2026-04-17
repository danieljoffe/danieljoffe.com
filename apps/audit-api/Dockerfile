# Official Playwright image ships Chromium + all required system libs, vetted
# by the Playwright team. The previous uv+bookworm base with apt-installed
# chromium was SIGSEGV-ing on Playwright's Chromium launch in Railway.
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy AS base

# uv for Python dependency management (not present in the Playwright image).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home-dir /app --shell /sbin/nologin app

# Node.js (for Lighthouse CLI). The playwright/python image ships Python-only;
# Node only comes with the playwright (node) variant. Install via NodeSource.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Lighthouse CLI + axe-core.
RUN npm install -g lighthouse@12.8.0 \
    && mkdir -p /app/vendor \
    && npm pack axe-core@4.11.3 --pack-destination=/tmp \
    && tar -xzf /tmp/axe-core-*.tgz -C /tmp \
    && cp /tmp/package/axe.min.js /app/vendor/axe.min.js \
    && rm -rf /tmp/package /tmp/axe-core-*.tgz

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY apps/audit-api/pyproject.toml ./apps/audit-api/pyproject.toml

# Pin Python 3.11. Without this, uv picks the newest available (3.14 at time
# of writing), which has no prebuilt wheels for supabase's pyiceberg dep and
# would trigger a source build that requires a C toolchain we don't install.
RUN uv python install 3.11 \
    && uv sync --frozen --no-dev --no-editable --package audit-api --python 3.11

# Playwright browsers are pre-installed at /ms-playwright. No re-download needed.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Lighthouse's chrome-launcher follows CHROME_PATH. Point it at Playwright's
# Chromium so both scans use the same validated binary.
RUN CHROME_BIN="$(ls -1d /ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)" \
    && test -n "$CHROME_BIN" \
    && ln -sf "$CHROME_BIN" /usr/local/bin/chrome

COPY apps/audit-api/app ./apps/audit-api/app

RUN chown -R app:app /app

USER app

WORKDIR /app/apps/audit-api

ENV PATH="/app/.venv/bin:$PATH" \
    LIGHTHOUSE_BIN=lighthouse \
    CHROME_PATH=/usr/local/bin/chrome \
    AXE_SCRIPT_PATH=/app/vendor/axe.min.js \
    PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8001\")}/health', timeout=3).status == 200 else 1)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips=*"]
