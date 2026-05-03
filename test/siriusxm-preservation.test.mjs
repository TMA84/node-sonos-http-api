import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Preservation Property Tests
 *
 * Property 2: Preservation - Utility Commands and Search Logic Unchanged
 *
 * These tests verify existing behavior BEFORE implementing the fix.
 * They MUST PASS on the current unfixed code.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
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
        return 254;
      },
      getServiceType: (serviceName) => {
        calls.getServiceType.push(serviceName);
        return 6075;
      },
      getFavorites: () => Promise.resolve([])
    }
  };
}

describe('Preservation: Utility Commands and Search Logic Unchanged', () => {
  /**
   * Test 1: Utility commands resolve with "success"
   *
   * For values[0] being 'channels' or 'stations', the function resolves with "success".
   * (Note: 'data' requires getFavorites which we mock to return empty array)
   *
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  it('Utility commands resolve with "success"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('channels', 'stations', 'data'),
        async (command) => {
          const player = createMockPlayer();
          // Suppress console.log output during test
          const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
          try {
            const result = await siriusXMHandler(player, [command]);
            expect(result).toBe('success');
          } finally {
            consoleSpy.mockRestore();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Test 2: Fuse.js search by channelNum returns correct channel
   *
   * For any channel from the channel list, searching by its channelNum
   * returns that channel as the first result (via setAVTransport call).
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('Fuse.js search by channelNum returns correct channel', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...channels),
        async (channel) => {
          const player = createMockPlayer();
          await siriusXMHandler(player, [channel.channelNum]);

          // setAVTransport should have been called with a URI containing the channel's id
          expect(player.calls.setAVTransport.length).toBe(1);
          const { uri } = player.calls.setAVTransport[0];
          expect(uri).toContain(`r%3a${channel.id}`);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Test 3: adjustStation normalization is stable
   *
   * For any channel title, adjustStation produces consistent output.
   * We test this indirectly through the 'stations' command output.
   *
   * **Validates: Requirements 3.3**
   */
  it('adjustStation normalization is stable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...channels),
        async () => {
          // Run the stations command twice and verify console output is the same
          const player1 = createMockPlayer();
          const output1 = [];
          const spy1 = vi.spyOn(console, 'log').mockImplementation((...args) => {
            output1.push(args[0]);
          });
          await siriusXMHandler(player1, ['stations']);
          spy1.mockRestore();

          const player2 = createMockPlayer();
          const output2 = [];
          const spy2 = vi.spyOn(console, 'log').mockImplementation((...args) => {
            output2.push(args[0]);
          });
          await siriusXMHandler(player2, ['stations']);
          spy2.mockRestore();

          // The output should be identical across runs (stable normalization)
          expect(output1).toEqual(output2);
          // The output should have the same number of entries as channels
          expect(output1.length).toBe(channels.length);
        }
      ),
      // Only need a few runs since we're testing stability
      { numRuns: 5 }
    );
  });

  /**
   * Test 4: setAVTransport is called before play for matching stations
   *
   * When a matching station is found, setAVTransport is called and then play is called.
   *
   * **Validates: Requirements 3.5**
   */
  it('setAVTransport is called before play for matching stations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...channels),
        async (channel) => {
          const player = createMockPlayer();
          const callOrder = [];

          // Override to track call order
          player.coordinator.setAVTransport = (uri, metadata) => {
            callOrder.push('setAVTransport');
            player.calls.setAVTransport.push({ uri, metadata });
            return Promise.resolve();
          };
          player.coordinator.play = () => {
            callOrder.push('play');
            player.calls.play.push(true);
            return Promise.resolve();
          };

          await siriusXMHandler(player, [channel.channelNum]);

          // setAVTransport must be called before play
          expect(callOrder).toEqual(['setAVTransport', 'play']);
        }
      ),
      { numRuns: 30 }
    );
  });
});
