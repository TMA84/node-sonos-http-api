// static/js/zones.js — Zone data fetcher and renderer (ES module)
'use strict';

const FETCH_TIMEOUT_MS = 5000;
const AUTO_REFRESH_MS = 10000; // Refresh zones every 10 seconds

/**
 * Fetches zone data from the /zones endpoint.
 * Uses AbortController with a 5-second timeout.
 * @returns {Promise<Array>} Array of zone objects
 * @throws {Error} On network failure, HTTP error, invalid JSON, or timeout
 */
export async function fetchZones() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Use path relative to current location for Ingress compatibility
    const basePath = window.location.pathname.replace(/\/+$/, '');
    const url = basePath + '/zones';
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to load zone data (HTTP ${response.status}).`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Received invalid data from the server.');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Unable to connect to Sonos API. The request timed out.');
    }
    if (error.message.startsWith('Failed to load zone data') ||
        error.message.startsWith('Received invalid data')) {
      throw error;
    }
    throw new Error('Unable to connect to Sonos API. Check that the server is running.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Returns a CSS class for the playback state badge.
 */
function stateBadgeClass(zoneState) {
  switch (zoneState) {
    case 'PLAYING': return 'badge badge-success';
    case 'PAUSED_PLAYBACK': return 'badge badge-warning';
    default: return 'badge badge-error';
  }
}

/**
 * Returns a human-readable label for the playback state.
 */
function stateLabel(zoneState) {
  switch (zoneState) {
    case 'PLAYING': return 'Playing';
    case 'PAUSED_PLAYBACK': return 'Paused';
    default: return 'Stopped';
  }
}

/**
 * Sends a command to a room via the API.
 * @param {string} roomName - Name of the room
 * @param {string} action - Action to perform (play, pause, next, previous)
 */
function sendCommand(roomName, action) {
  const basePath = window.location.pathname.replace(/\/+$/, '');
  const url = basePath + '/' + encodeURIComponent(roomName) + '/' + action;
  fetch(url).catch(() => {});
  // Refresh after a short delay to show updated state
  setTimeout(loadZones, 800);
}

/**
 * Renders a single player row (compact) with playback controls.
 * @param {object} player - Player object from zone data
 * @param {boolean} isCoordinator - Whether this player is the zone coordinator
 * @returns {HTMLElement}
 */
function renderPlayer(player, isCoordinator) {
  const el = document.createElement('div');
  el.className = 'player-row';
  el.setAttribute('data-player-uuid', player.uuid);

  const state = player.state || {};
  const playbackState = state.playbackState || 'STOPPED';

  // Room name + badge + controls inline
  const header = document.createElement('div');
  header.className = 'player-header';

  const roomName = document.createElement('span');
  roomName.className = 'player-room';
  roomName.textContent = player.roomName || 'Unknown Room';
  header.appendChild(roomName);

  const badge = document.createElement('span');
  badge.className = stateBadgeClass(playbackState);
  badge.textContent = stateLabel(playbackState);
  header.appendChild(badge);

  // Playback controls (only for coordinator)
  if (isCoordinator) {
    const controls = document.createElement('span');
    controls.className = 'player-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-icon';
    prevBtn.textContent = '⏮';
    prevBtn.title = 'Previous';
    prevBtn.addEventListener('click', () => sendCommand(player.roomName, 'previous'));
    controls.appendChild(prevBtn);

    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'btn-icon';
    playPauseBtn.textContent = playbackState === 'PLAYING' ? '⏸' : '▶';
    playPauseBtn.title = playbackState === 'PLAYING' ? 'Pause' : 'Play';
    playPauseBtn.addEventListener('click', () => {
      sendCommand(player.roomName, playbackState === 'PLAYING' ? 'pause' : 'play');
    });
    controls.appendChild(playPauseBtn);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-icon';
    nextBtn.textContent = '⏭';
    nextBtn.title = 'Next';
    nextBtn.addEventListener('click', () => sendCommand(player.roomName, 'next'));
    controls.appendChild(nextBtn);

    header.appendChild(controls);
  }

  const volume = document.createElement('span');
  volume.className = 'player-volume text-secondary';
  volume.textContent = state.volume != null ? `${state.volume}%` : '—';
  header.appendChild(volume);

  el.appendChild(header);

  // Track info (single line)
  const track = state.currentTrack;
  const trackLine = document.createElement('p');
  trackLine.className = 'player-track text-sm text-secondary';

  if (track && (track.title || track.artist)) {
    const parts = [];
    if (track.artist) parts.push(track.artist);
    if (track.title) parts.push(track.title);
    if (track.album) parts.push(track.album);
    trackLine.textContent = parts.join(' — ');
  } else {
    trackLine.textContent = 'No music selected';
  }

  el.appendChild(trackLine);

  return el;
}

/**
 * Renders all zones into the given container.
 * Builds DOM with one zone group per zone, showing coordinator + members.
 * @param {Array} zones - Array of zone objects
 * @param {HTMLElement} container - DOM element to render into
 */
export function renderZones(zones, container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'cluster';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = 'var(--space-sm)';

  const heading = document.createElement('h2');
  heading.textContent = 'Zones';
  header.appendChild(heading);

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-primary';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.setAttribute('aria-label', 'Refresh zone data');
  refreshBtn.addEventListener('click', () => loadZones());
  header.appendChild(refreshBtn);

  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'stack-sm';

  for (const zone of zones) {
    const group = document.createElement('div');
    group.className = 'card zone-card';
    group.setAttribute('data-zone-uuid', zone.uuid);

    // Zone coordinator as primary player
    if (zone.coordinator) {
      group.appendChild(renderPlayer(zone.coordinator, true));
    }

    // Zone members (excluding coordinator) — compact list
    const otherMembers = (zone.members || []).filter(
      (m) => m.uuid !== (zone.coordinator && zone.coordinator.uuid)
    );

    for (const member of otherMembers) {
      const separator = document.createElement('hr');
      separator.className = 'zone-divider';
      group.appendChild(separator);
      group.appendChild(renderPlayer(member, false));
    }

    grid.appendChild(group);
  }

  container.appendChild(grid);
}

/**
 * Renders an error message with a retry button.
 * @param {string} message - Error message to display
 * @param {HTMLElement} container - DOM element to render into
 */
export function renderError(message, container) {
  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = 'Zones';
  container.appendChild(heading);

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message stack-sm';
  errorDiv.setAttribute('role', 'alert');

  const msg = document.createElement('p');
  msg.textContent = message;
  errorDiv.appendChild(msg);

  const retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-primary';
  retryBtn.textContent = 'Retry';
  retryBtn.setAttribute('aria-label', 'Retry loading zone data');
  retryBtn.addEventListener('click', () => loadZones());
  errorDiv.appendChild(retryBtn);

  container.appendChild(errorDiv);
}

/**
 * Renders a loading indicator.
 * @param {HTMLElement} container - DOM element to render into
 */
export function renderLoading(container) {
  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = 'Zones';
  container.appendChild(heading);

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.setAttribute('aria-live', 'polite');
  loadingDiv.textContent = 'Loading zones…';
  container.appendChild(loadingDiv);
}

/**
 * Renders an empty state message.
 * @param {HTMLElement} container - DOM element to render into
 */
export function renderEmpty(container) {
  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = 'Zones';
  container.appendChild(heading);

  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-message';

  const msg = document.createElement('p');
  msg.textContent = 'No speakers discovered yet. Make sure your Sonos system is on the same network.';
  emptyDiv.appendChild(msg);

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-primary';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.setAttribute('aria-label', 'Refresh zone data');
  refreshBtn.addEventListener('click', () => loadZones());
  emptyDiv.appendChild(refreshBtn);

  container.appendChild(emptyDiv);
}

/**
 * Main load function: shows loading → fetches → renders zones/error/empty.
 */
async function loadZones() {
  const container = document.getElementById('zones');
  if (!container) return;

  renderLoading(container);

  try {
    const zones = await fetchZones();

    if (!Array.isArray(zones) || zones.length === 0) {
      renderEmpty(container);
    } else {
      renderZones(zones, container);
    }
  } catch (error) {
    renderError(error.message, container);
  }
}

// Initialize on page load and start auto-refresh
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    loadZones();
    setInterval(loadZones, AUTO_REFRESH_MS);
  });
}
