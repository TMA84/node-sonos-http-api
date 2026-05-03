# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Module Load Crash on require('request-promise')
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the three concrete failing modules: `lib/actions/siriusXM.js`, `lib/actions/musicSearch.js`, `lib/music_services/spotifyDef.js`
  - Create test file `test/bug-condition.test.js` (or `.mjs`)
  - For each module that contains `require('request-promise')`, assert that loading the module does NOT throw a `MODULE_NOT_FOUND` error
  - Property: for all modules in `['./lib/actions/siriusXM', './lib/actions/musicSearch', './lib/music_services/spotifyDef']`, `require(module)` succeeds without crash
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists by showing `MODULE_NOT_FOUND` error)
  - Document counterexamples found (e.g., "require('./lib/actions/siriusXM') throws Error: Cannot find module './lib/tp'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-HTTP Pure Functions Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **IMPORTANT**: These tests target pure functions that do NOT depend on `request-promise` and can be tested independently
  - Create test file `test/preservation.test.js` (or `.mjs`)
  - **Observe on unfixed code** (import functions directly or extract logic):
    - `spotifyDef.getSearchTerm('song', 'test', 'artist1', '', 'track1')` returns expected encoded string
    - `spotifyDef.getMetadata('album', 'id123', 'name', 'title')` returns expected DIDL-Lite XML
    - `spotifyDef.loadTracks('song', mockTracksJson)` returns expected track array structure
    - `spotifyDef.isEmpty('album', {albums:{items:[]}})` returns `true`
    - `spotifyDef.getURIandMetadata('album', mockResList)` returns expected `{uri, metadata}` structure
    - SiriusXM channel search via Fuse.js returns correct channel matches
  - **Write property-based tests** (using fast-check or similar):
    - For all valid search term inputs (type, term, artist, album, track), `getSearchTerm` produces a properly encoded URI component
    - For all valid track JSON inputs with items, `loadTracks` returns `{count, isArtist, queueTracks}` with count matching filtered items
    - For all valid result list inputs, `isEmpty` returns true iff the relevant items array is empty
    - For all valid metadata inputs (type, id, name, title), `getMetadata` returns well-formed DIDL-Lite XML containing the inputs
    - For all channel search inputs, Fuse.js search returns results consistent with channel data
  - Run tests on UNFIXED code (note: these functions are pure and can be tested by extracting/requiring only the non-crashing parts, or by copying the function logic into the test)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for startup crash caused by broken request-promise dependency

  - [x] 3.1 Remove unused `request-promise` import from `siriusXM.js`
    - Delete `const request = require('request-promise');` from `lib/actions/siriusXM.js`
    - This import is never used in the file
    - _Bug_Condition: isBugCondition(input) where input.moduleSource contains require('request-promise')_
    - _Expected_Behavior: Module loads successfully without MODULE_NOT_FOUND error_
    - _Preservation: SiriusXM channel search via Fuse.js and setAVTransport unchanged_
    - _Requirements: 2.1, 3.1_

  - [x] 3.2 Replace `request-promise` with `fetch` in `musicSearch.js`
    - Remove `const request = require('request-promise');` import
    - Replace `request({url: player.baseUrl + '/status/accounts', json: false})` with `fetch(player.baseUrl + '/status/accounts').then(r => r.text())`
    - Replace `request({url: 'http://ipinfo.io', json: true})` with `fetch('https://ipinfo.io').then(r => r.json())` (upgrade to HTTPS)
    - Replace `request(getRequestOptions(serviceDef, url))` with `fetch(url, { headers: serviceDef.headers() }).then(r => r.json())`
    - Update or remove `getRequestOptions` function (no longer needed in request-promise format)
    - _Bug_Condition: isBugCondition(input) where input.moduleSource contains require('request-promise')_
    - _Expected_Behavior: Module loads successfully and HTTP requests return equivalent results via fetch_
    - _Preservation: Account ID parsing, country detection format, search result structure unchanged_
    - _Requirements: 2.2, 2.4, 3.5, 3.6_

  - [x] 3.3 Replace `request-promise` with `fetch` in `spotifyDef.js`
    - Remove `var request = require('request-promise');` import
    - Replace `auth()` function body: use `fetch(SPOTIFY_TOKEN_URL, { method: 'POST', headers: getHeaders(), body: new URLSearchParams({ grant_type: 'client_credentials' }) }).then(r => r.json())` instead of `request(options)`
    - Remove `getOptions` function (no longer needed)
    - Ensure `mapResponse` still maps `{access_token, token_type, expires_in}` to `{accessToken, tokenType, expiresIn}`
    - _Bug_Condition: isBugCondition(input) where input.moduleSource contains require('request-promise')_
    - _Expected_Behavior: Module loads successfully and Spotify auth returns token in same format_
    - _Preservation: Token header format `Bearer <token>` unchanged, mapResponse output unchanged_
    - _Requirements: 2.3, 2.5, 3.4_

  - [x] 3.4 Update `package.json` to remove `request-promise` and update engine
    - Remove `"request-promise": "~1.0.2"` from `dependencies`
    - Change `"node": ">=4 <23"` to `"node": ">=18"` (built-in `fetch` requires Node 18+)
    - _Bug_Condition: Package dependency references broken module_
    - _Expected_Behavior: No broken dependency in package.json, engine reflects fetch requirement_
    - _Requirements: 2.6_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Modules Load Successfully
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (modules load without crash)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - all three modules load successfully)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-HTTP Pure Functions Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in pure function behavior)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm all property-based tests and unit tests pass
  - Verify application starts successfully with `node -e "require('./server')"`
  - Ensure no `MODULE_NOT_FOUND` errors occur
  - Ask the user if questions arise
