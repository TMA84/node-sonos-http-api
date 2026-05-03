# Dockerfile for sonos-http-api v2.0.0
# Supports linux/amd64 and linux/arm/v7 (Raspberry Pi)

FROM node:20-alpine

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

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

# Create writable directories with correct ownership
RUN mkdir -p cache presets clips \
    && chown -R app:app cache presets clips

# Switch to non-root user
USER app

# Default HTTP port
EXPOSE 5005

# Use host network mode for Sonos SSDP discovery
# (set via docker-compose or docker run --net=host)
CMD ["node", "server.js"]
