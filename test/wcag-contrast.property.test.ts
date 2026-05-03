// Feature: webpage-modernization, Property 2: Theme color pairs meet WCAG AA contrast ratios
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Validates: Requirements 5.1, 8.4
 *
 * For any text color and background color pair defined in the CSS custom properties
 * (in both light and dark theme definitions), the computed WCAG 2.1 contrast ratio
 * SHALL be at least 4.5:1 for normal text colors and at least 3:1 for large text /
 * UI component colors.
 */

// --- Color parsing and WCAG computation utilities ---

/**
 * Parse a hex color string (#rrggbb) into [r, g, b] values (0-255).
 */
function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert an sRGB channel value (0-255) to its linear RGB value.
 * Per WCAG 2.1 relative luminance formula.
 */
function linearize(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045
    ? srgb / 12.92
    : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Compute WCAG 2.1 relative luminance for an [r, g, b] color.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute WCAG 2.1 contrast ratio between two colors.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function contrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- CSS parsing ---

interface ThemeColors {
  [key: string]: string;
}

/**
 * Extract CSS custom property color values from a CSS block.
 */
function extractColorProperties(cssBlock: string): ThemeColors {
  const colors: ThemeColors = {};
  const regex = /(--color-[a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cssBlock)) !== null) {
    colors[match[1]] = match[2];
  }
  return colors;
}

/**
 * Parse the CSS file and extract light and dark theme color tokens.
 */
function parseThemes(css: string): { light: ThemeColors; dark: ThemeColors } {
  // Remove comments
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Extract light theme from :root (outside @media prefers-color-scheme: dark)
  // First, get the top-level :root block
  const rootMatch = noComments.match(/:root\s*\{([^}]+)\}/);
  const light = rootMatch ? extractColorProperties(rootMatch[1]) : {};

  // Extract dark theme from @media (prefers-color-scheme: dark) block
  const darkMediaMatch = noComments.match(
    /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{[\s\S]*?:root\s*\{([^}]+)\}/
  );
  const dark = darkMediaMatch ? extractColorProperties(darkMediaMatch[1]) : {};

  return { light, dark };
}

// --- Color pair definitions ---

interface ColorPair {
  foreground: string; // CSS variable name
  background: string; // CSS variable name
  type: 'normal' | 'large'; // Determines minimum contrast ratio
  description: string;
}

// Normal text pairs require 4.5:1 minimum contrast
// Large text / UI component pairs require 3:1 minimum contrast
const COLOR_PAIRS: ColorPair[] = [
  // Normal text (4.5:1 minimum)
  { foreground: '--color-text', background: '--color-bg', type: 'normal', description: 'Primary text on page background' },
  { foreground: '--color-text', background: '--color-surface', type: 'normal', description: 'Primary text on surface background' },
  { foreground: '--color-text-secondary', background: '--color-bg', type: 'normal', description: 'Secondary text on page background' },
  { foreground: '--color-text-secondary', background: '--color-surface', type: 'normal', description: 'Secondary text on surface background' },
  // Large text / UI components (3:1 minimum)
  { foreground: '--color-accent', background: '--color-bg', type: 'large', description: 'Accent/links on page background' },
  { foreground: '--color-accent', background: '--color-surface', type: 'large', description: 'Accent/links on surface background' },
  { foreground: '--color-success', background: '--color-bg', type: 'large', description: 'Success indicator on page background' },
  { foreground: '--color-warning', background: '--color-bg', type: 'large', description: 'Warning indicator on page background' },
  { foreground: '--color-error', background: '--color-bg', type: 'large', description: 'Error indicator on page background' },
];

// --- Tests ---

