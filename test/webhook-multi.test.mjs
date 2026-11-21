import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import HttpAPI, { normalizeWebhooks } from '../lib/sonos-http-api.js';

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
