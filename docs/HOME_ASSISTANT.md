# Home Assistant Add-on

## Installation

1. Go to **Settings → Add-ons → Add-on Store**
2. Click ⋮ (top right) → **Repositories**
3. Add: `https://github.com/TMA84/node-sonos-http-api`
4. Find **"Sonos HTTP API"** in the store and click **Install**
5. Start the add-on

The web UI is accessible directly from the Home Assistant sidebar (🔊 Sonos API).

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `announce_volume` | `40` | Default volume for TTS announcements (1-100) |

## Advanced Configuration

For full control, place a `settings.json` in the add-on config directory:

```
/addon_configs/local_sonos_http_api/settings.json
```

Example:
```json
{
  "port": 5005,
  "announceVolume": 35
}
```

## Presets

Place preset JSON files in:
```
/addon_configs/local_sonos_http_api/presets/
```

## Audio Clips

Place audio clips (MP3, WAV) in:
```
/addon_configs/local_sonos_http_api/clips/
```

## Features

- **Ingress**: Web UI accessible from the HA sidebar without exposing ports
- **Host network**: Sonos SSDP discovery works automatically
- **Watchdog**: Auto-restarts if the server becomes unresponsive
- **Panel icon**: 🔊 in the sidebar for quick access

## Using with Automations

Use the [REST command](https://www.home-assistant.io/integrations/rest_command/) integration:

```yaml
rest_command:
  sonos_say:
    url: "http://localhost:5005/{{ room }}/say/{{ message }}/{{ language }}"
  sonos_play:
    url: "http://localhost:5005/{{ room }}/play"
  sonos_pause:
    url: "http://localhost:5005/{{ room }}/pause"
  sonos_volume:
    url: "http://localhost:5005/{{ room }}/volume/{{ level }}"
```

Then in automations:
```yaml
action:
  - service: rest_command.sonos_say
    data:
      room: "Living Room"
      message: "Dinner is ready"
      language: "en"
```
