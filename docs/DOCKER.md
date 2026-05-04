# Docker

## Docker Compose (recommended)

```yaml
services:
  sonos-api:
    image: ghcr.io/tma84/sonos-http-api:latest
    network_mode: host
    volumes:
      - ./settings.json:/app/settings.json:ro
      - ./presets:/app/presets:ro
      - ./clips:/app/static/clips
    restart: unless-stopped
```

```bash
docker compose up -d
```

## Docker Run

```bash
docker run -d --name sonos-api --net=host \
  -v ./settings.json:/app/settings.json:ro \
  ghcr.io/tma84/sonos-http-api:latest
```

## Why `--net=host`?

Sonos uses SSDP multicast for device discovery. This requires the container to be on the same network as your Sonos speakers. `host` networking mode gives the container direct access to the host's network interfaces.

## Volume Mounts

| Mount | Purpose |
|-------|---------|
| `/app/settings.json` | Configuration file (optional) |
| `/app/presets` | Preset JSON files (optional) |
| `/app/static/clips` | Audio clip files (optional) |
| `/app/cache` | TTS cache (persists generated audio) |

## Health Check

The container exposes a health endpoint:

```bash
curl http://localhost:5005/health
# {"status":"ok"}
```

## Supported Architectures

| Architecture | Platforms |
|---|---|
| `linux/amd64` | Intel/AMD servers, NAS (Synology, QNAP, Unraid) |
| `linux/aarch64` | Raspberry Pi 4+, Apple Silicon |

## NAS-specific Notes

### Synology

Use Container Manager (Docker). Set network to "host" mode. Mount your settings.json from a shared folder.

### QNAP

Use Container Station. Enable "Use host networking". Map volumes as needed.

### Unraid

Add as a Docker container from the Community Apps or manually. Set network type to "Host". Add path mappings for settings and presets.

## Updating

```bash
docker compose pull
docker compose up -d
```
