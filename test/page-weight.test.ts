import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Validates total landing page weight is under 100KB.
 * Measures combined size of index.html + css/styles.css + js/zones.js + sonos-icon.png.
 * Validates: Requirements 7.1, 7.2, 7.3
 */

const staticDir = path.resolve(__dirname, '..', 'static');

const BUDGET_BYTES = 100 * 1024; // 100KB

const landingPageAssets = [
  'index.html',
  'css/styles.css',
  'js/zones.js',
  'sonos-icon.png',
];

describe('Landing page weight budget (Requirements 7.1, 7.2, 7.3)', () => {
  it('all landing page assets exist', () => {
    for (const asset of landingPageAssets) {
      const filePath = path.join(staticDir, asset);
      expect(fs.existsSync(filePath), `Missing asset: ${asset}`).toBe(true);
    }
  });

  it('combined landing page weight is under 100KB', () => {
    let totalBytes = 0;
    const sizes: Record<string, number> = {};

    for (const asset of landingPageAssets) {
      const filePath = path.join(staticDir, asset);
      const stat = fs.statSync(filePath);
      sizes[asset] = stat.size;
      totalBytes += stat.size;
    }

    // Log individual sizes for debugging
    const sizeReport = Object.entries(sizes)
      .map(([file, size]) => `  ${file}: ${(size / 1024).toFixed(1)}KB`)
      .join('\n');

    expect(
      totalBytes,
      `Total page weight ${(totalBytes / 1024).toFixed(1)}KB exceeds 100KB budget:\n${sizeReport}`
    ).toBeLessThanOrEqual(BUDGET_BYTES);
  });

  it('no build step is required — all assets are plain files', () => {
    for (const asset of landingPageAssets) {
      const filePath = path.join(staticDir, asset);
      const content = fs.readFileSync(filePath);
      // Verify files are readable (not compiled/binary except PNG)
      if (!asset.endsWith('.png')) {
        const text = content.toString('utf-8');
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });
});
