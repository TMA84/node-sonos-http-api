// Feature: project-modernization, Property 2: Settings Merge Precedence
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { merge } from '../src/settings.js';

/**
 * Validates: Requirements 12.3
 *
 * The merge function performs a deep merge where:
 * - Every leaf value from source appears in the merged result
 * - Every leaf value from target that has no corresponding key in source is preserved
 * - Source values override target values for the same key
 */

/**
 * Matches the isPlainObject check used in the merge function (src/settings.ts).
 * Only objects with Object.prototype as their prototype are considered plain objects.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

type PathEntry = { path: string[]; value: unknown };

/** Collect all leaf paths and values from a nested object using array-based paths */
function getLeaves(obj: Record<string, unknown>, prefix: string[] = []): PathEntry[] {
  const leaves: PathEntry[] = [];
  for (const key of Object.keys(obj)) {
    const currentPath = [...prefix, key];
    const val = obj[key];
    if (isPlainObject(val)) {
      leaves.push(...getLeaves(val, currentPath));
    } else {
      leaves.push({ path: currentPath, value: val });
    }
  }
  return leaves;
}

/** Get a value at an array-based path */
function getAtPath(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const part of path) {
    if (!isPlainObject(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Check if a path exists as a leaf in a set of leaves */
function hasLeafAtPath(leaves: PathEntry[], path: string[]): boolean {
  return leaves.some(
    (entry) => entry.path.length === path.length && entry.path.every((p, i) => p === path[i])
  );
}

/** Check if any ancestor of a path is a leaf in the given leaves */
function hasAncestorLeaf(leaves: PathEntry[], path: string[]): boolean {
  for (let i = 1; i < path.length; i++) {
    const ancestor = path.slice(0, i);
    if (hasLeafAtPath(leaves, ancestor)) {
      return true;
    }
  }
  return false;
}

/** Deep clone that produces plain objects (safe for merge) */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Build a plain object from an array of key-value entries.
 * This avoids fc.dictionary's __proto__ issue by using Object.defineProperty.
 */
function buildObject(entries: [string, unknown][]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    Object.defineProperty(obj, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return obj;
}

/**
 * Arbitrary for generating nested plain objects with simple leaf values.
 * Uses uniqueArray of key-value tuples to build objects safely,
 * avoiding __proto__ prototype pollution issues.
 */
const safeKeyArb = fc.stringMatching(/^[a-z][a-z0-9]{0,4}$/);

const leafValueArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null)
);

const nestedObjectArb: fc.Arbitrary<Record<string, unknown>> = fc.uniqueArray(
  fc.tuple(
    safeKeyArb,
    fc.oneof(
      leafValueArb,
      fc.uniqueArray(
        fc.tuple(safeKeyArb, leafValueArb),
        { selector: ([k]) => k, minLength: 0, maxLength: 4 }
      ).map(buildObject)
    )
  ),
  { selector: ([k]) => k, minLength: 0, maxLength: 5 }
).map(buildObject);

describe('Settings Merge Precedence (Property 2)', () => {
  it('every leaf value from source appears in the merged result', () => {
    fc.assert(
      fc.property(
        nestedObjectArb,
        nestedObjectArb,
        (target, source) => {
          const targetClone = deepClone(target);
          const result = merge(targetClone, source);

          const sourceLeaves = getLeaves(source);
          for (const { path, value } of sourceLeaves) {
            const resultValue = getAtPath(result, path);
            expect(resultValue).toStrictEqual(value);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('target-only leaves are preserved when source has no corresponding key', () => {
    fc.assert(
      fc.property(
        nestedObjectArb,
        nestedObjectArb,
        (target, source) => {
          const targetClone = deepClone(target);
          const result = merge(targetClone, source);

          const targetLeaves = getLeaves(target);
          const sourceLeaves = getLeaves(source);

          for (const { path, value } of targetLeaves) {
            // Only check paths not overridden by source
            if (!hasLeafAtPath(sourceLeaves, path) && !hasAncestorLeaf(sourceLeaves, path)) {
              const resultValue = getAtPath(result, path);
              expect(resultValue).toStrictEqual(value);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('source values override target values for the same key', () => {
    fc.assert(
      fc.property(
        nestedObjectArb,
        nestedObjectArb,
        (target, source) => {
          const targetClone = deepClone(target);
          const result = merge(targetClone, source);

          // For every top-level key in source, verify merge behavior
          for (const key of Object.keys(source)) {
            const sourceVal = source[key];
            const resultVal = (result as Record<string, unknown>)[key];

            if (isPlainObject(sourceVal) && isPlainObject(target[key])) {
              // Both are plain objects — recursive merge happened
              // All source leaves within this subtree should be present
              const sourceSubLeaves = getLeaves(sourceVal);
              for (const { path: subPath, value } of sourceSubLeaves) {
                const fullPath = [key, ...subPath];
                expect(getAtPath(result, fullPath)).toStrictEqual(value);
              }
            } else {
              // Source leaf overrides target
              expect(resultVal).toStrictEqual(sourceVal);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
