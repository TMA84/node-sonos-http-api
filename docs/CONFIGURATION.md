# Configuration

Create a `settings.json` file in the project root (Node.js) or mount it into the container (Docker). The file supports JSON5 syntax (comments, trailing commas).

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | `5005` | HTTP server port |
| `ip` | string | `"0.0.0.0"` | Bind address |
| `securePort` | number | `5006` | HTTPS server port |
| `announceVolume` | number | `40` | Default TTS announcement volume (%) |
| `cacheDir` | string | `"./cache"` | TTS cache directory |
| `webroot` | string | `"./static"` | Static files directory |
| `presetDir` | string | `"./presets"` | Presets directory |
| `auth` | object | — | Basic auth: `{ username, password }` |
| `https` | object | — | HTTPS: `{ key, cert }` or `{ pfx, passphrase }` |
| `webhook` | string | — | Webhook URL for state change notifications |

## Example

```json5
{
  port: 5005,
  announceVolume: 35,

  // Basic authentication
  auth: {
    username: "admin",
    password: "secret"
  },

  // HTTPS
  https: {
    key: "/path/to/key.pem",
    cert: "/path/to/cert.pem"
  }
}
```

## Presets

Create JSON5 files in the `presets/` directory:

```json5
// presets/morning.json
{
  players: [
    { roomName: "Kitchen", volume: 20 },
    { roomName: "Bathroom", volume: 15 }
  ],
  favorite: "Morning Jazz",
  pauseOthers: true,
  playMode: { shuffle: true, repeat: "all" }
}
```

Apply with: `GET /preset/morning`
