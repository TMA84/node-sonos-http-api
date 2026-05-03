// Feature: webpage-modernization, Property 1: CSS layout properties use relative units
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Validates: Requirements 4.4
 *
 * For any CSS declaration in styles.css that sets a layout dimension property
 * (width, max-width, min-width, height, margin, padding, gap), the value SHALL
 * use relative units (rem, em, %, vw, vh, fr, auto) rather than fixed pixel values —
 * with the exception of border-width and outline-width where px is standard.
 */

// Layout dimension properties that must NOT use px
const LAYOUT_PROPERTIES = [
  'width',
  'max-width',
  'min-width',
  'height',
  'max-height',
  'min-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-block',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block-start',
  'margin-block-end',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-inline',
  'padding-block',
  'padding-inline-start',
  'padding-inline-end',
  'padding-block-start',
  'padding-block-end',
  'gap',
  'row-gap',
  'column-gap',
];

// Properties where px is allowed
const PX_ALLOWED_PROPERTIES = [
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'outline-width',
];

interface CSSDeclaration {
  property: string;
  value: string;
  line: number;
}

/**
 * Parse CSS file and extract all property declarations.
 * Strips comments and handles multi-line values.
 */
function parseCSSDeclarations(css: string): CSSDeclaration[] {
  const declarations: CSSDeclaration[] = [];

  // Remove comments
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Preserve line count for accurate line numbers
    return match.replace(/[^\n]/g, '');
  });

  const lines = noComments.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match property: value declarations
    const match = line.match(/^([a-z-]+)\s*:\s*(.+?)\s*;?\s*$/);
    if (match) {
      declarations.push({
        property: match[1],
        value: match[2].replace(/;$/, '').trim(),
        line: i + 1,
      });
    }
  }

  return declarations;
}

/**
 * Check if a CSS value contains a px unit (not inside a function like calc that
 * might reference a custom property, and not 0px which is equivalent to 0).
 */
function containsPxUnit(value: string): boolean {
  // Match number followed by px (but not 0px)
  const pxPattern = /(?<!\w)(?!0px)(\d*\.?\d+)px/;
  return pxPattern.test(value);
}

/**
 * Determine if a property is a layout dimension property.
 */
function isLayoutProperty(property: string): boolean {
  return LAYOUT_PROPERTIES.includes(property);
}

/**
 * Determine if a property is allowed to use px.
 */
function isPxAllowed(property: string): boolean {
  return PX_ALLOWED_PROPERTIES.includes(property);
}

describe('CSS Layout Properties Use Relative Units (Property 1)', () => {
  const cssPath = resolve(process.cwd(), 'static/css/styles.css');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const declarations = parseCSSDeclarations(cssContent);

  // Get all layout property declarations
  const layoutDeclarations = declarations.filter(
    (d) => isLayoutProperty(d.property) && !isPxAllowed(d.property)
  );

  it('styles.css contains layout property declarations to test', () => {
    expect(layoutDeclarations.length).toBeGreaterThan(0);
  });

  it('no layout dimension property uses px units', () => {
    // Use fast-check to sample from the actual declarations found in the CSS
    // This validates the property across all declarations found
    const declarationArb = fc.constantFrom(...layoutDeclarations);

    fc.assert(
      fc.property(declarationArb, (decl: CSSDeclaration) => {
        const hasPx = containsPxUnit(decl.value);
        if (hasPx) {
          // Provide a descriptive failure message
          expect.fail(
            `Layout property "${decl.property}" uses px unit at line ${decl.line}: "${decl.value}". ` +
            `Expected relative units (rem, em, %, vw, vh, fr, auto).`
          );
        }
      }),
      { numRuns: Math.max(100, layoutDeclarations.length * 10) }
    );
  });

  it('border-width and outline-width are allowed to use px', () => {
    // Verify that our parser correctly identifies px-allowed properties
    const borderDeclarations = declarations.filter((d) => isPxAllowed(d.property));

    // This is a sanity check — these properties CAN use px, so we just verify
    // they are not flagged by our layout property check
    for (const decl of borderDeclarations) {
      expect(isLayoutProperty(decl.property)).toBe(false);
    }
  });

  it('all layout properties use only relative units or valid keywords', () => {
    // Exhaustive check over every layout declaration (not sampled)
    const violations: string[] = [];

    for (const decl of layoutDeclarations) {
      if (containsPxUnit(decl.value)) {
        violations.push(
          `Line ${decl.line}: ${decl.property}: ${decl.value}`
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
