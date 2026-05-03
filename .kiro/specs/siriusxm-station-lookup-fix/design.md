# SiriusXM Station Lookup Fix - Bugfix Design

## Overview

The SiriusXM station lookup action (`lib/actions/siriusXM.js`) fails to play stations when requested via the HTTP API because it uses hardcoded service parameters (`sid=37`, `flags=8480`, `sn=11`) and an outdated metadata format that current Sonos firmware rejects. Additionally, when no station matches the search query, the function silently returns `undefined` instead of a rejected promise, causing unhandled downstream errors. The fix will dynamically retrieve service parameters from the player's service list (following the pattern used by `spotify.js`) and add proper error handling for the no-match case.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a SiriusXM station is requested by number or name via the API, the generated URI and metadata are rejected by the Sonos player due to outdated hardcoded parameters
- **Property (P)**: The desired behavior — the system generates a valid URI and metadata using dynamic service parameters, and the station plays successfully
- **Preservation**: Existing behaviors that must remain unchanged — the `data`, `channels`, and `stations` utility commands, the Fuse.js fuzzy search logic, and the `setAVTransport` + `play` call sequence
- **`getSiriusXmUri(id)`**: The function in `lib/actions/siriusXM.js` that generates the Sonos transport URI for a SiriusXM channel
- **`getSiriusXmMetadata(id, parent, title)`**: The function in `lib/actions/siriusXM.js` that generates DIDL-Lite XML metadata for a SiriusXM channel
- **`sid`**: The Sonos service ID for SiriusXM, previously hardcoded as `37`
- **`sn`**: The Sonos service number (serial number) for SiriusXM, previously hardcoded as `11`
- **`serviceType`**: The Sonos service type identifier used in the `cdudn` descriptor for authentication tokens

## Bug Details

### Bug Condition

The bug manifests when a user requests a SiriusXM station by channel number or name via the HTTP API (e.g., `/Office/siriusxm/25`). The `getSiriusXmUri` function generates a URI with hardcoded `sid=37&flags=8480&sn=11` and the `getSiriusXmMetadata` function generates metadata with a bare `_` as the `cdudn` descriptor value. These values are no longer accepted by current Sonos firmware, resulting in a 500 error from the `/MediaRenderer/AVTransport/Control` endpoint. A secondary bug occurs when no search results are found — the function falls through without returning a value.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type {player: Player, values: string[]}
  OUTPUT: boolean
  
  RETURN input.values[0] NOT IN ['data', 'channels', 'stations']
         AND (
           stationMatchFound(input.values[0])
           OR NOT stationMatchFound(input.values[0])
         )
