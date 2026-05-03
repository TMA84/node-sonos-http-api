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

COPY package*.json ./
COPY packages/ packages/

RUN npm ci --omit=dev

COPY server.js settings.js ./
COPY lib/ lib/
COPY static/ static/

RUN mkdir -p cache presets static/clips static/tts

COPY run.sh /
RUN chmod a+x /run.sh

EXPOSE 5005

CMD [ "/run.sh" ]
