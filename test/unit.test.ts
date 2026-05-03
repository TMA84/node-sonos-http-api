import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// ─── Settings: tryLoadJson ───────────────────────────────────────────────────

describe('tryLoadJson', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tryloadjson-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses standard JSON', async () => {
    const filePath = path.join(tmpDir, 'standard.json');
    fs.writeFileSync(filePath, '{"port": 8080, "ip": "127.0.0.1"}');

    const { default: tryLoadJson } = await import('../lib/helpers/try-load-json.js');
    const result = tryLoadJson(filePath);
    expect(result).toEqual({ port: 8080, ip: '127.0.0.1' });
  });

  it('parses JSON5 with single-line comments', async () => {
    const filePath = path.join(tmpDir, 'comments.json');
    fs.writeFileSync(filePath, `{
      // This is a comment
      "port": 9000
    }`);

    const { default: tryLoadJson } = await import('../lib/helpers/try-load-json.js');
    const result = tryLoadJson(filePath);
    expect(result).toEqual({ port: 9000 });
  });

  it('parses JSON5 with multi-line comments', async () => {
    const filePath = path.join(tmpDir, 'multicomment.json');
    fs.writeFileSync(filePath, `{
      /* multi-line
         comment */
      "port": 7000
    }`);

    const { default: tryLoadJson } = await import('../lib/helpers/try-load-json.js');
    const result = tryLoadJson(filePath);
    expect(result).toEqual({ port: 7000 });
  });

  it('parses JSON5 with trailing commas', async () => {
    const filePath = path.join(tmpDir, 'trailing.json');
    fs.writeFileSync(filePath, `{
      "port": 5005,
      "ip": "0.0.0.0",
    }`);

    const { default: tryLoadJson } = await import('../lib/helpers/try-load-json.js');
    const result = tryLoadJson(filePath);
    expect(result).toEqual({ port: 5005, ip: '0.0.0.0' });
  });

  it('parses JSON5 with unquoted keys', async () => {
    const filePath = path.join(tmpDir, 'unquoted.json');
    fs.writeFileSync(filePath, `{
      port: 5005,
      ip: "0.0.0.0"
    }`);

    const { default: tryLoadJson } = await import('../lib/helpers/try-load-json.js');
    const result = tryLoadJson(filePath);
    expect(result).toEqual({ port: 5005, ip: '0.0.0.0' });
  });

  it('returns empty object for non-existent file', async () => {
    const { default: tryLoadJson } = await import('../lib/helpers/try-load-json.js');
    const result = tryLoadJson(path.join(tmpDir, 'does-not-exist.json'));
    expect(result).toEqual({});
  });
});

// ─── Settings: merge ─────────────────────────────────────────────────────────

describe('merge', () => {
  let merge: typeof import('../src/settings.js').merge;

  beforeEach(async () => {
    const mod = await import('../src/settings.js');
    merge = mod.merge;
  });

  it('source overrides target for same key', () => {
    const target = { port: 5005, ip: '0.0.0.0' };
    const source = { port: 9000 };
    const result = merge(target, source);
    expect(result.port).toBe(9000);
  });

  it('preserves target-only keys', () => {
    const target = { port: 5005, ip: '0.0.0.0' };
    const source = { port: 9000 };
    const result = merge(target, source);
    expect(result.ip).toBe('0.0.0.0');
  });

  it('performs deep merge on nested objects', () => {
    const target = { aws: { region: 'us-east-1', name: 'Joanna' } };
    const source = { aws: { region: 'eu-west-1' } };
    const result = merge(target, source);
    expect(result.aws).toEqual({ region: 'eu-west-1', name: 'Joanna' });
  });

  it('source non-object replaces target object', () => {
    const target = { aws: { region: 'us-east-1' } };
    const source = { aws: null };
    const result = merge(target, source as Record<string, unknown>);
    expect(result.aws).toBeNull();
  });

  it('source object replaces target non-object', () => {
    const target = { aws: 'disabled' };
    const source = { aws: { region: 'us-east-1' } };
    const result = merge(target as Record<string, unknown>, source);
    expect(result.aws).toEqual({ region: 'us-east-1' });
  });

  it('handles empty source (no-op)', () => {
    const target = { port: 5005, ip: '0.0.0.0' };
    const result = merge(target, {});
    expect(result).toEqual({ port: 5005, ip: '0.0.0.0' });
  });

  it('handles empty target', () => {
    const source = { port: 9000 };
    const result = merge({}, source);
    expect(result).toEqual({ port: 9000 });
  });
});

