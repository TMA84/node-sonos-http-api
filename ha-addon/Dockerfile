ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

# Install Node.js
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files and local dependency
COPY package*.json ./
COPY packages/ packages/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source
COPY server.js settings.js ./
COPY lib/ lib/

# Copy static assets (modernized web UI)
COPY static/ static/

# Create writable directories
RUN mkdir -p cache presets static/clips static/tts

# Copy run script
COPY ha-addon/run.sh /
RUN chmod a+x /run.sh

# Labels
LABEL \
  io.hass.version="2.0.0" \
  io.hass.type="addon" \
  io.hass.arch="amd64|aarch64"

CMD [ "/run.sh" ]
