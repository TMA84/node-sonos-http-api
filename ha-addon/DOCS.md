# Sonos HTTP API

Control your Sonos system via a simple HTTP API.

## Features

- Full playback control (play, pause, next, previous, seek)
- Volume management (set, mute, group volume)
- Zone grouping and ungrouping
- Favorites and playlists
- Text-to-Speech (TTS) announcements
- Music service integration (Spotify, Apple Music, etc.)
- Modern web UI with live zone status
- Interactive API documentation (Swagger UI)

## Configuration

### Basic options

- **port**: The port the API listens on (default: 5005)
- **announce_volume**: Default volume for TTS announcements (default: 40)

### Advanced configuration

For advanced settings, create a `settings.json` file in the add-on's
configuration directory (`/addon_configs/local_sonos-http-api/settings.json`).

Example `settings.json`:

```json
{
  "port": 5005,
  "ip": "0.0.0.0",
  "announceVolume": 40,
  "tts": {
    "provider": "google"
  }
}
```

### Presets

Place preset JSON files in `/addon_configs/local_sonos-http-api/presets/`.

### Audio clips

Place audio clips in `/addon_configs/local_sonos-http-api/clips/`.

## Usage

Once started, the web UI is available at `http://<your-ha-ip>:5005`.

API documentation is at `http://<your-ha-ip>:5005/docs`.

### Example API calls

```
GET http://<your-ha-ip>:5005/zones
GET http://<your-ha-ip>:5005/Living+Room/play
GET http://<your-ha-ip>:5005/Living+Room/volume/30
GET http://<your-ha-ip>:5005/Living+Room/say/Hello%20World
```

## Network

This add-on uses host networking to enable Sonos device discovery via SSDP
multicast. Your Sonos speakers must be on the same network as your
Home Assistant instance.
