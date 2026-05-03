# Startup Crash Fix - Bugfix Design

## Overview

The application crashes on startup because `request-promise` at version `~1.0.2` is a broken/abandoned package whose `main` field references a missing file (`lib/tp.js`). Since `lib/helpers/require-dir.js` eagerly loads all action modules at startup, any `require('request-promise')` call causes a fatal `MODULE_NOT_FOUND` error. The fix replaces all `request-promise` usage with Node.js built-in `fetch` (available since Node 18), removes the unused import in `siriusXM.js`, removes the dependency from `package.json`, and updates the engine requirement to `>=18`.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — any module that calls `require('request-promise')` causes a crash at load time because the package's entry point file is missing
- **Property (P)**: The desired behavior — modules load successfully and HTTP requests work correctly using Node.js built-in `fetch`
- **Preservation**: Existing functionality that must remain unchanged — SiriusXM channel lookup, music search results, Spotify authentication token format, country detection, and account ID parsing
- **request-promise**: The broken npm package (`~1.0.2`) that references a non-existent `lib/tp.js` file
- **fetch**: Node.js built-in HTTP client (available since Node 18) that replaces `request-promise`
- **require-dir.js**: Helper in `lib/helpers/` that eagerly loads all `.js` files under `lib/actions/` at startup

## Bug Details

### Bug Condition

The bug manifests when the Node.js runtime attempts to resolve `require('request-promise')` during module loading. The package at version `~1.0.2` has a `main` field pointing to `lib/tp.js` which does not exist in the installed package, causing an immediate `MODULE_NOT_FOUND` crash before the server can start.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ModuleLoadEvent
  OUTPUT: boolean
  
  RETURN input.moduleSource CONTAINS require('request-promise')
         AND packageVersion('request-promise') MATCHES '~1.0.2'
         AND packageEntryPoint('request-promise') REFERENCES missingFile
END FUNCTION
```

### Examples

- `lib/actions/siriusXM.js` loads → `require('request-promise')` → crash with `MODULE_NOT_FOUND` (the import is unused, never called)
- `lib/actions/musicSearch.js` loads → `require('request-promise')` → crash with `MODULE_NOT_FOUND` (used for HTTP GET requests)
- `lib/music_services/spotifyDef.js` loads (via musicSearch.js) → `require('request-promise')` → crash with `MODULE_NOT_FOUND` (used for Spotify token POST)
- Running `node server.js` or `npm start` → immediate crash, server never starts

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- SiriusXM channel search via Fuse.js and playback via `setAVTransport` must continue to work exactly as before
- Music search results for Spotify, Apple Music, Deezer, and Library must return data in the same structure
- Spotify authentication must return an access token in the same `{ accessToken, tokenType, expiresIn }` format
- Country detection via ipinfo.io must return the country code for market-specific searches
- Account ID and serial number parsing from the player status XML must produce identical results
- All other action modules (volume, play/pause, queue, etc.) must be completely unaffected

**Scope:**
All code paths that do NOT involve `request-promise` should be completely unaffected by this fix. This includes:
- All other action modules loaded by `require-dir.js`
- The Sonos discovery and control layer
- TTS providers and preset loading
- Static file serving and the HTTP API server itself

## Hypothesized Root Cause

Based on the bug description, the root cause is clear and confirmed:

1. **Broken Package Entry Point**: The `request-promise` package at version `~1.0.2` declares `main: "lib/tp.js"` in its `package.json`, but this file does not exist in the installed package. This is a known issue with this abandoned package version.

2. **Eager Module Loading**: `lib/helpers/require-dir.js` loads all `.js` files in `lib/actions/` at startup, meaning even an unused import (like in `siriusXM.js`) triggers the crash.

3. **No Lazy Loading**: The `require('request-promise')` calls are at the top level of each module, executed immediately during `require()`, with no try/catch or lazy-loading pattern.

4. **Outdated Dependency Pin**: The `~1.0.2` version constraint prevents npm from resolving to a newer, working version of the package (if one existed).

## Correctness Properties

Property 1: Bug Condition - Application Starts Successfully

_For any_ module load event where the module previously required `request-promise`, the fixed module SHALL load successfully without throwing a `MODULE_NOT_FOUND` error, allowing the application to start and serve HTTP requests.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - HTTP Requests Return Equivalent Results

_For any_ HTTP request previously made via `request-promise` (account lookup, country detection, service API search, Spotify auth), the fixed code using `fetch` SHALL return data in the same format and structure as the original `request-promise` call would have returned.

**Validates: Requirements 2.4, 2.5**

Property 3: Preservation - Non-HTTP Functionality Unchanged

_For any_ code path that does NOT involve HTTP requests via the replaced `request-promise` calls (SiriusXM channel lookup, music track loading, metadata generation, URI construction), the fixed code SHALL produce exactly the same results as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 4: Preservation - HTTP Response Parsing Equivalence

_For any_ input to the functions that consume HTTP responses (account ID parsing from XML, country code extraction from JSON, search result processing), the fixed code SHALL pass data in the same format so downstream consumers produce identical results.

**Validates: Requirements 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `lib/actions/siriusXM.js`

**Change**: Remove unused import
1. **Remove `require('request-promise')`**: Delete `const request = require('request-promise');` — this import is never used in the file.

---

**File**: `lib/actions/musicSearch.js`

**Change**: Replace `request-promise` with `fetch`
1. **Remove import**: Delete `const request = require('request-promise');`
2. **Replace `getAccountId` HTTP call**: Replace `request({url: player.baseUrl + '/status/accounts', json: false})` with `fetch(player.baseUrl + '/status/accounts').then(r => r.text())`
3. **Replace country detection call**: Replace `request({url: 'http://ipinfo.io', json: true})` with `fetch('https://ipinfo.io').then(r => r.json())` (upgrade to HTTPS)
4. **Replace service API call**: Replace `request(getRequestOptions(serviceDef, url))` with a `fetch(url, { headers })` call that returns `.json()`
5. **Update `getRequestOptions`**: Refactor to return fetch-compatible options (headers object) rather than request-promise options

---

**File**: `lib/music_services/spotifyDef.js`

**Change**: Replace `request-promise` with `fetch`
1. **Remove import**: Delete `var request = require('request-promise');`
2. **Replace `auth()` function**: Replace `request(options)` with `fetch(SPOTIFY_TOKEN_URL, { method: 'POST', headers, body: new URLSearchParams({ grant_type: 'client_credentials' }) }).then(r => r.json())`
3. **Remove `getOptions` function**: No longer needed since fetch uses a different options structure

---

**File**: `package.json`

**Changes**:
1. **Remove dependency**: Delete `"request-promise": "~1.0.2"` from `dependencies`
2. **Update engine requirement**: Change `"node": ">=4 <23"` to `"node": ">=18"` (built-in `fetch` requires Node 18+)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the crash occurs on unfixed code (exploratory), then verify the fix resolves the crash and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Confirm that `require('request-promise')` crashes the application on the unfixed code. Confirm the root cause is the missing `lib/tp.js` file.

**Test Plan**: Attempt to load the affected modules and observe the `MODULE_NOT_FOUND` error. Run `node -e "require('./lib/actions/musicSearch')"` on unfixed code.

**Test Cases**:
1. **Startup Crash Test**: Run `node server.js` and observe `MODULE_NOT_FOUND` error (will fail on unfixed code)
2. **Direct Module Load Test**: Run `node -e "require('./lib/actions/siriusXM')"` (will fail on unfixed code)
3. **Transitive Dependency Test**: Run `node -e "require('./lib/music_services/spotifyDef')"` (will fail on unfixed code)
4. **Package Inspection**: Check that `node_modules/request-promise/lib/tp.js` does not exist

**Expected Counterexamples**:
- `Error: Cannot find module './lib/tp'` from within `request-promise` package
- All three files fail to load with the same root cause

### Fix Checking

**Goal**: Verify that for all modules that previously required `request-promise`, the fixed modules load successfully and HTTP functionality works correctly.

**Pseudocode:**
```
FOR ALL module WHERE isBugCondition(module) DO
  result := require(module_fixed)
  ASSERT result.loaded = true
  ASSERT no MODULE_NOT_FOUND error thrown
