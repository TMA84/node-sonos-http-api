// Feature: webpage-modernization, Property 4: Zone rendering produces correct group structure
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

/**
 * Validates: Requirements 10.1, 10.2
 *
 * For any valid zones response array (including empty arrays), calling the zone
 * renderer SHALL produce exactly one zone group container per zone, and each zone
 * group SHALL contain a representation of the coordinator player plus all member
 * players listed in that zone.
 */

// --- Zone data generators ---

function trackArb() {
  return fc.record({
    title: fc.string({ minLength: 1, maxLength: 30 }),
    artist: fc.string({ minLength: 1, maxLength: 30 }),
    album: fc.string({ minLength: 1, maxLength: 30 }),
  });
}

function playerStateArb() {
  return fc.record({
    volume: fc.integer({ min: 0, max: 100 }),
    playbackState: fc.constantFrom('PLAYING', 'PAUSED_PLAYBACK', 'STOPPED'),
    currentTrack: fc.option(trackArb(), { nil: undefined }),
  });
}

function playerArb() {
  return fc.record({
    uuid: fc.uuid(),
    roomName: fc.string({ minLength: 1, maxLength: 30 }),
    state: playerStateArb(),
  });
}

/**
 * Generate a zone with a coordinator and 1-5 members.
 * Members array includes the coordinator (matching real Sonos API behavior).
 */
function zoneArb() {
  return fc.record({
    uuid: fc.uuid(),
    coordinator: playerArb(),
    members: fc.array(playerArb(), { minLength: 0, maxLength: 4 }),
  }).map((zone) => {
    // Real Sonos API includes coordinator in members list
    return {
      ...zone,
      members: [zone.coordinator, ...zone.members],
    };
  });
}

/**
 * Generate an array of 0-10 zones.
 */
function zonesArrayArb() {
  return fc.array(zoneArb(), { minLength: 0, maxLength: 10 });
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

  // Wrap in an IIFE that exposes renderZones and renderEmpty
  const wrappedSource = `
    (function() {
      ${source}
      return { renderZones, renderEmpty };
    })();
  `;

  const window = dom.window;
  const document = window.document;

  // Evaluate in the jsdom context
  const script = new window.Function('document', `
    ${source}
    return { renderZones, renderEmpty };
  `);

  return script.call(window, document) as {
    renderZones: (zones: unknown[], container: HTMLElement) => void;
    renderEmpty: (container: HTMLElement) => void;
  };
}

describe('Zone rendering produces correct group structure (Property 4)', () => {
  let dom: JSDOM;
  let renderFns: {
    renderZones: (zones: unknown[], container: HTMLElement) => void;
    renderEmpty: (container: HTMLElement) => void;
  };

  beforeEach(async () => {
    dom = createDOM();
    renderFns = await loadRenderZones(dom);
  });

  it('produces exactly one zone group container per zone', () => {
    fc.assert(
      fc.property(zonesArrayArb(), (zones) => {
        const container = dom.window.document.createElement('div');
        renderFns.renderZones(zones, container);

        // Each zone should produce a card with data-zone-uuid attribute
        const zoneGroups = container.querySelectorAll('[data-zone-uuid]');
        expect(zoneGroups.length).toBe(zones.length);

        // Each zone group should have the correct uuid
        zones.forEach((zone, index) => {
          const group = zoneGroups[index];
          expect(group.getAttribute('data-zone-uuid')).toBe(zone.uuid);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('each zone group contains the coordinator player', () => {
    fc.assert(
      fc.property(zonesArrayArb().filter(z => z.length > 0), (zones) => {
        const container = dom.window.document.createElement('div');
        renderFns.renderZones(zones, container);

        for (const zone of zones) {
          const group = container.querySelector(`[data-zone-uuid="${zone.uuid}"]`);
          expect(group).not.toBeNull();

          // Coordinator should be rendered as a player within the group
          const coordinatorPlayer = group!.querySelector(
            `[data-player-uuid="${zone.coordinator.uuid}"]`
          );
          expect(coordinatorPlayer).not.toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('each zone group contains all member players (excluding coordinator duplicate)', () => {
    fc.assert(
      fc.property(zonesArrayArb().filter(z => z.length > 0), (zones) => {
        const container = dom.window.document.createElement('div');
        renderFns.renderZones(zones, container);

        for (const zone of zones) {
          const group = container.querySelector(`[data-zone-uuid="${zone.uuid}"]`);
          expect(group).not.toBeNull();

          // Members excluding coordinator (matching renderZones behavior)
          const otherMembers = zone.members.filter(
            (m: { uuid: string }) => m.uuid !== zone.coordinator.uuid
          );

          // Each non-coordinator member should be rendered
          for (const member of otherMembers) {
            const memberPlayer = group!.querySelector(
              `[data-player-uuid="${member.uuid}"]`
            );
            expect(memberPlayer).not.toBeNull();
          }

          // Total player count = 1 coordinator + other members
          const allPlayers = group!.querySelectorAll('[data-player-uuid]');
          expect(allPlayers.length).toBe(1 + otherMembers.length);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('empty zones array produces no zone group containers', () => {
    const container = dom.window.document.createElement('div');
    renderFns.renderZones([], container);

    const zoneGroups = container.querySelectorAll('[data-zone-uuid]');
    expect(zoneGroups.length).toBe(0);
  });
});
