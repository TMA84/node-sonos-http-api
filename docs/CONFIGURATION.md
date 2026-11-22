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
| `webhook` | string \| string[] | — | Webhook URL(s) for state change notifications. Use an array to notify several receivers. |

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

## Webhooks

Every state change (`transport-state`, `topology-change`, `volume-change`, `mute-change`) is POSTed as JSON to the configured webhook URL(s):

```json5
{
  // single receiver
  webhook: "http://192.168.1.50:8080/",

  // or several receivers
  webhook: [
    "http://192.168.1.50:8080/",
    "http://192.168.1.51:8080/"
  ]
}
```

If a receiver is unreachable (e.g. a display that is switched off), only the first failed delivery is logged as an error; further failures for that URL are logged at debug level, and an info line is written once it accepts events again.

Optional: `webhookType` / `webhookData` rename the `type` / `data` keys of the payload, `webhookHeaderName` + `webhookHeaderContents` add a custom header (e.g. for authentication).

**Docker / Home Assistant add-on:** `127.0.0.1` / `localhost` refers to the machine (or container) the API runs on, not to the machine running your receiver. Use the LAN IP (or hostname) of the receiving machine, and make sure the receiver listens on `0.0.0.0` rather than only on `127.0.0.1`.

**Alternative: Server-Sent Events.** The same events are streamed at `GET /events` (`text/event-stream`). Any number of clients can subscribe there, so receivers can pull events instead of needing a webhook entry each:

```bash
curl -N http://<sonos-api-host>:5005/events
```
