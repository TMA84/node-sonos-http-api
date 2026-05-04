<p align="center">
  <img src="static/sonos-icon.png" alt="Sonos HTTP API" width="200">
</p>

<h1 align="center">Sonos HTTP API</h1>

<p align="center">
  Control your Sonos system via a simple HTTP API —
  with a modern web UI, interactive API docs, and playback controls.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/aarch64-yes-green.svg" alt="Supports aarch64">
  <img src="https://img.shields.io/badge/amd64-yes-green.svg" alt="Supports amd64">
  <img src="https://img.shields.io/github/v/release/TMA84/node-sonos-http-api" alt="GitHub Release">
  <img src="https://img.shields.io/github/license/TMA84/node-sonos-http-api" alt="License">
</p>

<p align="center">
  <a href="https://buymeacoffee.com/tobiasmalct"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" width="217"></a>
</p>

---

## About

A lightweight HTTP API for controlling Sonos speakers on your local network. Send simple GET requests to play, pause, adjust volume, group speakers, use TTS, and more. Includes a modern web dashboard with live zone status and playback controls.

### Features

- Full playback control (play, pause, next, volume, seek, etc.)
- Text-to-Speech (Google, AWS Polly, ElevenLabs, Microsoft, macOS)
- Music services (Spotify, Apple Music, Amazon Music, TuneIn, BBC Sounds)
- Zone grouping and ungrouping
- Favorites, playlists, and presets
- Modern web UI with live zone status and play/pause/skip controls
- Interactive API documentation (Swagger UI)
- Auto-refresh zone status every 10 seconds
- Dark mode (follows system preference)
- Responsive design, WCAG 2.1 AA accessible
- Home Assistant Add-on with Ingress support
- Docker container (amd64 + aarch64)
- Health check endpoint for monitoring

## Quick Start

| Your setup | Recommended method |
|---|---|
| Home Assistant OS / Supervised | [Home Assistant Add-on](docs/HOME_ASSISTANT.md) |
| Docker / NAS / Linux server | [Docker](docs/DOCKER.md) |
| Development / macOS / Windows | [Node.js](docs/NODEJS.md) |

→ [API Reference](docs/API.md)
→ [Configuration](docs/CONFIGURATION.md)
→ [TTS Providers](docs/TTS.md)

> **Note:** The Home Assistant Add-on requires **HAOS** or **Supervised**. If you run HA as a Docker container, use the [Docker method](docs/DOCKER.md) instead.

## API Pattern

All endpoints follow:

```
GET http://<your-ip>:5005/{room}/{action}/{value}
```

### Examples

```bash
# Playback
curl http://localhost:5005/Living+Room/play
curl http://localhost:5005/Living+Room/pause
curl http://localhost:5005/Living+Room/next

# Volume
curl http://localhost:5005/Living+Room/volume/30

# Text-to-Speech
curl http://localhost:5005/Living+Room/say/Dinner+is+ready
curl http://localhost:5005/Living+Room/say/Das+Essen+ist+fertig/de

# Favorites & Playlists
curl http://localhost:5005/Living+Room/favorite/My+Playlist

# Spotify
curl http://localhost:5005/Living+Room/spotify/now/spotify:playlist:37i9dQZF1DXcBWIGoYBM5M

# Grouping
curl http://localhost:5005/Kitchen/group/Living+Room

# Info
curl http://localhost:5005/zones
curl http://localhost:5005/favorites
```

→ [Full API Reference](docs/API.md)

## FAQ

### How does Sonos discovery work?

The server uses SSDP multicast to discover Sonos speakers on your local network. Your speakers and the server must be on the same subnet. In Docker, use `--net=host` or `network_mode: host`.

### Can I use this with Home Assistant automations?

Yes. Use the [REST command](https://www.home-assistant.io/integrations/rest_command/) integration to call any endpoint from automations, scripts, or scenes.

### Does this work on Raspberry Pi?

Yes. Both the Docker image and the HA Add-on support `aarch64` (Raspberry Pi 4+).

### Can I use HTTPS?

Yes. Configure `https.key` and `https.cert` in `settings.json`. See [Configuration](docs/CONFIGURATION.md).

### Can I protect the API with a password?

Yes. Set `auth.username` and `auth.password` in `settings.json`. See [Configuration](docs/CONFIGURATION.md).

## ☕ Support this project

This project is developed and maintained in my free time. If it helps you control your Sonos system, I'd appreciate your support:

<a href="https://buymeacoffee.com/tobiasmalct"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" width="217"></a>

## Credits

Based on [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) by Jimmy Shimizu.

## License

[MIT](LICENSE.md)
