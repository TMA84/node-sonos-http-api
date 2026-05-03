# Sonos HTTP API

A Node.js HTTP API for controlling your Sonos system with simple REST requests.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

## Table of Contents

- [Installation](#installation)
- [Docker Usage](#docker-usage)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [TTS Providers](#tts-providers)
- [Music Services](#music-services)

## Installation

**Requirements:** Node.js 18 or higher

```bash
# Clone the repository
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api

# Install dependencies
npm install

# Build TypeScript source
npm run build

# Start the server
node dist/server.js
```

The server starts on `http://0.0.0.0:5005` by default.

## Docker Usage

### Using Docker Compose (recommended)

```bash
docker-compose up
```

This starts the API with default settings. To customize, mount your configuration files:

```yaml
# docker-compose.yml
version: '3.8'
services:
  sonos-api:
    build: .
    ports:
      - "5005:5005"
    volumes:
      - ./settings.json:/app/settings.json:ro
      - ./presets:/app/presets:ro
    restart: unless-stopped
```

### Volume Mounts

| Mount Path | Purpose |
|-----------|---------|
| `/app/settings.json` | Custom configuration file |
| `/app/presets` | Preset definition files |

The Docker image uses Node.js 20 Alpine, runs as a non-root user, and supports `linux/amd64` and `linux/arm/v7` (Raspberry Pi) architectures.

## API Endpoints

All endpoints follow the pattern:

```
http://localhost:5005/{player}/{action}/{value}
```

### Global Actions

| Endpoint | Description |
|----------|-------------|
| `/zones` | List all zones and players |
| `/pauseall/{timeout}` | Pause all players (optional timeout in minutes) |
| `/resumeall/{timeout}` | Resume previously paused players |
| `/preset/{name}` | Apply a named preset |
| `/reindex` | Reindex the Sonos music library |
| `/lockvolumes` | Lock all volumes at current level |
| `/unlockvolumes` | Unlock volumes |
| `/health` | Health check (no auth required) |

### Player Actions

| Action | Parameter | Example |
|--------|-----------|---------|
| `play` | — | `/Office/play` |
| `pause` | — | `/Office/pause` |
| `playpause` | — | `/Office/playpause` |
| `volume` | Absolute or relative (+/-) | `/Office/volume/30`, `/Office/volume/+5` |
| `groupVolume` | Absolute or relative | `/Office/groupVolume/25` |
| `mute` / `unmute` | — | `/Office/mute` |
| `next` / `previous` | — | `/Office/next` |
| `state` | — | `/Office/state` |
| `favorite` | Favorite name | `/Office/favorite/My%20Playlist` |
| `playlist` | Playlist name | `/Office/playlist/Chill` |
| `say` | phrase/language/volume | `/Office/say/Hello/en-us/50` |
| `sayall` | phrase/language/volume | `/sayall/Hello/en-us/40` |
| `clip` | filename/volume | `/Office/clip/doorbell.mp3/60` |
| `clipall` | filename/volume | `/clipall/doorbell.mp3` |
| `queue` | limit/offset | `/Office/queue/10` |
| `clearqueue` | — | `/Office/clearqueue` |
| `seek` | seconds | `/Office/seek/120` |
| `sleep` | seconds or "off" | `/Office/sleep/600` |
| `repeat` | on/one/off/toggle | `/Office/repeat/on` |
| `shuffle` | on/off/toggle | `/Office/shuffle/on` |
| `crossfade` | on/off/toggle | `/Office/crossfade/on` |
| `linein` | optional source room | `/Office/linein/TV%20Room` |
| `join` | target room | `/Kitchen/join/Office` |
| `leave` | — | `/Kitchen/leave` |
| `sub` | on/off/gain/crossover/polarity | `/TV%20Room/sub/gain/3` |
| `nightmode` | on/off/toggle | `/TV%20Room/nightmode/on` |
| `speechenhancement` | on/off/toggle | `/TV%20Room/speechenhancement/on` |
| `bass` / `treble` | -10 to 10 | `/Office/bass/5` |

## Configuration

Create a `settings.json` file in the project root to override defaults. The file supports JSON5 syntax (comments, trailing commas, unquoted keys).

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `5005` | HTTP server port |
| `ip` | `string` | `"0.0.0.0"` | Bind address |
| `securePort` | `number` | `5006` | HTTPS server port |
| `cacheDir` | `string` | `"./cache"` | Cache directory path |
| `webroot` | `string` | `"./static"` | Static files directory |
| `presetDir` | `string` | `"./presets"` | Presets directory |
| `announceVolume` | `number` | `40` | Default TTS announcement volume (%) |
| `auth` | `object` | `undefined` | Basic auth: `{ username, password }` |
| `https` | `object` | `undefined` | HTTPS config: `{ pfx, passphrase, key, cert }` |
| `aws` | `object` | `undefined` | AWS Polly config: `{ credentials, name, region }` |
| `webhook` | `string` | `undefined` | Webhook URL for state change notifications |
| `log` | `object` | `undefined` | Logging config: `{ level, format }` |

### Example settings.json

```json5
{
  port: 5005,
  ip: "0.0.0.0",
  announceVolume: 35,

  // Basic authentication
  auth: {
    username: "admin",
    password: "secret"
  },

  // HTTPS configuration
  https: {
    key: "/path/to/key.pem",
    cert: "/path/to/cert.pem"
  },

  // Logging
  log: {
    level: "info",   // error, warn, info, debug
    format: "text"   // text or json
  }
}
```

## TTS Providers

Text-to-speech is available via the `/say` and `/sayall` actions. Configure your preferred provider in `settings.json`. If multiple providers are configured, behavior is non-deterministic.

### Google (default)

No configuration required. Works out of the box with no API key.

```
/Office/say/Hello world/en-us/50
```

### AWS Polly

```json5
{
  aws: {
    credentials: {
      region: "us-east-1",
      accessKeyId: "YOUR_KEY",
      secretAccessKey: "YOUR_SECRET"
    },
    name: "Joanna"
  }
}
```

Append `Neural` to the voice name for neural engine (e.g., `JoannaNeural`).

### Microsoft Cognitive Services

```json5
{
  microsoft: {
    key: "YOUR_BING_SPEECH_API_KEY",
    name: "ZiraRUS"
  }
}
```

### ElevenLabs

```json5
{
  elevenlabs: {
    auth: { apiKey: "YOUR_API_KEY" },
    config: {
      voiceId: "VOICE_ID",
      modelId: "eleven_multilingual_v2"
    }
  }
}
```

### VoiceRSS

```json5
{
  voicerss: "YOUR_API_KEY"
}
```

### macOS Say

```json5
{
  macSay: {
    voice: "Alex",
    rate: 90
  }
}
```

## Music Services

### Spotify

Requires a [Spotify Developer Application](https://developer.spotify.com/my-applications/) for `clientId` and `clientSecret` in settings.

```
/Office/spotify/now/spotify:track:4LI1ykYGFCcXPWkrpcU7hn
/Office/spotify/next/spotify:track:4LI1ykYGFCcXPWkrpcU7hn
/Office/spotify/queue/spotify:track:4LI1ykYGFCcXPWkrpcU7hn
```

For playlists: `spotify:user:spotify:playlist:{playlistId}`

### Apple Music

```
/Office/applemusic/now/song:{songID}
/Office/applemusic/now/album:{albumID}
/Office/applemusic/now/playlist:{playlistID}
```

### Deezer

Supported via the Sonos music services integration.

### Library (Local Music)

Search and play from your local Sonos music library:

```
/Office/musicsearch/library/song/{query}
/Office/musicsearch/library/album/{query}
```

## Presets

Create JSON5 files in the `presets/` directory. The filename (without extension) becomes the preset name.

```json5
{
  players: [
    { roomName: "Living Room", volume: 20 },
    { roomName: "Kitchen", volume: 15 }
  ],
  playMode: { shuffle: true, repeat: "all" },
  favorite: "My Playlist",
  pauseOthers: true
}
```

Apply with: `http://localhost:5005/preset/{name}`

## License

[MIT](LICENSE.md)
