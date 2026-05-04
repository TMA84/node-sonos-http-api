# Node.js

## Requirements

- Node.js 18 or higher
- npm

## Installation

```bash
git clone https://github.com/TMA84/node-sonos-http-api.git
cd node-sonos-http-api
npm install
npm start
```

The server starts on `http://0.0.0.0:5005`.

## Configuration

Create a `settings.json` in the project root. See [Configuration](CONFIGURATION.md) for all options.

## Running as a Service (systemd)

Create `/etc/systemd/system/sonos-api.service`:

```ini
[Unit]
Description=Sonos HTTP API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/node-sonos-http-api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable sonos-api
sudo systemctl start sonos-api
```

## Running with PM2

```bash
npm install -g pm2
pm2 start server.js --name sonos-api
pm2 save
pm2 startup
```

## Development

```bash
npm install        # Install all dependencies (including dev)
npm test           # Run test suite
npm run lint       # Run linter
npm run typecheck  # TypeScript type checking
```