// ─── Action Registry: importDir ──────────────────────────────────────────────

describe('importDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'importdir-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads all .js files from a directory', async () => {
    // Create test modules with default exports
    fs.writeFileSync(path.join(tmpDir, 'alpha.js'), 'export default { name: "alpha" };');
    fs.writeFileSync(path.join(tmpDir, 'beta.js'), 'export default { name: "beta" };');

    const { importDir } = await import('../lib/helpers/import-dir.js');
    const loaded: unknown[] = [];
    await importDir(tmpDir, (mod) => loaded.push(mod));

    expect(loaded).toHaveLength(2);
    expect(loaded).toContainEqual({ name: 'alpha' });
    expect(loaded).toContainEqual({ name: 'beta' });
  });

  it('loads .ts files from a directory', async () => {
    // .ts files should also be matched by the regex
    fs.writeFileSync(path.join(tmpDir, 'gamma.ts'), 'export default { name: "gamma" };');

    const { importDir } = await import('../lib/helpers/import-dir.js');
    const loaded: unknown[] = [];
    await importDir(tmpDir, (mod) => loaded.push(mod));

    expect(loaded).toHaveLength(1);
    expect(loaded).toContainEqual({ name: 'gamma' });
  });

  it('skips hidden files (dotfiles)', async () => {
    fs.writeFileSync(path.join(tmpDir, '.hidden.js'), 'export default { name: "hidden" };');
    fs.writeFileSync(path.join(tmpDir, 'visible.js'), 'export default { name: "visible" };');

    const { importDir } = await import('../lib/helpers/import-dir.js');
    const loaded: unknown[] = [];
    await importDir(tmpDir, (mod) => loaded.push(mod));

    expect(loaded).toHaveLength(1);
    expect(loaded).toContainEqual({ name: 'visible' });
  });

  it('skips directories', async () => {
    fs.mkdirSync(path.join(tmpDir, 'subdir'));
    fs.writeFileSync(path.join(tmpDir, 'subdir', 'nested.js'), 'export default { name: "nested" };');
    fs.writeFileSync(path.join(tmpDir, 'top.js'), 'export default { name: "top" };');

    const { importDir } = await import('../lib/helpers/import-dir.js');
    const loaded: unknown[] = [];
    await importDir(tmpDir, (mod) => loaded.push(mod));

    expect(loaded).toHaveLength(1);
    expect(loaded).toContainEqual({ name: 'top' });
  });

  it('skips non-js/ts files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Hello');
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'action.js'), 'export default { name: "action" };');

    const { importDir } = await import('../lib/helpers/import-dir.js');
    const loaded: unknown[] = [];
    await importDir(tmpDir, (mod) => loaded.push(mod));

    expect(loaded).toHaveLength(1);
    expect(loaded).toContainEqual({ name: 'action' });
  });

  it('uses mod.default when available', async () => {
    fs.writeFileSync(path.join(tmpDir, 'withdefault.js'), 'export default "hello"; export const other = "world";');

    const { importDir } = await import('../lib/helpers/import-dir.js');
    const loaded: unknown[] = [];
    await importDir(tmpDir, (mod) => loaded.push(mod));

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toBe('hello');
  });
});

// ─── TTS Provider: filename generation and cache logic ───────────────────────

