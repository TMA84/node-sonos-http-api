FROM ghcr.io/home-assistant/base:latest

LABEL \
    org.opencontainers.image.title="Sonos HTTP API" \
    org.opencontainers.image.description="Control your Sonos system via HTTP API with modern web UI" \
    org.opencontainers.image.source="https://github.com/TMA84/node-sonos-http-api" \
    org.opencontainers.image.licenses="MIT" \
    io.hass.name="Sonos HTTP API" \
    io.hass.description="Control your Sonos system via HTTP" \
    io.hass.type="addon" \
    io.hass.url="https://github.com/TMA84/node-sonos-http-api"

RUN apk add --no-cache \
    nodejs \
    npm \
    bash

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

COPY sonos-http-api/run.sh /
RUN chmod a+x /run.sh

EXPOSE 5005

CMD [ "/run.sh" ]
