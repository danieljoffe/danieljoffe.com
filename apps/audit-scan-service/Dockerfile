# Build the docker image with `pnpm exec nx docker:build @danieljoffe.com/audit-scan-service`.
# Run the container with `docker run -p 3001:3001 audit-scan-service`.

# Stage 1: Build
FROM docker.io/node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files needed for install + build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/audit-scan-service/package.json apps/audit-scan-service/package.json
COPY libs/shared/audit/package.json libs/shared/audit/package.json

RUN pnpm install --frozen-lockfile

# Copy source code
COPY nx.json tsconfig.base.json ./
COPY apps/audit-scan-service apps/audit-scan-service
COPY libs/shared/audit libs/shared/audit

RUN pnpm exec nx build audit-scan-service --configuration=production

# Stage 2: Runtime
FROM docker.io/node:24-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built output (includes bundled workspace code + package.json + lockfile)
COPY --from=builder /app/apps/audit-scan-service/dist .

RUN pnpm install --prod --frozen-lockfile

# Run as non-root user with a writable home dir for Chromium temp/crash files
RUN groupadd -r scanner && useradd -r -g scanner -m scanner \
    && mkdir -p /home/scanner/.cache /tmp/.chromium \
    && chown -R scanner:scanner /home/scanner /tmp/.chromium
USER scanner

EXPOSE 3001

CMD [ "node", "main.js" ]
