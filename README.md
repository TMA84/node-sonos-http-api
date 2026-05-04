# Sonos HTTP API

Control your Sonos system via a simple HTTP API — with a modern web UI, interactive API docs, and playback controls.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

<a href="https://buymeacoffee.com/tobiasmalct"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buymeacoffee&logoColor=white" alt="Buy Me a Coffee"></a>

## Features

- Full playback control (play, pause, next, volume, seek, etc.)
- Text-to-Speech announcements (Google, AWS Polly, ElevenLabs, Microsoft, macOS)
- Music service integration (Spotify, Apple Music, Amazon Music, TuneIn, BBC Sounds)
- Zone grouping and ungrouping
- Favorites, playlists, and presets
- Modern web UI with live zone status and playback controls
- Interactive API documentation (Swagger UI)
- Auto-refresh zone status every 10 seconds
- Dark mode (follows system preference)
- Responsive design, WCAG 2.1 AA accessible
- Home Assistant Add-on with Ingress support
- Docker container (amd64 + aarch64)

## Quick Start

| Your setup | Recommended method |
|---|---|
| Home Assistant OS / Supervised | [Home Assistant Add-on](#home-assistant-add-on) |
| Docker / NAS / Linux server | [Docker](#docker) |
| Development / macOS / Windows | [Node.js](#nodejs) |

---

## Home Assistant Add-on

The easiest way to run Sonos HTTP API on Home Assistant.

### Installation

1. Go to **Settings → Add-ons → Add-on Store**
2. Click ⋮ (top right) → **Repositories**
3. Add: `https://github.com/TMA84/node-sonos-http-api`
4. Find "Sonos HTTP API" in the store and click **Install**
5. Start the add-on

The web UI is accessible directly from the Home Assistant sidebar (panel icon: 🔊).

### Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `announce_volume` | `40` | Default volume for TTS announcements (1-100) |

For advanced settings, place a `settings.json` in the add-on config directory:
`/addon_configs/local_sonos_http_api/settings.json`

### Features

- **Ingress**: Web UI accessible from the HA sidebar
- **Host network**: Sonos SSDP discovery works automatically
- **Watchdog**: Auto-restarts if the server becomes unresponsive
- **Presets**: Place preset files in `/addon_configs/local_sonos_http_api/presets/`
- **Clips**: Place audio clips in `/addon_configs/local_sonos_http_api/clips/`

---

## Docker

### Docker Compose (recommended)

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

### Docker Run

```bash
docker run -d --name sonos-api --net=host \
  -v ./settings.json:/app/settings.json:ro \
  ghcr.io/tma84/sonos-http-api:latest
```

> **Note:** `--net=host` is required for Sonos SSDP multicast discovery. Your Sonos speakers must be on the same network.

### Supported architectures

- `linux/amd64` (Intel/AMD servers, NAS)
- `linux/aarch64` (Raspberry Pi 4+, Apple Silicon)

---

## Node.js

**Requirements:** Node.js 18+

```bash
git clone https://github.com/TMA84/node-sonos-http-api.git
cd node-sonos-http-api
npm install
npm start
```

The server starts on `http://0.0.0.0:5005`.

---

## Usage

Once running, open `http://<your-ip>:5005` in a browser to see:

- **Live zone status** with play/pause/skip controls
- **API Quick Reference** with all available endpoints
- **API Documentation** (Swagger UI) at `/docs/`

### API Pattern

```
GET http://<your-ip>:5005/{room}/{action}/{value}
```

### Examples

```bash
# Play/Pause
curl http://localhost:5005/Living+Room/play
curl http://localhost:5005/Living+Room/pause

# Volume
curl http://localhost:5005/Living+Room/volume/30
curl http://localhost:5005/Living+Room/volume/+5

# Text-to-Speech
curl http://localhost:5005/Living+Room/say/Dinner+is+ready
curl http://localhost:5005/Living+Room/say/Das+Essen+ist+fertig/de

# Play favorites/playlists
curl http://localhost:5005/Living+Room/favorite/My+Playlist
curl http://localhost:5005/Living+Room/playlist/Chill

# Spotify
curl http://localhost:5005/Living+Room/spotify/now/spotify:playlist:37i9dQZF1DXcBWIGoYBM5M

# TuneIn Radio
curl http://localhost:5005/Living+Room/tunein/BBC+Radio+1

# Grouping
curl http://localhost:5005/Kitchen/group/Living+Room
curl http://localhost:5005/Kitchen/ungroup

# Get zone info
curl http://localhost:5005/zones
```

---

## API Reference

### Global Actions

| Endpoint | Description |
|----------|-------------|
| `/zones` | List all zones and players |
| `/favorites` | List Sonos favorites |
| `/playlists` | List Sonos playlists |
| `/services` | List available music services |
| `/pauseall` | Pause all players |
| `/resumeall` | Resume all players |
| `/reindex` | Reindex music library |
| `/lockvolumes` | Lock all volumes |
| `/unlockvolumes` | Unlock volumes |
| `/preset/{name}` | Apply a preset |
| `/sleep/{timeout}` | Set sleep timer (seconds) |
| `/sayall/{text}` | TTS on all rooms |
| `/clipall/{uri}` | Play clip on all rooms |
| `/health` | Health check |

### Player Actions

| Action | Parameter | Example |
|--------|-----------|---------|
| `play` | — | `/Office/play` |
| `pause` | — | `/Office/pause` |
| `playpause` | — | `/Office/playpause` |
| `volume` | level or +/- | `/Office/volume/30` |
| `mute` / `unmute` | — | `/Office/mute` |
| `next` / `previous` | — | `/Office/next` |
| `seek` | seconds | `/Office/seek/120` |
| `state` | — | `/Office/state` |
| `queue` | — | `/Office/queue` |
| `clearqueue` | — | `/Office/clearqueue` |
| `favorite` | name | `/Office/favorite/My+Playlist` |
| `playlist` | name | `/Office/playlist/Chill` |
| `say` | text[/lang[/volume]] | `/Office/say/Hello/en/50` |
| `clip` | uri[/volume] | `/Office/clip/doorbell.mp3/60` |
| `repeat` | all/one/none | `/Office/repeat/all` |
| `shuffle` | on/off | `/Office/shuffle/on` |
| `crossfade` | on/off | `/Office/crossfade/on` |
| `linein` | — | `/Office/linein` |
| `spotify` | uri | `/Office/spotify/now/spotify:track:xxx` |
| `applemusic` | query | `/Office/applemusic/song+name` |
| `amazonmusic` | query | `/Office/amazonmusic/playlist+name` |
| `tunein` | station | `/Office/tunein/BBC+Radio+1` |
| `bbcsounds` | query | `/Office/bbcsounds/Radio+4` |
| `equalizer` | setting/value | `/Office/equalizer/bass/5` |
| `nightmode` | on/off | `/Office/nightmode/on` |
| `group` | room | `/Kitchen/group/Office` |
| `ungroup` | — | `/Kitchen/ungroup` |

---

## Configuration

Create `settings.json` in the project root (or mount it in Docker):

```json5
{
  port: 5005,
  announceVolume: 40,

  // Optional: Basic authentication
  auth: {
    username: "admin",
    password: "secret"
  },

  // Optional: HTTPS
  https: {
    key: "/path/to/key.pem",
    cert: "/path/to/cert.pem"
  }
}
```

### All Options

| Option | Default | Description |
|--------|---------|-------------|
| `port` | `5005` | HTTP port |
| `ip` | `"0.0.0.0"` | Bind address |
| `securePort` | `5006` | HTTPS port |
| `announceVolume` | `40` | Default TTS volume (%) |
| `auth` | — | Basic auth `{ username, password }` |
| `https` | — | HTTPS `{ key, cert }` or `{ pfx, passphrase }` |
| `cacheDir` | `"./cache"` | TTS cache directory |
| `presetDir` | `"./presets"` | Presets directory |

---

## TTS Providers

Configure in `settings.json`. Default is Google (no API key needed).

| Provider | Config key | Notes |
|----------|-----------|-------|
| Google | *(default)* | No config needed |
| AWS Polly | `aws` | Requires IAM credentials |
| ElevenLabs | `elevenlabs` | Requires API key |
| Microsoft | `microsoft` | Requires Bing Speech key |
| VoiceRSS | `voicerss` | API key as string |
| macOS Say | `macSay` | Local only, no network |

Example (AWS Polly):
```json5
{
  aws: {
    credentials: { region: "eu-west-1", accessKeyId: "...", secretAccessKey: "..." },
    name: "Vicki"
  }
}
```

---

## Presets

Create JSON5 files in `presets/`:

```json5
// presets/morning.json
{
  players: [
    { roomName: "Kitchen", volume: 20 },
    { roomName: "Bathroom", volume: 15 }
  ],
  favorite: "Morning Jazz",
  pauseOthers: true
}
```

Apply: `GET /preset/morning`

---

## ☕ Support

If this project helps you, consider supporting development:

<a href="https://buymeacoffee.com/tobiasmalct"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200"></a>

---

## License

[MIT](LICENSE.md)
