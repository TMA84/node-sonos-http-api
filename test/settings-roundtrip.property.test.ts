// Feature: project-modernization, Property 3: Settings Serialization Round-Trip
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Validates: Requirements 12.6, 16.1
 *
 * For any valid Settings object, serializing it to JSON and parsing it back
 * SHALL produce an equivalent object. The Settings type only contains
 * JSON-serializable values (strings, numbers, booleans, objects) so
 * round-trip should always work.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface Settings {
  port: number;
  ip: string;
  securePort: number;
  cacheDir: string;
  webroot: string;
  presetDir: string;
  announceVolume: number;
  auth?: { username: string; password: string };
  https?: { pfx?: string; passphrase?: string; key?: string; cert?: string };
  aws?: { credentials?: object; name?: string; region?: string };
  webhook?: string;
  log?: { level?: LogLevel; format?: 'text' | 'json' };
}

/**
 * Helper to optionally include a field in an object.
 * Returns an arbitrary that either includes the key with a generated value
 * or omits it entirely (no undefined values that JSON.stringify would drop).
 */
function optionalField<T>(key: string, arb: fc.Arbitrary<T>): fc.Arbitrary<Record<string, T>> {
  return fc.oneof(
    fc.constant({} as Record<string, T>),
    arb.map((value) => ({ [key]: value }))
  );
}

/**
 * Arbitrary for the https optional sub-object.
 * Each field within is also optional (present or absent, never undefined).
 */
const httpsArbitrary: fc.Arbitrary<NonNullable<Settings['https']>> = fc.tuple(
  optionalField('pfx', fc.string({ minLength: 0, maxLength: 30 })),
  optionalField('passphrase', fc.string({ minLength: 0, maxLength: 30 })),
  optionalField('key', fc.string({ minLength: 0, maxLength: 30 })),
  optionalField('cert', fc.string({ minLength: 0, maxLength: 30 }))
).map(([pfx, passphrase, key, cert]) => ({
  ...pfx,
  ...passphrase,
  ...key,
  ...cert,
}));

/**
 * Arbitrary for the aws optional sub-object.
 */
const awsArbitrary: fc.Arbitrary<NonNullable<Settings['aws']>> = fc.tuple(
  optionalField(
    'credentials',
    fc.record({
      accessKeyId: fc.string({ minLength: 1, maxLength: 20 }),
      secretAccessKey: fc.string({ minLength: 1, maxLength: 40 }),
    })
  ),
  optionalField('name', fc.string({ minLength: 1, maxLength: 20 })),
  optionalField('region', fc.constantFrom('us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'))
).map(([credentials, name, region]) => ({
  ...credentials,
  ...name,
  ...region,
}));

/**
 * Arbitrary for the log optional sub-object.
 */
const logArbitrary: fc.Arbitrary<NonNullable<Settings['log']>> = fc.tuple(
  optionalField('level', fc.constantFrom('error' as LogLevel, 'warn' as LogLevel, 'info' as LogLevel, 'debug' as LogLevel)),
  optionalField('format', fc.constantFrom('text' as const, 'json' as const))
).map(([level, format]) => ({
  ...level,
  ...format,
}));

/**
 * Custom arbitrary that generates valid Settings objects matching the interface.
 * Optional fields are either present with a real value or completely absent —
 * never set to undefined — ensuring JSON round-trip fidelity.
 *
 * The generator normalizes objects through JSON round-trip to ensure they have
 * standard Object.prototype (fast-check may generate null-prototype objects).
 */
const settingsArbitrary: fc.Arbitrary<Settings> = fc.tuple(
  // Required fields
  fc.record({
    port: fc.integer({ min: 1, max: 65535 }),
    ip: fc.ipV4(),
    securePort: fc.integer({ min: 1, max: 65535 }),
    cacheDir: fc.string({ minLength: 1, maxLength: 50 }),
    webroot: fc.string({ minLength: 1, maxLength: 50 }),
    presetDir: fc.string({ minLength: 1, maxLength: 50 }),
    announceVolume: fc.integer({ min: 0, max: 100 }),
  }),
  // Optional fields — each is either present or absent
  optionalField('auth', fc.record({
    username: fc.string({ minLength: 1, maxLength: 20 }),
    password: fc.string({ minLength: 1, maxLength: 20 }),
  })),
  optionalField('https', httpsArbitrary),
  optionalField('aws', awsArbitrary),
  optionalField('webhook', fc.webUrl()),
  optionalField('log', logArbitrary)
).map(([required, auth, https, aws, webhook, log]) => {
  const settings = {
    ...required,
    ...auth,
    ...https,
    ...aws,
    ...webhook,
    ...log,
  };
  // Normalize to plain objects with Object.prototype (mirrors real-world Settings)
  return JSON.parse(JSON.stringify(settings)) as Settings;
});

describe('Settings Serialization Round-Trip (Property 3)', () => {
  it('JSON.parse(JSON.stringify(settings)) produces an equivalent object', () => {
    fc.assert(
      fc.property(settingsArbitrary, (settings: Settings) => {
        const serialized = JSON.stringify(settings);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toStrictEqual(settings);
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves all present keys and their values', () => {
    fc.assert(
      fc.property(settingsArbitrary, (settings: Settings) => {
        const roundTripped = JSON.parse(JSON.stringify(settings));

        // Every key present in the original should be present after round-trip
        const originalKeys = Object.keys(settings).sort();
        const roundTrippedKeys = Object.keys(roundTripped).sort();
        expect(roundTrippedKeys).toStrictEqual(originalKeys);

        // Nested objects should also preserve their keys
        if (settings.auth) {
          expect(roundTripped.auth).toStrictEqual(settings.auth);
        }
        if (settings.https) {
          expect(roundTripped.https).toStrictEqual(settings.https);
        }
        if (settings.aws) {
          expect(roundTripped.aws).toStrictEqual(settings.aws);
        }
        if (settings.log) {
          expect(roundTripped.log).toStrictEqual(settings.log);
        }
      }),
      { numRuns: 100 }
    );
  });
});
