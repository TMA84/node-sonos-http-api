import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import HttpAPI from '../lib/sonos-http-api.js';
import registerZones from '../lib/actions/zones.js';

/**
 * When a speaker wakes from standby, a zone can briefly have no coordinator.
 * Before the fix, /zones threw synchronously, the error escaped the promise
 * chain and the request never got a response (dashboard: "request timed out").
 */

function createApi(zones) {
  const discovery = new EventEmitter();
  discovery.zones = zones;
  discovery.getPlayer = () => undefined;
  discovery.getAnyPlayer = () => ({ roomName: 'Any', system: { zones } });
  return new HttpAPI(discovery, { port: 0, webroot: '.' });
}

function request(api, url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no response for ${url}`)), 1000);
    const res = new EventEmitter();
    res.headersSent = false;
    res.setHeader = () => {};
    res.write = (b) => { res.body = String(b); };
    res.end = () => {
      clearTimeout(timer);
      resolve({ status: res.statusCode, body: JSON.parse(res.body) });
    };
    api.requestHandler({ url }, res);
  });
}

const living = { uuid: 'RINCON_A', roomName: 'Living', state: {}, groupState: {}, baseUrl: 'http://a' };
living.coordinator = living;
const office = { uuid: 'RINCON_B', roomName: 'Office', state: {}, groupState: {}, baseUrl: 'http://b' };

describe('/zones with incomplete topology', () => {
  it('answers instead of hanging when a zone has no coordinator', async () => {
    const zones = [
      { uuid: 'RINCON_A', coordinator: living, members: [living] },
      { uuid: 'RINCON_B', coordinator: undefined, members: [office] },
      { uuid: 'RINCON_C', coordinator: undefined, members: [] },
    ];
    const api = createApi(zones);
    registerZones(api);

    const { status, body } = await request(api, '/zones');
    expect(status).toBe(200);
    expect(body.map((z) => z.uuid)).toEqual(['RINCON_A', 'RINCON_B']);
    expect(body[0].coordinator.roomName).toBe('Living');
    expect(body[1].coordinator.roomName).toBe('Office');
    expect(body[1].coordinator.coordinator).toBeUndefined();
  });
});

describe('action dispatch error handling', () => {
  it('returns 500 when an action throws synchronously', async () => {
    const api = createApi([{}]);
    api.registerAction('boom', () => { throw new Error('kaputt'); });

    expect(await request(api, '/boom')).toEqual({
      status: 500,
      body: { status: 'error', error: 'kaputt' },
    });
  });
});
