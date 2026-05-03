import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';
import spotifyDef from '../lib/music_services/spotifyDef.js';

const require = createRequire(import.meta.url);

const Fuse = require('fuse.js');
const channels = require('../lib/sirius-channels.json');

/**
 * Preservation Property Tests
 * 
 * Property 2: Preservation - Non-HTTP Pure Functions Unchanged
 * 
 * These tests verify that pure functions in spotifyDef.js and siriusXM.js
 * that do NOT depend on request-promise continue to work correctly.
 * They are run BEFORE the fix to establish baseline behavior, and AFTER
 * the fix to confirm no regressions.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */

// --- Generators ---

/** Generate a valid Spotify search type */
const searchTypeArb = fc.constantFrom('album', 'song', 'station', 'playlist');

/** Generate a non-empty string suitable for search terms (no control chars) */
const termStringArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !/[\x00-\x1f]/.test(s));

/** Generate a valid Spotify track item */
const trackItemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  artists: fc.array(
    fc.record({ name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0) }),
    { minLength: 1, maxLength: 3 }
  ),
  available_markets: fc.constant(null),
});

/** Generate a unique track name to avoid deduplication filtering */
const uniqueTrackItemsArb = fc.array(trackItemArb, { minLength: 1, maxLength: 10 })
  .map(items => {
    // Ensure unique track names to avoid deduplication in loadTracks
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  })
  .filter(items => items.length > 0);

/** Generate a valid result list for a given type */
function resultListArb(type) {
  const itemArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    uri: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  });

  if (type === 'album') {
    return fc.record({ albums: fc.record({ items: fc.array(itemArb, { minLength: 0, maxLength: 5 }) }) });
  } else if (type === 'song') {
    return fc.record({ tracks: fc.record({ items: fc.array(itemArb, { minLength: 0, maxLength: 5 }) }) });
  } else if (type === 'station') {
    return fc.record({ artists: fc.record({ items: fc.array(itemArb, { minLength: 0, maxLength: 5 }) }) });
  } else {
    return fc.record({ playlists: fc.record({ items: fc.array(itemArb, { minLength: 0, maxLength: 5 }) }) });
  }
}

// --- Property Tests ---