END FUNCTION
```

Note: The bug condition covers ALL station playback requests — both when a match is found (URI/metadata are invalid) and when no match is found (returns undefined).

### Examples

- User requests `/Office/siriusxm/25` → Fuse.js finds channel 25, generates URI `x-sonosapi-hls:r%3a8208?sid=37&flags=8480&sn=11` → Sonos rejects with 500 error (expected: station plays)
- User requests `/Office/siriusxm/hits1` → Fuse.js finds "Hits 1", generates metadata with `<desc id="cdudn">_</desc>` → Sonos rejects (expected: station plays with valid service token)
- User requests `/Office/siriusxm/nonexistent` → Fuse.js returns empty results → function returns `undefined` (expected: rejected promise with error message)
- User requests `/Office/siriusxm/CNN` → Fuse.js finds CNN channel, generates outdated URI → Sonos rejects (expected: station plays with dynamic service parameters)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `data` command must continue to retrieve Sonos favorites and output channel information to the console
- The `channels` command must continue to output sorted channel numbers to the console
- The `stations` command must continue to output adjusted station titles to the console
- Fuse.js fuzzy search logic must continue to find the best matching channel from the channel list using `channelNum` and `title` keys
- The call sequence of `player.coordinator.setAVTransport(uri, metadata)` followed by `player.coordinator.play()` must remain unchanged
- The `adjustStation` helper function must continue to normalize station names identically
- The `replaceArray` character substitution list must remain unchanged

**Scope:**
All inputs where `values[0]` is `'data'`, `'channels'`, or `'stations'` should be completely unaffected by this fix. This includes:
- Console output formatting for channel data
- Sorting behavior for channel numbers
- The `adjustStation` normalization logic
- Promise resolution with `"success"` for utility commands

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Outdated Service ID (`sid`)**: The hardcoded `sid=37` may no longer be the correct service ID for SiriusXM on the user's Sonos system. The Spotify action demonstrates the correct pattern: `player.system.getServiceId('SiriusXM')` retrieves the dynamic value.

2. **Missing Service Token in Metadata**: The `cdudn` descriptor is set to `_` (a bare underscore), while the Spotify action uses `SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token`. Current Sonos firmware likely requires a proper service authentication token in the metadata for SiriusXM as well.

3. **Hardcoded Service Number (`sn`)**: The `sn=11` parameter may be incorrect for the user's system configuration. This should be derived dynamically or omitted if not required.

4. **No Error Handling for Empty Results**: When `results.length` is 0, the code falls through the `if` block without returning anything, causing the function to return `undefined` instead of a rejected promise.

## Correctness Properties

Property 1: Bug Condition - SiriusXM Station Playback with Dynamic Parameters

_For any_ input where a station search term is provided (not `data`, `channels`, or `stations`) and a matching channel exists in the channel list, the fixed `siriusXM` function SHALL generate a URI using the dynamic service ID from `player.system.getServiceId('SiriusXM')` and metadata containing the proper service token from `player.system.getServiceType('SiriusXM')`, and SHALL pass these to `setAVTransport` followed by `play`.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - No Match Error Handling

_For any_ input where a station search term is provided (not `data`, `channels`, or `stations`) and NO matching channel exists in the channel list, the fixed `siriusXM` function SHALL return a rejected promise with the message `'No matching SiriusXM station found'`.

**Validates: Requirements 2.3**

Property 3: Preservation - Utility Commands Unchanged

_For any_ input where `values[0]` is `'data'`, `'channels'`, or `'stations'`, the fixed `siriusXM` function SHALL produce exactly the same behavior as the original function, preserving console output and promise resolution.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 4: Preservation - Fuse.js Search Logic Unchanged

_For any_ station search term input, the fixed `siriusXM` function SHALL use the same Fuse.js configuration (`keys: ["channelNum", "title"]`) and access results via `results[0].item` (Fuse.js 6.x format), preserving the existing search behavior.

**Validates: Requirements 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `lib/actions/siriusXM.js`

**Functions**: `getSiriusXmUri`, `getSiriusXmMetadata`, `siriusXM`

**Specific Changes**:

1. **Update `getSiriusXmUri` to accept dynamic `sid`**: Change the function signature to accept a `sid` parameter instead of hardcoding `37`. Update the URI template to use the dynamic value. Keep `flags=8480` as this is a protocol flag, not a service-specific value.

2. **Update `getSiriusXmMetadata` to accept `serviceType`**: Change the function signature to accept a `serviceType` parameter. Replace the `cdudn` descriptor value from `_` to `SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token` (matching the Spotify pattern).

3. **Retrieve dynamic service parameters in `siriusXM`**: Before generating the URI and metadata, call `player.system.getServiceId('SiriusXM')` to get the `sid` and `player.system.getServiceType('SiriusXM')` to get the `serviceType`.

4. **Add error handling for no search results**: After the `if (results.length > 0)` block, add an `else` clause that returns `Promise.reject('No matching SiriusXM station found')`.

5. **Keep Fuse.js search logic unchanged**: The fuzzy search instantiation, configuration, and result access pattern (`results[0].item`) must remain identical.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that call the `getSiriusXmUri` and `getSiriusXmMetadata` functions and assert that the generated URI contains dynamic service parameters and the metadata contains a proper service token. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **URI Parameter Test**: Assert that `getSiriusXmUri` output contains a dynamic `sid` value from the player (will fail on unfixed code because `sid=37` is hardcoded)
2. **Metadata Token Test**: Assert that `getSiriusXmMetadata` output contains `SA_RINCON` service token pattern (will fail on unfixed code because `cdudn` is `_`)
3. **No Match Rejection Test**: Call `siriusXM` with a non-matching search term and assert it returns a rejected promise (will fail on unfixed code because it returns `undefined`)
4. **Dynamic Service ID Test**: Assert that the function calls `player.system.getServiceId('SiriusXM')` (will fail on unfixed code because no such call exists)

**Expected Counterexamples**:
- `getSiriusXmUri('8208')` returns `x-sonosapi-hls:r%3a8208?sid=37&flags=8480&sn=11` with hardcoded values
- `getSiriusXmMetadata(...)` returns XML with `<desc id="cdudn">_</desc>` instead of a service token
- `siriusXM(player, ['nonexistent'])` returns `undefined` instead of a rejected promise

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := siriusXM_fixed(input.player, input.values)
  IF stationMatchFound(input.values[0]) THEN
    ASSERT result.uri CONTAINS player.system.getServiceId('SiriusXM')
    ASSERT result.metadata CONTAINS 'SA_RINCON' + player.system.getServiceType('SiriusXM')
    ASSERT setAVTransport called with valid uri and metadata
    ASSERT play called after setAVTransport
  ELSE
    ASSERT result IS rejected promise
    ASSERT result.reason == 'No matching SiriusXM station found'
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT siriusXM_original(input.player, input.values) = siriusXM_fixed(input.player, input.values)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for the `data`, `channels`, and `stations` commands and for Fuse.js search results, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Fuse.js Search Preservation**: Verify that searching by channel number or title continues to return the same results from the channel list (already tested in existing `preservation.test.mjs`)
2. **Utility Command Preservation**: Verify that `data`, `channels`, and `stations` commands continue to resolve with `"success"` and produce expected console output
3. **Channel Data Structure Preservation**: Verify that channel objects accessed via `results[0].item` continue to have `id`, `parentID`, `fullTitle`, `channelNum`, and `title` properties
4. **setAVTransport Call Sequence Preservation**: Verify that `setAVTransport` is still called before `play` when a match is found

### Unit Tests

- Test `getSiriusXmUri` generates URI with dynamic `sid` parameter
- Test `getSiriusXmMetadata` generates metadata with proper `SA_RINCON` service token
- Test `siriusXM` returns rejected promise when no match is found
- Test `siriusXM` calls `player.system.getServiceId('SiriusXM')` for dynamic parameters

### Property-Based Tests

- Generate random channel IDs from the channel list and verify the URI contains the dynamic service ID
- Generate random channel entries and verify metadata contains the service type token
- Generate random non-matching search strings and verify a rejected promise is returned
- Generate random channel indices and verify Fuse.js search results are unchanged (existing test)

### Integration Tests

- Test full flow: search for a station by number → generate URI with dynamic params → call setAVTransport → call play
- Test full flow: search for a station by name → generate URI with dynamic params → call setAVTransport → call play
- Test error flow: search for non-existent station → receive rejected promise with descriptive message
