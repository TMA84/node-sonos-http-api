import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * Unit tests for zones.js fetch behavior.
 * Validates: Requirements 10.5, 10.6, 10.10
 *
 * Tests cover:
 * - fetchZones with mocked success response
 * - fetchZones with network error
 * - fetchZones with HTTP error status
 * - fetchZones with timeout
 * - renderEmpty and renderLoading output
 */

// --- Helper to load zones.js functions in a jsdom context ---

async function loadZonesModule(dom: JSDOM) {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');

  const zonesPath = resolve(process.cwd(), 'static/js/zones.js');
  let source = readFileSync(zonesPath, 'utf-8');

  // Strip ES module syntax and DOMContentLoaded listener
  source = source.replace(/^export\s+/gm, '');
  source = source.replace(/^import\s+.*$/gm, '');
  source = source.replace(/if\s*\(typeof document[\s\S]*$/, '');

  const window = dom.window;

  const script = new window.Function('document', `
    ${source}
    return { fetchZones, renderEmpty, renderLoading };
  `);

  return script.call(window, window.document) as {
    fetchZones: () => Promise<unknown[]>;
    renderEmpty: (container: HTMLElement) => void;
    renderLoading: (container: HTMLElement) => void;
  };
}

function createDOM() {
  return new JSDOM('<!DOCTYPE html><html><body><div id="zones"></div></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable',
  });
}

describe('zones.js fetch behavior', () => {
  let dom: JSDOM;
  let fns: Awaited<ReturnType<typeof loadZonesModule>>;

  beforeEach(async () => {
    dom = createDOM();
    fns = await loadZonesModule(dom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchZones — success', () => {
    it('returns zone data on successful response', async () => {
      const mockZones = [
        { uuid: 'zone-1', coordinator: { uuid: 'p1', roomName: 'Living Room' }, members: [] },
      ];

      // Mock fetch on the jsdom window
      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockZones),
      });

      const result = await fns.fetchZones();
      expect(result).toEqual(mockZones);
    });

    it('returns an empty array when server responds with empty zones', async () => {
      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await fns.fetchZones();
      expect(result).toEqual([]);
    });
  });

  describe('fetchZones — network error', () => {
    it('throws with network failure message when fetch rejects', async () => {
      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockRejectedValue(
        new TypeError('Failed to fetch')
      );

      await expect(fns.fetchZones()).rejects.toThrow(
        'Unable to connect to Sonos API. Check that the server is running.'
      );
    });
  });

  describe('fetchZones — HTTP error status', () => {
    it('throws with HTTP error message for non-2xx response', async () => {
      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fns.fetchZones()).rejects.toThrow(
        'Failed to load zone data (HTTP 500).'
      );
    });

    it('throws with HTTP error message for 404 response', async () => {
      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fns.fetchZones()).rejects.toThrow(
        'Failed to load zone data (HTTP 404).'
      );
    });
  });

  describe('fetchZones — timeout', () => {
    it('throws with timeout message when request is aborted', async () => {
      // Simulate an AbortError (what happens when AbortController.abort() fires)
      const abortError = new dom.window.DOMException('The operation was aborted.', 'AbortError');

      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockRejectedValue(abortError);

      await expect(fns.fetchZones()).rejects.toThrow(
        'Unable to connect to Sonos API. The request timed out.'
      );
    });
  });

  describe('fetchZones — invalid JSON', () => {
    it('throws with invalid data message when JSON parsing fails', async () => {
      (dom.window as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });

      await expect(fns.fetchZones()).rejects.toThrow(
        'Received invalid data from the server.'
      );
    });
  });
});

describe('zones.js render functions', () => {
  let dom: JSDOM;
  let fns: Awaited<ReturnType<typeof loadZonesModule>>;

  beforeEach(async () => {
    dom = createDOM();
    fns = await loadZonesModule(dom);
  });

  describe('renderEmpty', () => {
    it('renders a heading and empty state message', () => {
      const container = dom.window.document.createElement('div');
      fns.renderEmpty(container);

      const heading = container.querySelector('h2');
      expect(heading).not.toBeNull();
      expect(heading!.textContent).toBe('Zones');

      const emptyDiv = container.querySelector('.empty-message');
      expect(emptyDiv).not.toBeNull();
    });

    it('displays "No speakers discovered yet" message', () => {
      const container = dom.window.document.createElement('div');
      fns.renderEmpty(container);

      expect(container.textContent).toContain('No speakers discovered yet');
    });

    it('includes a refresh button', () => {
      const container = dom.window.document.createElement('div');
      fns.renderEmpty(container);

      const btn = container.querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn!.textContent).toBe('Refresh');
      expect(btn!.getAttribute('aria-label')).toBe('Refresh zone data');
    });
  });

  describe('renderLoading', () => {
    it('renders a heading and loading indicator', () => {
      const container = dom.window.document.createElement('div');
      fns.renderLoading(container);

      const heading = container.querySelector('h2');
      expect(heading).not.toBeNull();
      expect(heading!.textContent).toBe('Zones');

      const loadingDiv = container.querySelector('.loading');
      expect(loadingDiv).not.toBeNull();
    });

    it('displays loading text', () => {
      const container = dom.window.document.createElement('div');
      fns.renderLoading(container);

      expect(container.textContent).toContain('Loading zones');
    });

    it('has aria-live attribute for accessibility', () => {
      const container = dom.window.document.createElement('div');
      fns.renderLoading(container);

      const loadingDiv = container.querySelector('.loading');
      expect(loadingDiv!.getAttribute('aria-live')).toBe('polite');
    });

    it('clears existing container content', () => {
      const container = dom.window.document.createElement('div');
      container.innerHTML = '<p>Old content</p>';

      fns.renderLoading(container);

      expect(container.textContent).not.toContain('Old content');
    });
  });
});
