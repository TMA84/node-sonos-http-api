import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playpause Toggle Fix Tests
 * 
 * Issue #876: playpause action not working - always results in playing state.
 * The fix adds 'TRANSITIONING' to the states that trigger pause.
 */

const modulePath = path.resolve(__dirname, '../lib/actions/playpause.js');

let playpauseHandler, playHandler, pauseHandler;
const mockApi = {
  registerAction: (name, handler) => {
    if (name === 'playpause') playpauseHandler = handler;
    if (name === 'play') playHandler = handler;
    if (name === 'pause') pauseHandler = handler;
  }
};

const mod = await import(modulePath);
mod.default(mockApi);

function createMockPlayer(playbackState) {
  const calls = { play: 0, pause: 0 };
  return {
    calls,
    coordinator: {
      state: { playbackState },
      play: () => { calls.play++; return Promise.resolve(); },
      pause: () => { calls.pause++; return Promise.resolve(); }
    }
  };
}

describe('Bug Condition: playpause toggle works correctly', () => {
  it('should pause when state is PLAYING', async () => {
    const player = createMockPlayer('PLAYING');
    const result = await playpauseHandler(player);
    expect(result.paused).toBe(true);
    expect(player.calls.pause).toBe(1);
    expect(player.calls.play).toBe(0);
  });

  it('should pause when state is TRANSITIONING', async () => {
    const player = createMockPlayer('TRANSITIONING');
    const result = await playpauseHandler(player);
    expect(result.paused).toBe(true);
    expect(player.calls.pause).toBe(1);
    expect(player.calls.play).toBe(0);
  });

  it('should play when state is PAUSED_PLAYBACK', async () => {
    const player = createMockPlayer('PAUSED_PLAYBACK');
    const result = await playpauseHandler(player);
    expect(result.paused).toBe(false);
    expect(player.calls.play).toBe(1);
    expect(player.calls.pause).toBe(0);
  });

  it('should play when state is STOPPED', async () => {
    const player = createMockPlayer('STOPPED');
    const result = await playpauseHandler(player);
    expect(result.paused).toBe(false);
    expect(player.calls.play).toBe(1);
    expect(player.calls.pause).toBe(0);
  });
});

describe('Preservation: play and pause actions unchanged', () => {
  it('play action always calls play()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PLAYING', 'PAUSED_PLAYBACK', 'STOPPED', 'TRANSITIONING'),
        async (state) => {
          const player = createMockPlayer(state);
          await playHandler(player);
          expect(player.calls.play).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('pause action always calls pause()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PLAYING', 'PAUSED_PLAYBACK', 'STOPPED', 'TRANSITIONING'),
        async (state) => {
          const player = createMockPlayer(state);
          await pauseHandler(player);
          expect(player.calls.pause).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Property: playpause is a proper toggle', () => {
  it('for playing states → pause; for non-playing states → play', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PLAYING', 'TRANSITIONING', 'PAUSED_PLAYBACK', 'STOPPED'),
        async (state) => {
          const player = createMockPlayer(state);
          const result = await playpauseHandler(player);

          if (state === 'PLAYING' || state === 'TRANSITIONING') {
            expect(result.paused).toBe(true);
            expect(player.calls.pause).toBe(1);
            expect(player.calls.play).toBe(0);
          } else {
            expect(result.paused).toBe(false);
            expect(player.calls.play).toBe(1);
            expect(player.calls.pause).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
