# API Reference

All endpoints use GET requests. The interactive API documentation (Swagger UI) is available at `http://<your-ip>:5005/docs/`.

## Global Actions

| Endpoint | Description |
|----------|-------------|
| `/zones` | List all zones and players |
| `/favorites` | List Sonos favorites |
| `/playlists` | List Sonos playlists |
| `/services` | List available music services |
| `/pauseall` | Pause all players |
| `/resumeall` | Resume all players |
| `/reindex` | Reindex music library |
| `/lockvolumes` | Lock all volumes at current level |
| `/unlockvolumes` | Unlock volumes |
| `/preset/{name}` | Apply a named preset |
| `/sleep/{timeout}` | Set sleep timer (seconds) |
| `/sayall/{text}` | TTS on all rooms |
| `/sayall/{text}/{language}` | TTS on all rooms with language |
| `/clipall/{uri}` | Play audio clip on all rooms |
| `/health` | Health check endpoint |

## Player Actions

Pattern: `/{room}/{action}` or `/{room}/{action}/{value}`

### Playback

| Action | Parameter | Example |
|--------|-----------|---------|
| `play` | — | `/Office/play` |
| `pause` | — | `/Office/pause` |
| `playpause` | — | `/Office/playpause` |
| `next` | — | `/Office/next` |
| `previous` | — | `/Office/previous` |
| `seek` | seconds | `/Office/seek/120` |
| `repeat` | all / one / none | `/Office/repeat/all` |
| `shuffle` | on / off | `/Office/shuffle/on` |
| `crossfade` | on / off | `/Office/crossfade/on` |

### Volume

| Action | Parameter | Example |
|--------|-----------|---------|
| `volume` | 0-100 or +/- | `/Office/volume/30`, `/Office/volume/+5` |
| `groupVolume` | 0-100 or +/- | `/Office/groupVolume/25` |
| `mute` | — | `/Office/mute` |
| `unmute` | — | `/Office/unmute` |
| `equalizer` | setting/value | `/Office/equalizer/bass/5` |
| `nightmode` | on / off | `/Office/nightmode/on` |
| `speechenhancement` | on / off | `/Office/speechenhancement/on` |

### Queue & Favorites

| Action | Parameter | Example |
|--------|-----------|---------|
| `state` | — | `/Office/state` |
| `queue` | — | `/Office/queue` |
| `clearqueue` | — | `/Office/clearqueue` |
| `favorite` | name | `/Office/favorite/My+Playlist` |
| `playlist` | name | `/Office/playlist/Chill` |

### TTS & Clips

| Action | Parameter | Example |
|--------|-----------|---------|
| `say` | text[/language[/volume]] | `/Office/say/Hello/en/50` |
| `clip` | uri[/volume] | `/Office/clip/doorbell.mp3/60` |

### Music Services

| Action | Parameter | Example |
|--------|-----------|---------|
| `spotify` | now/next/queue + URI | `/Office/spotify/now/spotify:track:xxx` |
| `applemusic` | query | `/Office/applemusic/song+name` |
| `amazonmusic` | query | `/Office/amazonmusic/playlist+name` |
| `tunein` | station name or ID | `/Office/tunein/BBC+Radio+1` |
| `bbcsounds` | station/podcast | `/Office/bbcsounds/Radio+4` |
| `linein` | [source room] | `/Office/linein` |

### Grouping

| Action | Parameter | Example |
|--------|-----------|---------|
| `group` | target room | `/Kitchen/group/Office` |
| `ungroup` | — | `/Kitchen/ungroup` |

## Response Format

Success:
```json
{"status": "success"}
```

Error:
```json
{"status": "error", "error": "Player \"Unknown\" not found"}
```

Zone data (`/zones`):
```json
[
  {
    "uuid": "RINCON_xxx",
    "coordinator": {
      "uuid": "RINCON_xxx",
      "roomName": "Living Room",
      "state": {
        "volume": 25,
        "mute": false,
        "playbackState": "PLAYING",
        "currentTrack": {
          "title": "Song Title",
          "artist": "Artist",
          "album": "Album"
        }
      }
    },
    "members": [...]
  }
]
```
