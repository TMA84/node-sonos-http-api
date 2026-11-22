import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import HttpAPI, { normalizeWebhooks, WebhookFailureLog } from '../lib/sonos-http-api.js';

/**
 * Multiple webhook receivers (GitHub issue #8).
 * The `webhook` setting accepts a string or an array of strings.
 */

describe('normalizeWebhooks', () => {
  it('returns [] for missing / empty values', () => {
    expect(normalizeWebhooks(undefined)).toEqual([]);
    expect(normalizeWebhooks('')).toEqual([]);
    expect(normalizeWebhooks('   ')).toEqual([]);
    expect(normalizeWebhooks([])).toEqual([]);
  });

  it('wraps a single string', () => {
    expect(normalizeWebhooks('http://a/')).toEqual(['http://a/']);
  });

  it('keeps arrays, trims, drops non-strings, empties and duplicates', () => {
    expect(normalizeWebhooks([' http://a/ ', 'http://b/', '', null, 42, 'http://a/']))
      .toEqual(['http://a/', 'http://b/']);
  });
});

function startReceiver() {
  return new Promise((resolve) => {
    const received = [];
    const server = http.createServer((req, res) => {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => {
        received.push({ headers: req.headers, body: JSON.parse(data) });
        res.end('ok');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, received, url: `http://127.0.0.1:${server.address().port}/` });
    });
  });
}

async function waitFor(fn, timeout = 2000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('timeout waiting for webhook');
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('HttpAPI webhook delivery', () => {
  let a;
  let b;

  beforeAll(async () => {
    a = await startReceiver();
    b = await startReceiver();
  });

  afterAll(() => {
    a.server.close();
    b.server.close();
  });

  it('POSTs each event to every configured webhook, including custom header', async () => {
    const discovery = new EventEmitter();
    new HttpAPI(discovery, {
      port: 0,
      webroot: '.',
      webhook: [a.url, b.url],
      webhookHeaderName: 'X-Token',
      webhookHeaderContents: 'secret',
    });

    discovery.emit('volume-change', { roomName: 'Kitchen', newVolume: 12 });

    await waitFor(() => a.received.length === 1 && b.received.length === 1);
    for (const r of [a, b]) {
      expect(r.received[0].body).toEqual({ type: 'volume-change', data: { roomName: 'Kitchen', newVolume: 12 } });
      expect(r.received[0].headers['x-token']).toBe('secret');
    }
  });

  it('still supports a single webhook string', async () => {
    a.received.length = 0;
    b.received.length = 0;
    const discovery = new EventEmitter();
    new HttpAPI(discovery, { port: 0, webroot: '.', webhook: a.url });

    discovery.emit('mute-change', { roomName: 'Bath', newMute: true });

    await waitFor(() => a.received.length === 1);
    expect(a.received[0].body.type).toBe('mute-change');
    expect(b.received.length).toBe(0);
  });

  it('an unreachable receiver does not block the others', async () => {
    a.received.length = 0;
    const discovery = new EventEmitter();
    new HttpAPI(discovery, { port: 0, webroot: '.', webhook: ['http://127.0.0.1:1/', a.url] });

    discovery.emit('transport-state', { roomName: 'Office' });

    await waitFor(() => a.received.length === 1);
    expect(a.received[0].body.type).toBe('transport-state');
  });
});

describe('WebhookFailureLog', () => {
  function fakeLog() {
    return { error: vi.fn(), info: vi.fn(), debug: vi.fn() };
  }

  it('logs only the first failure per endpoint as error, the rest at debug', () => {
    const log = fakeLog();
    const w = new WebhookFailureLog(log);
    const err = new Error('ECONNREFUSED');

    w.recordFailure('http://a/', err);
    w.recordFailure('http://a/', err);
    w.recordFailure('http://a/', err);

    expect(log.error).toHaveBeenCalledTimes(2); // message + error object, once
    expect(log.error.mock.calls[0]).toContain('http://a/');
    expect(log.debug).toHaveBeenCalledTimes(2);
    expect(log.info).not.toHaveBeenCalled();
  });

  it('logs recovery once with the number of failed deliveries, then re-arms', () => {
    const log = fakeLog();
    const w = new WebhookFailureLog(log);

    w.recordSuccess('http://a/');
    expect(log.info).not.toHaveBeenCalled();

    w.recordFailure('http://a/', new Error('x'));
    w.recordFailure('http://a/', new Error('x'));
    w.recordSuccess('http://a/');
    w.recordSuccess('http://a/');

    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.info.mock.calls[0]).toEqual(['Webhook endpoint', 'http://a/', 'is reachable again after', 2, 'failed deliveries.']);

    w.recordFailure('http://a/', new Error('x'));
    expect(log.error).toHaveBeenCalledTimes(4); // a new outage is reported again
  });

  it('tracks endpoints independently', () => {
    const log = fakeLog();
    const w = new WebhookFailureLog(log);

    w.recordFailure('http://a/', new Error('x'));
    w.recordFailure('http://b/', new Error('x'));
    w.recordSuccess('http://a/');

    expect(log.error).toHaveBeenCalledTimes(4);
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.info.mock.calls[0][1]).toBe('http://a/');
  });
});

describe('HttpAPI webhook logging with a receiver that goes away and comes back', () => {
  it('logs one error while down and one info after recovery', async () => {
    const probe = await startReceiver();
    const port = probe.server.address().port;
    await new Promise((r) => probe.server.close(r));
    const url = `http://127.0.0.1:${port}/`;

    const lines = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => { lines.push(args.join(' ')); });
    try {
      const discovery = new EventEmitter();
      new HttpAPI(discovery, { port: 0, webroot: '.', webhook: url });

      for (let i = 0; i < 5; i++) discovery.emit('volume-change', { n: i });
      await waitFor(() => lines.some((l) => l.includes(`Could not reach webhook endpoint ${url}`)));
      await new Promise((r) => setTimeout(r, 200));

      const errorLines = lines.filter((l) => l.includes(`Could not reach webhook endpoint ${url}`));
      expect(errorLines).toHaveLength(1);

      const received = [];
      const server = http.createServer((req, res) => {
        req.resume();
        req.on('end', () => { received.push(1); res.end('ok'); });
      });
      await new Promise((r) => server.listen(port, '127.0.0.1', r));
      try {
        discovery.emit('volume-change', { n: 'back' });
        discovery.emit('volume-change', { n: 'again' });
        await waitFor(() => received.length === 2);
        await new Promise((r) => setTimeout(r, 50));
      } finally {
        server.close();
      }

      const recovered = lines.filter((l) => l.includes(`INFO Webhook endpoint ${url} is reachable again`));
      expect(recovered).toHaveLength(1);
      expect(recovered[0]).toContain(url);
      expect(lines.filter((l) => l.includes(`Could not reach webhook endpoint ${url}`))).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});
