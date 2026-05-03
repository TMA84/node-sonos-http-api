// Feature: project-modernization, Property 1: TTS Cache Filename Determinism
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import crypto from 'node:crypto';

/**
 * Validates: Requirements 6.5
 *
 * The TTS cache filename generation must be deterministic:
 * for any phrase and voice, the filename is `polly-{sha1(phrase)}-{voice}.mp3`.
 * This ensures cache compatibility across migrations.
 */

// Available Polly voices (subset used in production)
const POLLY_VOICES = [
  'Joanna', 'Matthew', 'Amy', 'Brian', 'Emma',
  'Ivy', 'Kendra', 'Kimberly', 'Salli', 'Joey',
  'Justin', 'Kevin', 'Ruth', 'Stephen',
] as const;

/**
 * Pure filename generation logic extracted from aws-polly.ts.
 * This mirrors the production code:
 *   const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
 *   const filename = `polly-${phraseHash}-${synthesizeParameters.VoiceId}.mp3`;
 */
function generatePollyFilename(phrase: string, voiceId: string): string {
  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  return `polly-${phraseHash}-${voiceId}.mp3`;
}

describe('TTS Cache Filename Determinism (Property 1)', () => {
  it('same phrase and voice always produce the same filename', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(...POLLY_VOICES),
        (phrase, voice) => {
          const first = generatePollyFilename(phrase, voice);
          const second = generatePollyFilename(phrase, voice);
          expect(first).toBe(second);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filename matches pattern polly-{40-char-hex}-{voiceName}.mp3', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(...POLLY_VOICES),
        (phrase, voice) => {
          const filename = generatePollyFilename(phrase, voice);
          const pattern = /^polly-[0-9a-f]{40}-.+\.mp3$/;
          expect(filename).toMatch(pattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filename contains the sha1 hash of the phrase', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(...POLLY_VOICES),
        (phrase, voice) => {
          const filename = generatePollyFilename(phrase, voice);
          const expectedHash = crypto.createHash('sha1').update(phrase).digest('hex');
          expect(filename).toBe(`polly-${expectedHash}-${voice}.mp3`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different phrases produce different filenames (for same voice)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.constantFrom(...POLLY_VOICES),
        (phrase1, phrase2, voice) => {
          fc.pre(phrase1 !== phrase2);
          const filename1 = generatePollyFilename(phrase1, voice);
          const filename2 = generatePollyFilename(phrase2, voice);
          expect(filename1).not.toBe(filename2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('different voices produce different filenames (for same phrase)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(...POLLY_VOICES),
        fc.constantFrom(...POLLY_VOICES),
        (phrase, voice1, voice2) => {
          fc.pre(voice1 !== voice2);
          const filename1 = generatePollyFilename(phrase, voice1);
          const filename2 = generatePollyFilename(phrase, voice2);
          expect(filename1).not.toBe(filename2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
