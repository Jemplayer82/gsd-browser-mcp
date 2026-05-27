FROM node:22-trixie-slim

# Install Chromium and required system libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    chromium-sandbox \
    curl \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    && rm -rf /var/lib/apt/lists/*

# Install gsd-browser binary
RUN curl -fsSL https://github.com/gsd-build/gsd-browser/releases/download/v0.1.25/gsd-browser-linux-x64 \
    -o /usr/local/bin/gsd-browser && chmod +x /usr/local/bin/gsd-browser

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js .

# Create non-root user so Chrome's zygote sandbox accepts the default profile
# (Chromium refuses to run as root without --no-sandbox, and gsd-browser CLI
# has no flag to pass that arg through.)
RUN useradd --create-home --shell /bin/bash gsd \
    && chown -R gsd:gsd /app
USER gsd

EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -sf http://localhost:8788/healthz || exit 1

CMD ["node", "server.js"]
