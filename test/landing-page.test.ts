import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Unit tests for landing page HTML structure.
 * Validates: Requirements 3.1, 5.3, 5.4, 5.5, 1.2
 */

describe('Landing page HTML structure', () => {
  let html: string;

  beforeAll(() => {
    const htmlPath = path.resolve(__dirname, '..', 'static', 'index.html');
    html = fs.readFileSync(htmlPath, 'utf-8');
  });

  describe('Semantic HTML5 elements (Requirement 3.1)', () => {
    it('contains a <header> element', () => {
      expect(html).toMatch(/<header[\s>]/);
    });

    it('contains a <nav> element', () => {
      expect(html).toMatch(/<nav[\s>]/);
    });

    it('contains a <main> element', () => {
      expect(html).toMatch(/<main[\s>]/);
    });

    it('contains at least one <section> element', () => {
      expect(html).toMatch(/<section[\s>]/);
    });

    it('contains a <footer> element', () => {
      expect(html).toMatch(/<footer[\s>]/);
    });
  });

  describe('ARIA landmarks (Requirements 5.3, 5.4)', () => {
    it('has role="banner" on header', () => {
      expect(html).toMatch(/role=["']banner["']/);
    });

    it('has role="navigation" on nav', () => {
      expect(html).toMatch(/role=["']navigation["']/);
    });

    it('has role="main" on main content area', () => {
      expect(html).toMatch(/role=["']main["']/);
    });

    it('has role="contentinfo" on footer', () => {
      expect(html).toMatch(/role=["']contentinfo["']/);
    });
  });

  describe('Heading hierarchy (Requirement 5.5)', () => {
    it('contains exactly one h1 element', () => {
      const h1Matches = html.match(/<h1[\s>]/g);
      expect(h1Matches).not.toBeNull();
      expect(h1Matches!.length).toBe(1);
    });

    it('has h2 elements following the h1', () => {
      const h2Matches = html.match(/<h2[\s>]/g);
      expect(h2Matches).not.toBeNull();
      expect(h2Matches!.length).toBeGreaterThan(0);
    });

    it('does not skip heading levels (no h3 without h2, no h4 without h3, etc.)', () => {
      const headingPattern = /<h([1-6])[\s>]/g;
      const levels: number[] = [];
      let match: RegExpExecArray | null;

      while ((match = headingPattern.exec(html)) !== null) {
        levels.push(parseInt(match[1], 10));
      }

      // Verify no level is skipped: each heading level should not jump more than 1
      for (let i = 1; i < levels.length; i++) {
        const current = levels[i];
        const minPrevious = Math.min(...levels.slice(0, i));
        // A heading at level N should only appear if level N-1 appeared before it
        if (current > 1) {
          const hasParentLevel = levels.slice(0, i).includes(current - 1);
          expect(hasParentLevel).toBe(true);
        }
      }
    });
  });

  describe('No external CDN script tags (Requirement 1.2)', () => {
    it('does not include any script tags loading from external CDNs', () => {
      // Match script tags with src attributes pointing to external URLs
      const scriptTags = html.match(/<script[^>]*src=["'][^"']*["'][^>]*>/g) || [];

      for (const tag of scriptTags) {
        const srcMatch = tag.match(/src=["']([^"']*)["']/);
        if (srcMatch) {
          const src = srcMatch[1];
          // External URLs start with http://, https://, or //
          expect(src).not.toMatch(/^(https?:)?\/\//);
        }
      }
    });
  });
});
