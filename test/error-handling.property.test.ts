// Feature: project-modernization, Property 4: Invalid Player Returns 404
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EventEmitter } from 'node:events';
import HttpAPI from '../lib/sonos-http-api.js';

/**
 * Validates: Requirements 13.1
 *
 * For any string that does not match a registered player name,
 * a request to /{invalidPlayer}/{action} SHALL return HTTP 404
 * with a JSON body containing `status: "error"`.
 */

// Known registered player names for the mock discovery
const REGISTERED_PLAYERS = ['Living Room', 'Kitchen', 'Bedroom', 'Office', 'Bathroom'];

function createMockDiscovery() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    zones: [{ name: 'zone1' }],
    getPlayer(name: string) {
      if (REGISTERED_PLAYERS.includes(name)) {
        return { roomName: name };
      }
      return undefined;
    },
    getAnyPlayer() {
      return { roomName: REGISTERED_PLAYERS[0] };
    },
  });
}

function createMockRequest(url: string) {
  return { url } as { url: string };
}

function createMockResponse() {
  let statusCode = 0;
  let body = '';
  const headers: Record<string, string> = {};
  let headersSent = false;

  return {
    get statusCode() { return statusCode; },
    set statusCode(code: number) { statusCode = code; },
    get headersSent() { return headersSent; },
    setHeader(name: string, value: string) { headers[name] = value; },
    write(data: Buffer | string) { body += data.toString(); },
    end() { headersSent = true; },
    getBody() { return body; },
    getStatusCode() { return statusCode; },
  };
}

describe('Invalid Player Returns 404 (Property 4)', () => {
  it('any string not matching a registered player returns 404 with status: "error"', async () => {
    const discovery = createMockDiscovery();
    const settings = { port: 5005, webroot: '/tmp', cacheDir: '/tmp' };
    const api = new HttpAPI(discovery, settings);

    // Register a dummy action so the 404 is triggered by player lookup, not action lookup
    api.registerAction('play', () => Promise.resolve({ status: 'success' }));

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) => !REGISTERED_PLAYERS.includes(s)
            && !s.includes('/')
            && !s.includes('%')
            && s !== 'favicon.ico'
            && s !== 'events'
        ),
        (invalidPlayerName) => {
          const encodedName = encodeURIComponent(invalidPlayerName);
          const req = createMockRequest(`/${encodedName}/play`);
          const res = createMockResponse();

          api.requestHandler(req, res);

          expect(res.getStatusCode()).toBe(404);
          const parsed = JSON.parse(res.getBody());
          expect(parsed.status).toBe('error');
          expect(parsed.error).toContain('not found');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: project-modernization, Property 5: Unknown Action Returns 400

/**
 * Validates: Requirements 13.2
 *
 * For any string that is not a registered action name,
 * a request to /{validPlayer}/{unknownAction} SHALL return HTTP 400
 * with a JSON body containing `status: "error"` and the unrecognized action name.
 */

// Known registered action names for the mock
const REGISTERED_ACTIONS = ['play', 'pause', 'volume', 'mute', 'next', 'previous', 'state', 'favorite'];

describe('Unknown Action Returns 400 (Property 5)', () => {
  it('any string not matching a registered action returns 400 with status: "error" and action name', async () => {
    const discovery = createMockDiscovery();
    const settings = { port: 5005, webroot: '/tmp', cacheDir: '/tmp' };
    const api = new HttpAPI(discovery, settings);

    // Register known actions so we can test unknown ones
    for (const action of REGISTERED_ACTIONS) {
      api.registerAction(action, () => Promise.resolve({ status: 'success' }));
    }

    const knownPlayer = REGISTERED_PLAYERS[0]; // 'Living Room'

    // Object prototype properties that would be truthy on a plain object lookup
    const OBJECT_PROTO_KEYS = Object.getOwnPropertyNames(Object.prototype);

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) => !REGISTERED_ACTIONS.includes(s.toLowerCase())
            && !OBJECT_PROTO_KEYS.includes(s.toLowerCase())
            && !s.includes('/')
            && !s.includes('%')
            && !s.includes('?')
            && !s.includes('#')
            && !s.includes(' ')
        ),
        (unknownAction) => {
          const encodedPlayer = encodeURIComponent(knownPlayer);
          // Action is used raw in the URL (the handler does not decode it, only lowercases)
          const req = createMockRequest(`/${encodedPlayer}/${unknownAction}`);
          const res = createMockResponse();

          api.requestHandler(req, res);

          expect(res.getStatusCode()).toBe(400);
          const parsed = JSON.parse(res.getBody());
          expect(parsed.status).toBe('error');
          expect(parsed.error).toContain('Unknown action:');
          expect(parsed.error).toContain(unknownAction.toLowerCase());
        }
      ),
      { numRuns: 100 }
    );
  });
});
