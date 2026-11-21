import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import HttpAPI from '../lib/sonos-http-api.js';

/**
 * Action dispatch must only call registered actions, never inherited
 * Object.prototype members (CodeQL js/unvalidated-dynamic-method-call).
 * Before the fix, GET /constructor invoked Object(player) and dumped the
 * player object with status 200.
 */

function createApi() {
  const discovery = new EventEmitter();
  discovery.zones = [{}];
  discovery.getPlayer = (name) => (name === 'Kitchen' ? { roomName: 'Kitchen' } : undefined);
  discovery.getAnyPlayer = () => ({ roomName: 'Any', internal: 'should not leak' });
  const api = new HttpAPI(discovery, { port: 0, webroot: '.' });
  return api;
}

function request(api, url) {
  return new Promise((resolve) => {
    const res = new EventEmitter();
    res.headersSent = false;
    res.setHeader = () => {};
    res.write = (b) => { res.body = String(b); };
    res.end = () => resolve({ status: res.statusCode, body: JSON.parse(res.body) });
    api.requestHandler({ url }, res);
  });
}

describe('action dispatch', () => {
  it.each([
    '/constructor',
    '/__proto__',
    '/hasownproperty',
    '/tostring',
    '/valueof',
    '/Kitchen/constructor',
  ])('rejects prototype member %s with 400', async (url) => {
    const { status, body } = await request(createApi(), url);
    expect(status).toBe(400);
    expect(body.status).toBe('error');
    expect(JSON.stringify(body)).not.toContain('should not leak');
  });

  it('still dispatches registered actions with player and values', async () => {
    const api = createApi();
    api.registerAction('echo', (player, values) => ({ room: player.roomName, values }));

    expect(await request(api, '/echo')).toEqual({
      status: 200,
      body: { room: 'Any', values: [] },
    });
    expect(await request(api, '/Kitchen/ECHO/x')).toEqual({
      status: 200,
      body: { room: 'Kitchen', values: ['x'] },
    });
  });

  it('returns 400 for unknown actions', async () => {
    const { status } = await request(createApi(), '/doesnotexist');
    expect(status).toBe(400);
  });
});
