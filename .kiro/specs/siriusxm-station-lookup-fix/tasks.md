# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - SiriusXM Station Playback Uses Hardcoded Parameters
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to station playback inputs (values[0] not in ['data', 'channels', 'stations']) to ensure reproducibility
  - Create test file `test/siriusxm-bug-condition.test.mjs` using vitest and fast-check
  - Test 1a: For any channel from the channel list, `getSiriusXmUri(channel.id)` returns a URI containing hardcoded `sid=37` instead of a dynamic service ID (confirms URI bug)
  - Test 1b: For any channel from the channel list, `getSiriusXmMetadata(channel.id, channel.parentID, channel.fullTitle)` returns metadata with `<desc id="cdudn">_</desc>` instead of a proper `SA_RINCON{serviceType}_X_#Svc{serviceType}-0-Token` pattern (confirms metadata bug)
  - Test 1c: When `siriusXM` is called with a non-matching search term, it returns `undefined` instead of a rejected promise (confirms no-match bug)
  - Test 1d: When `siriusXM` is called with a matching station, it does NOT call `player.system.getServiceId('SiriusXM')` (confirms dynamic params are missing)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - `getSiriusXmUri('8208')` returns `x-sonosapi-hls:r%3a8208?sid=37&flags=8480&sn=11` with hardcoded sid=37
    - `getSiriusXmMetadata('8208', '00070044g%3apop', '10 - Pop2K')` returns XML with `<desc id="cdudn">_</desc>`
    - `siriusXM(player, ['nonexistent'])` returns `undefined` instead of rejected promise
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Utility Commands and Search Logic Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `test/siriusxm-preservation.test.mjs` using vitest and fast-check
  - Observe: `siriusXM(player, ['data'])` calls `player.system.getFavorites()` and resolves with "success" on unfixed code
  - Observe: `siriusXM(player, ['channels'])` resolves with "success" and outputs sorted channel numbers on unfixed code
  - Observe: `siriusXM(player, ['stations'])` resolves with "success" and outputs adjusted station titles on unfixed code
  - Observe: Fuse.js search with `keys: ["channelNum", "title"]` returns results via `results[0].item` on unfixed code
  - Write property-based test: for all inputs where values[0] is 'data', 'channels', or 'stations', the function resolves with "success" (from Preservation Requirements in design)
  - Write property-based test: for all channel indices, Fuse.js search by channelNum returns that channel as first result (from Preservation Requirements in design)
  - Write property-based test: for all channel indices, `adjustStation(channel.title)` produces the same normalized output (from Preservation Requirements in design)
  - Write property-based test: for all matching station inputs, `setAVTransport` is called before `play` (from Preservation Requirements in design)
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for SiriusXM station lookup using hardcoded parameters

  - [x] 3.1 Implement the fix
    - Update `getSiriusXmUri(id)` to accept a `sid` parameter: `getSiriusXmUri(id, sid)` and use it in the URI template instead of hardcoded `37`
    - Update `getSiriusXmMetadata(id, parent, title)` to accept a `serviceType` parameter: `getSiriusXmMetadata(id, parent, title, serviceType)` and replace `_` in cdudn with `SA_RINCON${serviceType}_X_#Svc${serviceType}-0-Token`
    - In the `siriusXM` function's station playback branch, retrieve dynamic service parameters: `const sid = player.system.getServiceId('SiriusXM')` and `const serviceType = player.system.getServiceType('SiriusXM')`
    - Pass `sid` to `getSiriusXmUri(channel.item.id, sid)`
    - Pass `serviceType` to `getSiriusXmMetadata(channel.item.id, channel.item.parentID, channel.item.fullTitle, serviceType)`
    - Add error handling after the `if (results.length > 0)` block: `else { return Promise.reject('No matching SiriusXM station found'); }`
    - Keep Fuse.js search logic, `adjustStation`, `replaceArray`, and utility commands (`data`, `channels`, `stations`) completely unchanged
    - _Bug_Condition: isBugCondition(input) where input.values[0] NOT IN ['data', 'channels', 'stations']_
    - _Expected_Behavior: URI uses dynamic sid from player.system.getServiceId('SiriusXM'), metadata uses SA_RINCON{serviceType}_X_#Svc{serviceType}-0-Token from player.system.getServiceType('SiriusXM'), no-match returns rejected promise_
    - _Preservation: Utility commands (data, channels, stations) unchanged; Fuse.js search logic unchanged; setAVTransport + play call sequence unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - SiriusXM Station Playback with Dynamic Parameters
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (dynamic sid, proper service token, rejected promise for no-match)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1: `npx vitest --run test/siriusxm-bug-condition.test.mjs`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Utility Commands and Search Logic Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2: `npx vitest --run test/siriusxm-preservation.test.mjs`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest --run`
  - Ensure all tests pass including existing tests in `test/bug-condition.test.mjs` and `test/preservation.test.mjs`
  - Ensure no regressions in any module
  - Ask the user if questions arise
