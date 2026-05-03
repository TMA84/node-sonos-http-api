import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * Smoke tests verifying legacy removal and new structure.
 * Validates: Requirements 1.1, 1.2, 9.1, 9.2, 9.3, 9.4, 9.5
 */

const staticDir = path.resolve(__dirname, '..', 'static');

describe('Legacy removal smoke tests', () => {
  describe('No legacy libraries in static/docs/lib/ (Requirements 1.1, 9.1)', () => {
    const legacyLibDir = path.join(staticDir, 'docs', 'lib');

    it('static/docs/lib/ directory does not exist', () => {
      expect(fs.existsSync(legacyLibDir)).toBe(false);
    });

    const legacyFiles = [
      'jquery-1.8.0.min.js',
      'jquery.slideto.min.js',
      'jquery.wiggle.min.js',
      'jquery.ba-bbq.min.js',
      'backbone-min.js',
      'underscore-min.js',
      'handlebars-1.0.0.js',
      'highlight.7.3.pack.js',
      'swagger-ui.js',
      'swagger-oauth.js',
      'swagger-client.js',
      'shred.bundle.js',
    ];

    for (const file of legacyFiles) {
      it(`${file} does not exist in docs/lib/`, () => {
        expect(fs.existsSync(path.join(legacyLibDir, file))).toBe(false);
      });
    }
  });

  describe('Legacy root-level doc files removed (Requirements 9.2, 9.3)', () => {
    const removedFiles = [
      'docs/swagger-ui.js',
      'docs/swagger-ui.min.js',
      'docs/o2c.html',
      'docs/spec.js',
    ];

    for (const file of removedFiles) {
      it(`static/${file} does not exist`, () => {
        expect(fs.existsSync(path.join(staticDir, file))).toBe(false);
      });
    }
  });

  describe('Swagger UI vendored files are present (Requirement 2.1)', () => {
    const swaggerUiDir = path.join(staticDir, 'docs', 'swagger-ui');

    const requiredFiles = [
      'swagger-ui-bundle.js',
      'swagger-ui-standalone-preset.js',
      'swagger-ui.css',
    ];

    for (const file of requiredFiles) {
      it(`swagger-ui/${file} exists`, () => {
        expect(fs.existsSync(path.join(swaggerUiDir, file))).toBe(true);
      });
    }
  });

  describe('OpenAPI spec exists and is valid YAML (Requirement 6.2)', () => {
    const openapiPath = path.join(staticDir, 'docs', 'openapi.yaml');

    it('openapi.yaml exists', () => {
      expect(fs.existsSync(openapiPath)).toBe(true);
    });

    it('openapi.yaml is valid YAML', () => {
      const content = fs.readFileSync(openapiPath, 'utf-8');
      const parsed = yaml.load(content);
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });

    it('openapi.yaml has an openapi version field', () => {
      const content = fs.readFileSync(openapiPath, 'utf-8');
      const parsed = yaml.load(content) as Record<string, unknown>;
      expect(parsed.openapi).toBeDefined();
      expect(String(parsed.openapi)).toMatch(/^3\./);
    });
  });

  describe('Retained assets (Requirements 9.4, 9.5)', () => {
    it('clips/ directory exists', () => {
      expect(fs.existsSync(path.join(staticDir, 'clips'))).toBe(true);
    });

    it('tts/ directory exists', () => {
      expect(fs.existsSync(path.join(staticDir, 'tts'))).toBe(true);
    });

    it('sonos-icon.png exists', () => {
      expect(fs.existsSync(path.join(staticDir, 'sonos-icon.png'))).toBe(true);
    });
  });

  describe('No external CDN script tags in HTML files (Requirement 1.2)', () => {
    function findHtmlFiles(dir: string): string[] {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findHtmlFiles(fullPath));
        } else if (entry.name.endsWith('.html')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    it('no HTML file contains external CDN script tags', () => {
      const htmlFiles = findHtmlFiles(staticDir);
      expect(htmlFiles.length).toBeGreaterThan(0);

      for (const htmlFile of htmlFiles) {
        const content = fs.readFileSync(htmlFile, 'utf-8');
        const scriptTags = content.match(/<script[^>]*src=["'][^"']*["'][^>]*>/g) || [];

        for (const tag of scriptTags) {
          const srcMatch = tag.match(/src=["']([^"']*)["']/);
          if (srcMatch) {
            const src = srcMatch[1];
            const relativePath = path.relative(staticDir, htmlFile);
            expect(
              src,
              `External CDN found in ${relativePath}: ${src}`
            ).not.toMatch(/^(https?:)?\/\//);
          }
        }
      }
    });
  });
});