describe('Preservation: spotifyDef.getSearchTerm (term function)', () => {
  /**
   * For all valid search term inputs (type, term, artist, album, track),
   * getSearchTerm produces a properly encoded URI component.
   * 
   * **Validates: Requirements 3.2**
   */
  it('Property: produces a properly encoded URI component for all valid inputs', () => {
    fc.assert(
      fc.property(
        searchTypeArb,
        termStringArb,
        fc.oneof(fc.constant(''), termStringArb),
        fc.oneof(fc.constant(''), termStringArb),
        fc.oneof(fc.constant(''), termStringArb),
        (type, term, artist, album, track) => {
          const result = spotifyDef.term(type, term, artist, album, track);

          // Result should be a string
          expect(typeof result).toBe('string');

          // Result should be URI-encoded (decoding should not throw)
          expect(() => decodeURIComponent(result)).not.toThrow();

          // If artist is provided, decoded result should contain 'artist:'
          if (artist !== '') {
            expect(decodeURIComponent(result)).toContain('artist:');
          }

          // If track is provided, decoded result should contain 'track:'
          if (track !== '') {
            expect(decodeURIComponent(result)).toContain('track:');
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Preservation: spotifyDef.loadTracks (tracks function)', () => {
  /**
   * For all valid track JSON inputs with items, loadTracks returns
   * {count, isArtist, queueTracks} with count matching filtered items.
   * 
   * **Validates: Requirements 3.2**
   */
  it('Property: returns {count, isArtist, queueTracks} with count matching unique items', () => {
    fc.assert(
      fc.property(
        uniqueTrackItemsArb,
        (trackItems) => {
          const tracksJson = { tracks: { items: trackItems } };
          const result = spotifyDef.tracks('song', tracksJson);

          // Result has the expected structure
          expect(result).toHaveProperty('count');
          expect(result).toHaveProperty('isArtist');
          expect(result).toHaveProperty('queueTracks');

          // count matches queueTracks length
          expect(result.count).toBe(result.queueTracks.length);

          // count should be <= input items (deduplication may reduce)
          expect(result.count).toBeLessThanOrEqual(trackItems.length);

          // count should be > 0 since we have at least one unique item
          expect(result.count).toBeGreaterThan(0);

          // Each track in queueTracks has required fields
          for (const track of result.queueTracks) {
            expect(track).toHaveProperty('trackName');
            expect(track).toHaveProperty('artistName');
            expect(track).toHaveProperty('uri');
            expect(track).toHaveProperty('metadata');
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property: returns count 0 for empty items array', () => {
    const tracksJson = { tracks: { items: [] } };
    const result = spotifyDef.tracks('song', tracksJson);
    expect(result.count).toBe(0);
    expect(result.queueTracks).toEqual([]);
    expect(result.isArtist).toBe(false);
  });
});

describe('Preservation: spotifyDef.isEmpty (empty function)', () => {
  /**
   * For all valid result list inputs, isEmpty returns true iff the relevant
   * items array is empty.
   * 
   * **Validates: Requirements 3.2**
   */
  it('Property: returns true iff the relevant items array is empty', () => {
    const types = ['album', 'song', 'station', 'playlist'];

    for (const type of types) {
      fc.assert(
        fc.property(
          resultListArb(type),
          (resList) => {
            const result = spotifyDef.empty(type, resList);

            // Get the relevant items array
            let items;
            if (type === 'album') items = resList.albums.items;
            else if (type === 'song') items = resList.tracks.items;
            else if (type === 'station') items = resList.artists.items;
            else items = resList.playlists.items;

            // isEmpty should return true iff items.length === 0
            expect(result).toBe(items.length === 0);
          }
        ),
        { numRuns: 100 }
      );
    }
  });
});

describe('Preservation: spotifyDef.getMetadata (metadata function)', () => {
  /**
   * For all valid metadata inputs (type, id, name, title), getMetadata returns
   * well-formed DIDL-Lite XML containing the inputs.
   * 
   * **Validates: Requirements 3.4**
   */
  it('Property: returns DIDL-Lite XML containing the input values', () => {
    const typeArb = fc.constantFrom('album', 'song', 'station', 'playlist');
    const safeStringArb = fc.string({ minLength: 1, maxLength: 30 })
      .filter(s => s.trim().length > 0 && !/[<>&"']/.test(s)); // avoid XML special chars

    fc.assert(
      fc.property(
        typeArb,
        safeStringArb,
        safeStringArb,
        safeStringArb,
        (type, id, name, title) => {
          const result = spotifyDef.metadata(type, id, name, title);

          // Result should be a string
          expect(typeof result).toBe('string');

          // Should contain DIDL-Lite XML structure
          expect(result).toContain('<DIDL-Lite');
          expect(result).toContain('</DIDL-Lite>');
          expect(result).toContain('<item');
          expect(result).toContain('</item>');

          // Should contain the id in the item element
          expect(result).toContain(`id="${id}"`);

          // Should contain the name in parentID
          expect(result).toContain(name);

          // For station type, title should appear in dc:title
          if (type === 'station') {
            expect(result).toContain(`<dc:title>${title}</dc:title>`);
          } else {
            // For non-station types, dc:title is empty
            expect(result).toContain('<dc:title></dc:title>');
          }

          // Should contain the correct object class
          const objectType = spotifyDef.object[type];
          expect(result).toContain(`object.${objectType}`);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Preservation: spotifyDef.getURIandMetadata (urimeta function)', () => {
  /**
   * For all valid result list inputs with at least one item,
   * getURIandMetadata returns expected {uri, metadata} structure.
   * 
   * **Validates: Requirements 3.2**
   */
  it('Property: returns {uri, metadata} for valid non-empty result lists', () => {
    const typesForUrimeta = ['album', 'station', 'playlist'];
    const itemArb = fc.record({
      id: fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/),
      name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !/[<>&"']/.test(s)),
      uri: fc.stringMatching(/^spotify:[a-z]+:[a-zA-Z0-9]{1,20}$/),
    });

    for (const type of typesForUrimeta) {
      fc.assert(
        fc.property(
          fc.array(itemArb, { minLength: 1, maxLength: 3 }),
          (items) => {
            let resList;
            if (type === 'album') resList = { albums: { items } };
            else if (type === 'station') resList = { artists: { items } };
            else resList = { playlists: { items } };

            const result = spotifyDef.urimeta(type, resList);

            // Result should have uri and metadata
            expect(result).toHaveProperty('uri');
            expect(result).toHaveProperty('metadata');
            expect(typeof result.uri).toBe('string');
            expect(typeof result.metadata).toBe('string');

            // URI should be non-empty
            expect(result.uri.length).toBeGreaterThan(0);

            // Metadata should contain DIDL-Lite
            expect(result.metadata).toContain('<DIDL-Lite');
            expect(result.metadata).toContain('</DIDL-Lite>');
          }
        ),
        { numRuns: 100 }
      );
    }
  });
});

describe('Preservation: SiriusXM channel search via Fuse.js', () => {
  /**
   * For all channel search inputs from the actual channel data,
   * Fuse.js search returns results consistent with channel data.
   * 
   * **Validates: Requirements 3.1**
   */
  it('Property: searching by exact channelNum returns that channel as first result', () => {
    // Generate arbitrary channel indices from the actual channel list
    const channelIndexArb = fc.integer({ min: 0, max: channels.length - 1 });

    fc.assert(
      fc.property(
        channelIndexArb,
        (index) => {
          const channel = channels[index];
          const fuzzy = new Fuse(channels, { keys: ['channelNum', 'title'] });
          const results = fuzzy.search(channel.channelNum);

          // Searching by exact channel number should return at least one result
          expect(results.length).toBeGreaterThan(0);

          // The first result should match the channel we searched for
          expect(results[0].item.channelNum).toBe(channel.channelNum);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: searching by exact title returns that channel in results', () => {
    const channelIndexArb = fc.integer({ min: 0, max: channels.length - 1 });

    fc.assert(
      fc.property(
        channelIndexArb,
        (index) => {
          const channel = channels[index];
          const fuzzy = new Fuse(channels, { keys: ['channelNum', 'title'] });
          const results = fuzzy.search(channel.title);

          // Searching by exact title should return at least one result
          expect(results.length).toBeGreaterThan(0);

          // The searched channel should appear somewhere in results
          const found = results.some(r => r.item.id === channel.id);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: Fuse.js search always returns items from the channel list', () => {
    // Any non-empty search string should only return items from the channel list
    const searchTermArb = fc.stringMatching(/^[a-zA-Z0-9 ]{1,15}$/);

    fc.assert(
      fc.property(
        searchTermArb,
        (searchTerm) => {
          const fuzzy = new Fuse(channels, { keys: ['channelNum', 'title'] });
          const results = fuzzy.search(searchTerm);

          // All results should be items from the original channel list
          for (const result of results) {
            expect(result.item).toHaveProperty('fullTitle');
            expect(result.item).toHaveProperty('channelNum');
            expect(result.item).toHaveProperty('title');
            expect(result.item).toHaveProperty('id');
            expect(result.item).toHaveProperty('parentID');

            // Verify the item exists in the original channel list
            const exists = channels.some(ch => ch.id === result.item.id);
            expect(exists).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