describe('Theme Color Pairs Meet WCAG AA Contrast Ratios (Property 2)', () => {
  const cssPath = resolve(process.cwd(), 'static/css/styles.css');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const themes = parseThemes(cssContent);

  it('light theme colors are extracted correctly', () => {
    expect(Object.keys(themes.light).length).toBeGreaterThan(0);
    expect(themes.light['--color-bg']).toBeDefined();
    expect(themes.light['--color-text']).toBeDefined();
  });

  it('dark theme colors are extracted correctly', () => {
    expect(Object.keys(themes.dark).length).toBeGreaterThan(0);
    expect(themes.dark['--color-bg']).toBeDefined();
    expect(themes.dark['--color-text']).toBeDefined();
  });

  it('all color pairs in light theme meet WCAG AA contrast ratios', () => {
    const lightPairsWithValues = COLOR_PAIRS.map((pair) => ({
      ...pair,
      theme: 'light' as const,
      fgHex: themes.light[pair.foreground],
      bgHex: themes.light[pair.background],
    })).filter((p) => p.fgHex && p.bgHex);

    expect(lightPairsWithValues.length).toBeGreaterThan(0);

    const pairArb = fc.constantFrom(...lightPairsWithValues);

    fc.assert(
      fc.property(pairArb, (pair) => {
        const fg = parseHex(pair.fgHex);
        const bg = parseHex(pair.bgHex);
        const ratio = contrastRatio(fg, bg);
        const minRatio = pair.type === 'normal' ? 4.5 : 3.0;

        if (ratio < minRatio) {
          expect.fail(
            `Light theme: ${pair.description} — ` +
            `"${pair.foreground}" (${pair.fgHex}) on "${pair.background}" (${pair.bgHex}) ` +
            `has contrast ratio ${ratio.toFixed(2)}:1, minimum required is ${minRatio}:1`
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all color pairs in dark theme meet WCAG AA contrast ratios', () => {
    const darkPairsWithValues = COLOR_PAIRS.map((pair) => ({
      ...pair,
      theme: 'dark' as const,
      fgHex: themes.dark[pair.foreground],
      bgHex: themes.dark[pair.background],
    })).filter((p) => p.fgHex && p.bgHex);

    expect(darkPairsWithValues.length).toBeGreaterThan(0);

    const pairArb = fc.constantFrom(...darkPairsWithValues);

    fc.assert(
      fc.property(pairArb, (pair) => {
        const fg = parseHex(pair.fgHex);
        const bg = parseHex(pair.bgHex);
        const ratio = contrastRatio(fg, bg);
        const minRatio = pair.type === 'normal' ? 4.5 : 3.0;

        if (ratio < minRatio) {
          expect.fail(
            `Dark theme: ${pair.description} — ` +
            `"${pair.foreground}" (${pair.fgHex}) on "${pair.background}" (${pair.bgHex}) ` +
            `has contrast ratio ${ratio.toFixed(2)}:1, minimum required is ${minRatio}:1`
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all color pairs across both themes meet WCAG AA contrast ratios (combined property)', () => {
    // Build combined set of all theme+pair combinations for property testing
    const allPairs = [
      ...COLOR_PAIRS.map((pair) => ({
        ...pair,
        theme: 'light' as const,
        fgHex: themes.light[pair.foreground],
        bgHex: themes.light[pair.background],
      })),
      ...COLOR_PAIRS.map((pair) => ({
        ...pair,
        theme: 'dark' as const,
        fgHex: themes.dark[pair.foreground],
        bgHex: themes.dark[pair.background],
      })),
    ].filter((p) => p.fgHex && p.bgHex);

    expect(allPairs.length).toBeGreaterThanOrEqual(18); // 9 pairs × 2 themes

    const pairArb = fc.constantFrom(...allPairs);

    fc.assert(
      fc.property(pairArb, (pair) => {
        const fg = parseHex(pair.fgHex);
        const bg = parseHex(pair.bgHex);
        const ratio = contrastRatio(fg, bg);
        const minRatio = pair.type === 'normal' ? 4.5 : 3.0;

        if (ratio < minRatio) {
          expect.fail(
            `${pair.theme} theme: ${pair.description} — ` +
            `"${pair.foreground}" (${pair.fgHex}) on "${pair.background}" (${pair.bgHex}) ` +
            `has contrast ratio ${ratio.toFixed(2)}:1, minimum required is ${minRatio}:1`
          );
        }
      }),
      { numRuns: 100 }
    );
  });
});
