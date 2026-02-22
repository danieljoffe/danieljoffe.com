# Build the docker image with `npx nx docker:build @danieljoffe.com/audit-scan-service`.
# Run the container with `docker run -p 3001:3001 audit-scan-service`.

# Stage 1: Build
FROM docker.io/node:lts-alpine AS builder

WORKDIR /app

# Copy workspace root files needed for install + build
COPY package.json yarn.lock ./
COPY apps/audit-scan-service/package.json apps/audit-scan-service/package.json
COPY libs/shared/audit/package.json libs/shared/audit/package.json

RUN yarn install --frozen-lockfile

# Copy source code
COPY nx.json tsconfig.base.json ./
COPY apps/audit-scan-service apps/audit-scan-service
COPY libs/shared/audit libs/shared/audit

RUN npx nx build audit-scan-service --configuration=production

# Stage 2: Runtime
FROM docker.io/node:20-slim

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

# Copy built output (includes bundled workspace code + package.json + lockfile)
COPY --from=builder /app/apps/audit-scan-service/dist .

RUN npm install --omit=dev

# Run as non-root user
RUN groupadd -r scanner && useradd -r -g scanner scanner
USER scanner

EXPOSE 3001

CMD [ "node", "main.js" ]
