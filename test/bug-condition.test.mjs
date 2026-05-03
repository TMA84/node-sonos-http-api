import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bug Condition Exploration Test
 * 
 * Property 1: Bug Condition - Module Load Crash on require('request-promise')
 * 
 * This test verifies that modules containing require('request-promise') can be
 * loaded without throwing a MODULE_NOT_FOUND error.
 * 
 * EXPECTED BEHAVIOR: All modules load successfully without crash.
 * 
 * NOTE: The bug described in the spec (request-promise@1.0.2 referencing missing
 * lib/tp.js) could not be reproduced in this environment. The installed package
 * has main: "./lib/rp.js" which exists. The fix (removing request-promise and
 * replacing with fetch) is still applied as modernization to remove the deprecated
 * dependency. After the fix, this test validates that modules continue to load
 * successfully without the request-promise dependency.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3
 */

const AFFECTED_MODULES = [
  '../lib/actions/siriusXM.js',
  '../lib/actions/musicSearch.js',
  '../lib/music_services/spotifyDef.js',
];

describe('Bug Condition: Module Load Crash on require(\'request-promise\')', () => {
  /**
   * Property 1: For all modules in the affected set that contain require('request-promise'),
   * requiring the module succeeds without throwing a MODULE_NOT_FOUND error.
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  it('Property 1: All modules containing require(\'request-promise\') load without MODULE_NOT_FOUND error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...AFFECTED_MODULES),
        async (modulePath) => {
          const absolutePath = path.resolve(__dirname, modulePath);
          
          // The property: importing the module should NOT throw MODULE_NOT_FOUND
          let loadError = null;
          try {
            await import(absolutePath);
          } catch (e) {
            loadError = e;
          }

          // Assert no MODULE_NOT_FOUND error occurred
          if (loadError !== null && loadError.code === 'ERR_MODULE_NOT_FOUND') {
            // This is the bug condition - module fails to load
            throw new Error(
              `Module '${modulePath}' crashed with ERR_MODULE_NOT_FOUND: ${loadError.message}`
            );
          }
          
          // Other errors (e.g., missing settings, network) are acceptable - 
          // the key property is that the module loads without MODULE_NOT_FOUND crash
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Individual module load tests for clear counterexample documentation
  for (const modulePath of AFFECTED_MODULES) {
    it(`loads ${modulePath} without MODULE_NOT_FOUND error`, async () => {
      const absolutePath = path.resolve(__dirname, modulePath);
      
      let loadError = null;
      try {
        await import(absolutePath);
      } catch (e) {
        loadError = e;
      }

      // The module should load without MODULE_NOT_FOUND
      if (loadError !== null && loadError.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          `Bug confirmed: import('${modulePath}') throws ERR_MODULE_NOT_FOUND: ${loadError.message}`
        );
      }
    });
  }
});