END FOR

FOR ALL httpCall WHERE httpCall.previousClient = 'request-promise' DO
  result := fetchReplacement(httpCall.url, httpCall.options)
  ASSERT result.format = expectedFormat(httpCall)
  ASSERT result.statusCode = 200
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various search terms, service types, track configurations)
- It catches edge cases in response parsing that manual tests might miss
- It provides strong guarantees that non-HTTP code paths are unchanged

**Test Plan**: Observe behavior of non-HTTP functions (track loading, metadata generation, URI construction, search term building) on unfixed code, then write property-based tests to verify these continue to work identically after the fix.

**Test Cases**:
1. **SiriusXM Channel Search Preservation**: Verify Fuse.js search and `setAVTransport` calls work identically
2. **Track Loading Preservation**: Verify `loadTracks()` produces same track arrays for given JSON input
3. **Metadata Generation Preservation**: Verify `getMetadata()` produces same DIDL-Lite XML
4. **Search Term Building Preservation**: Verify `getSearchTerm()` produces same encoded terms
5. **Account ID Parsing Preservation**: Verify XML parsing logic extracts same account ID and serial number from same input

### Unit Tests

- Test that `siriusXM.js` loads without error after removing the unused import
- Test that `musicSearch.js` loads without error after replacing `request-promise`
- Test that `spotifyDef.js` loads without error after replacing `request-promise`
- Test `getAccountId` with mocked fetch returning XML text — verify same parsing result
- Test `doSearch` with mocked fetch returning JSON — verify same result structure
- Test Spotify `auth()` with mocked fetch returning token JSON — verify `{ accessToken, tokenType, expiresIn }` format

### Property-Based Tests

- Generate random valid XML account responses and verify `getAccountId` parsing extracts correct account ID and serial number
- Generate random Spotify token responses and verify `mapResponse` produces correct `{ accessToken, tokenType, expiresIn }` mapping
- Generate random search result JSON structures and verify `loadTracks`, `isEmpty`, `getURIandMetadata` produce consistent results
- Generate random search terms with artist/album/track specifiers and verify `getSearchTerm` encoding is consistent

### Integration Tests

- Test full application startup: `node server.js` starts without crash and responds to HTTP requests
- Test end-to-end music search flow with mocked external APIs
- Test Spotify authentication flow with mocked Spotify token endpoint
- Test country detection flow with mocked ipinfo.io response