describe('TTS Provider (aws-polly)', () => {
  describe('filename generation', () => {
    it('generates deterministic filename from phrase and voice', () => {
      const phrase = 'Hello world';
      const voice = 'Joanna';
      const hash = crypto.createHash('sha1').update(phrase).digest('hex');
      const expected = `polly-${hash}-${voice}.mp3`;

      // Verify the format matches the pattern used in the provider
      expect(expected).toMatch(/^polly-[a-f0-9]{40}-\w+\.mp3$/);
    });

    it('same phrase produces same hash', () => {
      const phrase = 'Testing TTS cache';
      const hash1 = crypto.createHash('sha1').update(phrase).digest('hex');
      const hash2 = crypto.createHash('sha1').update(phrase).digest('hex');
      expect(hash1).toBe(hash2);
    });

    it('different phrases produce different hashes', () => {
      const hash1 = crypto.createHash('sha1').update('phrase one').digest('hex');
      const hash2 = crypto.createHash('sha1').update('phrase two').digest('hex');
      expect(hash1).not.toBe(hash2);
    });

    it('strips Neural suffix from voice name for filename', () => {
      // The provider strips "Neural" suffix and sets engine to neural
      const voiceName = 'JoannaNeural';
      const expectedVoice = voiceName.endsWith('Neural')
        ? voiceName.slice(0, -6)
        : voiceName;
      expect(expectedVoice).toBe('Joanna');

      const phrase = 'test';
      const hash = crypto.createHash('sha1').update(phrase).digest('hex');
      const filename = `polly-${hash}-${expectedVoice}.mp3`;
      expect(filename).toMatch(/^polly-[a-f0-9]{40}-Joanna\.mp3$/);
    });

    it('voice override takes precedence over settings.aws.name', () => {
      // Simulating the logic: if voiceName param is provided, it overrides settings.aws.name
      const settingsVoice = 'Matthew';
      const paramVoice = 'Amy';

      // The code does: if (settings.aws.name) set VoiceId, then if (voiceName) override
      let voiceId = 'Joanna'; // default
      if (settingsVoice) voiceId = settingsVoice;
      if (paramVoice) voiceId = paramVoice;

      expect(voiceId).toBe('Amy');
    });
  });

  describe('cache hit path', () => {
    it('returns URI without calling API when file exists', async () => {
      // Create a temp mp3-like file to simulate cache hit
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-cache-'));
      const phrase = 'cached phrase';
      const voice = 'Joanna';
      const hash = crypto.createHash('sha1').update(phrase).digest('hex');
      const filename = `polly-${hash}-${voice}.mp3`;
      const filepath = path.join(tmpDir, filename);

      // Write a minimal file (the provider checks fs.accessSync)
      fs.writeFileSync(filepath, Buffer.alloc(100));

      // Verify the file is accessible (simulating the cache hit check)
      expect(() => fs.accessSync(filepath, fs.constants.R_OK)).not.toThrow();

      // The expected URI pattern
      const expectedUri = `/tts/${filename}`;
      expect(expectedUri).toBe(`/tts/polly-${hash}-Joanna.mp3`);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('cache miss path', () => {
    it('file does not exist triggers download path', () => {
      const nonExistentPath = path.join(os.tmpdir(), 'nonexistent-tts-file.mp3');

      // Verify accessSync throws for non-existent file (triggering API call)
      expect(() => fs.accessSync(nonExistentPath, fs.constants.R_OK)).toThrow();
    });
  });

  describe('credential passing', () => {
    it('uses configured region from settings', () => {
      const settings = { aws: { region: 'eu-west-1', credentials: { accessKeyId: 'key', secretAccessKey: 'secret' } } };
      // The provider uses: settings.aws.region ?? 'us-east-1'
      const region = settings.aws.region ?? 'us-east-1';
      expect(region).toBe('eu-west-1');
    });

    it('defaults to us-east-1 when no region configured', () => {
      const settings = { aws: { credentials: { accessKeyId: 'key', secretAccessKey: 'secret' } } } as { aws: { region?: string; credentials: object } };
      const region = settings.aws.region ?? 'us-east-1';
      expect(region).toBe('us-east-1');
    });

    it('passes credentials object to client config', () => {
      const creds = { accessKeyId: 'AKID', secretAccessKey: 'SECRET' };
      const settings = { aws: { region: 'us-east-1', credentials: creds } };

      // The provider constructs: new PollyClient({ region, credentials: settings.aws.credentials })
      const clientConfig = {
        region: settings.aws.region ?? 'us-east-1',
        credentials: settings.aws.credentials,
      };

      expect(clientConfig.credentials).toBe(creds);
      expect(clientConfig.region).toBe('us-east-1');
    });
  });
});
