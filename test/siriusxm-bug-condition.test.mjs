import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Bug Condition Exploration Test
 *
 * Property 1: Bug Condition - SiriusXM Station Playback Uses Hardcoded Parameters
 *
 * These tests encode the EXPECTED (fixed) behavior. They MUST FAIL on the current
 * unfixed code, confirming the bug exists.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

// Load the siriusXM module via dynamic import and capture the handler
const modulePath = path.resolve(__dirname, '../lib/actions/siriusXM.js');

let siriusXMHandler;
const mockApi = {
  registerAction: (name, handler) => {
    siriusXMHandler = handler;
  }
};

const mod = await import(modulePath);
mod.default(mockApi);

// Load channels (JSON can still use createRequire)
const channelsPath = path.resolve(__dirname, '../lib/sirius-channels.json');
const channels = require(channelsPath);

/**
 * Creates a mock player object for testing.
 * The mock tracks calls to getServiceId and captures URI/metadata passed to setAVTransport.
 */
function createMockPlayer() {
  const calls = {
    getServiceId: [],
    getServiceType: [],
    setAVTransport: [],
    play: []
  };

  return {
    calls,
    coordinator: {
      setAVTransport: (uri, metadata) => {
        calls.setAVTransport.push({ uri, metadata });
        return Promise.resolve();
      },
      play: () => {
        calls.play.push(true);
        return Promise.resolve();
      }
    },
    system: {
      getServiceId: (serviceName) => {
        calls.getServiceId.push(serviceName);
        return 254; // Example dynamic service ID
      },
      getServiceType: (serviceName) => {
        calls.getServiceType.push(serviceName);
        return 6075; // Example dynamic service type
      },
      getFavorites: () => Promise.resolve([])
    }
  };
}

describe('Bug Condition: SiriusXM Station Playback Uses Hardcoded Parameters', () => {
  /**
   * Test 1a: For any channel from the channel list, getSiriusXmUri(channel.id) returns
   * a URI containing hardcoded `sid=37` instead of a dynamic service ID.
   *
   * EXPECTED (fixed) behavior: URI should contain a dynamic sid from player.system.getServiceId('SiriusXM')
   * CURRENT (buggy) behavior: URI always contains sid=37
   *
   * **Validates: Requirements 1.1**
   */
  it('Test 1a: URI should use dynamic service ID instead of hardcoded sid=37', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...channels),
        async (channel) => {
          const player = createMockPlayer();
          const result = await siriusXMHandler(player, [channel.channelNum]);

          // The URI passed to setAVTransport should NOT contain hardcoded sid=37
          // It should contain the dynamic sid from player.system.getServiceId('SiriusXM')
          expect(player.calls.setAVTransport.length).toBeGreaterThan(0);
          const { uri } = player.calls.setAVTransport[0];
          expect(uri).not.toContain('sid=37');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test 1b: For any channel from the channel list, getSiriusXmMetadata returns metadata
   * with `<desc id="cdudn">_</desc>` instead of a proper SA_RINCON{serviceType}_X_#Svc{serviceType}-0-Token pattern.
   *
   * EXPECTED (fixed) behavior: metadata should contain SA_RINCON pattern in cdudn
   * CURRENT (buggy) behavior: metadata contains bare underscore `_` in cdudn
   *
   * **Validates: Requirements 1.2**
   */
  it('Test 1b: Metadata should use SA_RINCON service token instead of bare underscore', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...channels),
        async (channel) => {
          const player = createMockPlayer();
          const result = await siriusXMHandler(player, [channel.channelNum]);

          // The metadata passed to setAVTransport should contain SA_RINCON pattern
          expect(player.calls.setAVTransport.length).toBeGreaterThan(0);
          const { metadata } = player.calls.setAVTransport[0];
          expect(metadata).not.toContain('<desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">_</desc>');
          expect(metadata).toMatch(/SA_RINCON\d+_X_#Svc\d+-0-Token/);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test 1c: When siriusXM is called with a non-matching search term, it returns
   * undefined instead of a rejected promise.
   *
   * EXPECTED (fixed) behavior: should return a rejected promise with error message
   * CURRENT (buggy) behavior: returns undefined (no explicit return)
   *
   * **Validates: Requirements 1.3**
   */
  it('Test 1c: Non-matching search should return rejected promise instead of undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings composed only of 'z' and 'q' which won't fuzzy-match any channel
        fc.array(fc.constantFrom('z', 'q', 'x'), { minLength: 10, maxLength: 30 }).map(arr => arr.join('')),
        async (searchTerm) => {
          const player = createMockPlayer();
          const result = siriusXMHandler(player, [searchTerm]);

          // The function should return a rejected promise, not undefined
          expect(result).toBeInstanceOf(Promise);
          await expect(result).rejects.toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Test 1d: When siriusXM is called with a matching station, it does NOT call
   * player.system.getServiceId('SiriusXM').
   *
   * EXPECTED (fixed) behavior: getServiceId('SiriusXM') should be called to get dynamic params
   * CURRENT (buggy) behavior: getServiceId is never called (hardcoded values used instead)
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('Test 1d: Matching station should call player.system.getServiceId for dynamic params', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...channels),
        async (channel) => {
          const player = createMockPlayer();
          await siriusXMHandler(player, [channel.channelNum]);

          // The function should call getServiceId('SiriusXM') to get dynamic service ID
          expect(player.calls.getServiceId).toContain('SiriusXM');
        }
      ),
      { numRuns: 20 }
    );
  });
});
