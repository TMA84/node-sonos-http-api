import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Spotify URI Fix Tests
 * 
 * Issue #911: 500 when trying to play from Spotify (album URI format wrong)
 * Issue #893: Spotify Podcast Episodes error 500 (episodes not handled)
 */

const modulePath = path.resolve(__dirname, '../lib/actions/spotify.js');

let spotifyHandler;
const mockApi = {
  registerAction: (name, handler) => {
    if (name === 'spotify') spotifyHandler = handler;
  }
};

const mod = await import(modulePath);
mod.default(mockApi);

function createMockPlayer() {
  const calls = { addURIToQueue: [], setAVTransport: [], trackSeek: [], play: [] };
  return {
    calls,
    coordinator: {
      uuid: 'RINCON_TEST123',
      state: { trackNo: 1 },
      addURIToQueue: (uri, metadata, enqueueAsNext, desiredFirstTrackNumberEnqueued) => {
        calls.addURIToQueue.push({ uri, metadata });
        return Promise.resolve({ firsttracknumberenqueued: desiredFirstTrackNumberEnqueued || 1 });
      },
      setAVTransport: (uri, metadata) => {
        calls.setAVTransport.push({ uri, metadata });
        return Promise.resolve();
      },
      trackSeek: (trackNo) => {
        calls.trackSeek.push(trackNo);
        return Promise.resolve();
      },
      play: () => {
        calls.play.push(true);
        return Promise.resolve();
      }
    },
    system: {
      getServiceId: (name) => 9,
      getServiceType: (name) => 2311
    }
  };
}

describe('Bug Fix: Spotify album URI uses correct container prefix', () => {
  it('album URI should use 0004206c prefix', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:album:1zQ6F8gMagKcPL4SoA80cx']);

    const { uri } = player.calls.addURIToQueue[0];
    expect(uri).toContain('0004206c');
    expect(uri).toContain('spotify%3Aalbum%3A1zQ6F8gMagKcPL4SoA80cx');
  });

  it('album metadata should use musicAlbum class', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:album:1zQ6F8gMagKcPL4SoA80cx']);

    const { metadata } = player.calls.addURIToQueue[0];
    expect(metadata).toContain('object.container.album.musicAlbum');
    expect(metadata).toContain('SA_RINCON2311');
  });
});

describe('Bug Fix: Spotify episodes are handled correctly', () => {
  it('episode URI should use x-sonos-spotify format', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:episode:7iFmGKpRo0FOCaMfH47Spv']);

    const { uri } = player.calls.addURIToQueue[0];
    expect(uri).toContain('x-sonos-spotify:');
    expect(uri).toContain('spotify%3Aepisode%3A7iFmGKpRo0FOCaMfH47Spv');
    expect(uri).toContain('sid=9');
  });

  it('show URI should use container format', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:show:abc123']);

    const { uri } = player.calls.addURIToQueue[0];
    expect(uri).toContain('0006206c');
    expect(uri).toContain('spotify%3Ashow%3Aabc123');
  });
});

describe('Preservation: Spotify tracks still work', () => {
  it('track URI should use x-sonos-spotify format with correct flags', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:track:4PTG3Z6ehGkBFwjybzWkR8']);

    const { uri } = player.calls.addURIToQueue[0];
    expect(uri).toContain('x-sonos-spotify:');
    expect(uri).toContain('spotify%3Atrack%3A4PTG3Z6ehGkBFwjybzWkR8');
    expect(uri).toContain('sid=9');
    expect(uri).toContain('flags=8224');
  });

  it('track metadata should use musicTrack class', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:track:4PTG3Z6ehGkBFwjybzWkR8']);

    const { metadata } = player.calls.addURIToQueue[0];
    expect(metadata).toContain('object.item.audioItem.musicTrack');
  });
});

describe('Preservation: Spotify playlists still work', () => {
  it('playlist URI should use 0006206c prefix', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:playlist:37i9dQZF1DWVFJtzvDHN4L']);

    const { uri } = player.calls.addURIToQueue[0];
    expect(uri).toContain('0006206c');
    expect(uri).toContain('spotify%3Aplaylist%3A37i9dQZF1DWVFJtzvDHN4L');
  });
});

describe('Preservation: queue and next actions still work', () => {
  it('queue action adds to queue without playing', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['queue', 'spotify:track:abc123']);

    expect(player.calls.addURIToQueue.length).toBe(1);
    expect(player.calls.play.length).toBe(0);
  });

  it('next action adds to queue at next position', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['next', 'spotify:track:abc123']);

    expect(player.calls.addURIToQueue.length).toBe(1);
    expect(player.calls.play.length).toBe(0);
  });

  it('now action sets transport, adds to queue, seeks, and plays', async () => {
    const player = createMockPlayer();
    await spotifyHandler(player, ['now', 'spotify:track:abc123']);

    expect(player.calls.setAVTransport.length).toBe(1);
    expect(player.calls.addURIToQueue.length).toBe(1);
    expect(player.calls.trackSeek.length).toBe(1);
    expect(player.calls.play.length).toBe(1);
  });
});
