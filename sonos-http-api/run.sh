#!/usr/bin/with-contenv bashio

# Read options from Home Assistant add-on config
PORT=$(bashio::config 'port')
ANNOUNCE_VOLUME=$(bashio::config 'announce_volume')

# Read the dynamically assigned ingress port from Supervisor
INGRESS_PORT=$(bashio::addon.ingress_port)
bashio::log.info "Ingress port assigned: ${INGRESS_PORT}"

# Use ingress port as the server port (so Ingress proxy works)
# The configured port is used for host_network direct access
SERVER_PORT="${INGRESS_PORT}"

CONFIG_DIR="/config"
SETTINGS_FILE="/app/settings.json"

# Check if user provided a custom settings.json in addon_config
if [ -f "${CONFIG_DIR}/settings.json" ]; then
  bashio::log.info "Using custom settings.json from addon config"
  cp "${CONFIG_DIR}/settings.json" "${SETTINGS_FILE}"
else
  bashio::log.info "Generating settings.json from add-on options"
  cat > "${SETTINGS_FILE}" <<EOF
{
  "port": ${SERVER_PORT},
  "ip": "0.0.0.0",
  "announceVolume": ${ANNOUNCE_VOLUME}
}
EOF
fi

# Link presets from addon_config if they exist
if [ -d "${CONFIG_DIR}/presets" ]; then
  bashio::log.info "Linking presets from addon config"
  rm -rf /app/presets
  ln -s "${CONFIG_DIR}/presets" /app/presets
fi

# Link clips from addon_config if they exist
if [ -d "${CONFIG_DIR}/clips" ]; then
  bashio::log.info "Linking clips from addon config"
  rm -rf /app/static/clips
  ln -s "${CONFIG_DIR}/clips" /app/static/clips
fi

bashio::log.info "Starting Sonos HTTP API on port ${SERVER_PORT}"
exec node /app/server.js
