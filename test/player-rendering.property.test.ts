// Feature: webpage-modernization, Property 5: Player rendering includes all required information
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

/**
 * Validates: Requirements 10.3, 10.4, 10.9
 *
 * For any player object with populated state data, the rendered output for that
 * player SHALL contain the room name, the playback state (playing/paused/stopped),
 * the current track information (title, artist, album), and the volume level.
 * When track information is absent, a "No music selected" indicator SHALL appear instead.
 */

// --- Player data generators ---

function trackArb() {
  return fc.record({
    title: fc.string({ minLength: 1, maxLength: 30 }),
    artist: fc.string({ minLength: 1, maxLength: 30 }),
    album: fc.string({ minLength: 1, maxLength: 30 }),
  });
}

function playerStateWithTrackArb() {
  return fc.record({
    volume: fc.integer({ min: 0, max: 100 }),
    playbackState: fc.constantFrom('PLAYING', 'PAUSED_PLAYBACK', 'STOPPED'),
    currentTrack: trackArb(),
  });
}

function playerStateWithoutTrackArb() {
  return fc.record({
    volume: fc.integer({ min: 0, max: 100 }),
    playbackState: fc.constantFrom('PLAYING', 'PAUSED_PLAYBACK', 'STOPPED'),
    currentTrack: fc.constant(undefined),
  });
}

function playerWithTrackArb() {
  return fc.record({
    uuid: fc.uuid(),
    roomName: fc.string({ minLength: 1, maxLength: 30 }),
    state: playerStateWithTrackArb(),
  });
}

function playerWithoutTrackArb() {
  return fc.record({
    uuid: fc.uuid(),
    roomName: fc.string({ minLength: 1, maxLength: 30 }),
    state: playerStateWithoutTrackArb(),
  });
}

function playerArb() {
  return fc.oneof(playerWithTrackArb(), playerWithoutTrackArb());
}

// --- DOM setup helpers ---

function createDOM() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="zones"></div></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable',
  });
  return dom;
}

/**
 * Load the zones.js module and extract the renderZones function.
 * We evaluate the module source in the jsdom context.
 */
async function loadRenderZones(dom: JSDOM) {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');

  const zonesPath = resolve(process.cwd(), 'static/js/zones.js');
  let source = readFileSync(zonesPath, 'utf-8');

  // Remove the ES module export/import syntax and DOMContentLoaded listener
  // so we can evaluate it in a script context
  source = source.replace(/^export\s+/gm, '');
  source = source.replace(/^import\s+.*$/gm, '');
  // Remove the DOMContentLoaded listener at the bottom
  source = source.replace(/if\s*\(typeof document[\s\S]*$/, '');

  const window = dom.window;
  const document = window.document;

  // Evaluate in the jsdom context
  const script = new window.Function('document', `
    ${source}
    return { renderZones };
  `);

  return script.call(window, document) as {
    renderZones: (zones: unknown[], container: HTMLElement) => void;
  };
}

/**
 * Helper to wrap a player in a zone structure for rendering.
 */
function wrapInZone(player: { uuid: string; roomName: string; state: unknown }) {
  return {
    uuid: player.uuid + '-zone',
    coordinator: player,
    members: [player],
  };
}

/**
 * Map playbackState to expected badge text.
 */
function expectedStateLabel(playbackState: string): string {
  switch (playbackState) {
    case 'PLAYING': return 'Playing';
    case 'PAUSED_PLAYBACK': return 'Paused';
    default: return 'Stopped';
  }
}

describe('Player rendering includes all required information (Property 5)', () => {
  let dom: JSDOM;
  let renderFns: {
    renderZones: (zones: unknown[], container: HTMLElement) => void;
  };

  beforeEach(async () => {
    dom = createDOM();
    renderFns = await loadRenderZones(dom);
  });

  it('rendered player contains room name, playback state, track info, and volume when track is present', () => {
    fc.assert(
      fc.property(playerWithTrackArb(), (player) => {
        const container = dom.window.document.createElement('div');
        const zone = wrapInZone(player);
        renderFns.renderZones([zone], container);

        const playerEl = container.querySelector(`[data-player-uuid="${player.uuid}"]`);
        expect(playerEl).not.toBeNull();

        const textContent = playerEl!.textContent || '';

        // Room name is present
        expect(textContent).toContain(player.roomName);

        // Playback state badge is present
        const expectedLabel = expectedStateLabel(player.state.playbackState);
        expect(textContent).toContain(expectedLabel);

        // Track info is present
        expect(textContent).toContain(player.state.currentTrack.title);
        expect(textContent).toContain(player.state.currentTrack.artist);
        expect(textContent).toContain(player.state.currentTrack.album);

        // Volume is present
        expect(textContent).toContain(`${player.state.volume}%`);
      }),
      { numRuns: 100 }
    );
  });

  it('rendered player shows "No music selected" when track is absent', () => {
    fc.assert(
      fc.property(playerWithoutTrackArb(), (player) => {
        const container = dom.window.document.createElement('div');
        const zone = wrapInZone(player);
        renderFns.renderZones([zone], container);

        const playerEl = container.querySelector(`[data-player-uuid="${player.uuid}"]`);
        expect(playerEl).not.toBeNull();

        const textContent = playerEl!.textContent || '';

        // Room name is present
        expect(textContent).toContain(player.roomName);

        // Playback state badge is present
        const expectedLabel = expectedStateLabel(player.state.playbackState);
        expect(textContent).toContain(expectedLabel);

        // "No music selected" indicator is present
        expect(textContent).toContain('No music selected');

        // Volume is present
        expect(textContent).toContain(`${player.state.volume}%`);
      }),
      { numRuns: 100 }
    );
  });

  it('rendered player contains room name, playback state, and volume for any player (with or without track)', () => {
    fc.assert(
      fc.property(playerArb(), (player) => {
        const container = dom.window.document.createElement('div');
        const zone = wrapInZone(player);
        renderFns.renderZones([zone], container);

        const playerEl = container.querySelector(`[data-player-uuid="${player.uuid}"]`);
        expect(playerEl).not.toBeNull();

        const textContent = playerEl!.textContent || '';

        // Room name always present
        expect(textContent).toContain(player.roomName);

        // Playback state always present
        const expectedLabel = expectedStateLabel(player.state.playbackState);
        expect(textContent).toContain(expectedLabel);

        // Volume always present
        expect(textContent).toContain(`${player.state.volume}%`);

        // Either track info or "No music selected" is present
        const hasTrackInfo = player.state.currentTrack !== undefined;
        if (hasTrackInfo) {
          const track = player.state.currentTrack as { title: string; artist: string; album: string };
          expect(textContent).toContain(track.title);
          expect(textContent).toContain(track.artist);
          expect(textContent).toContain(track.album);
        } else {
          expect(textContent).toContain('No music selected');
        }
      }),
      { numRuns: 100 }
    );
  });
});
