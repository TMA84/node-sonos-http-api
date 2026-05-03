# Clip Headers Crash Fix - Bugfix Design

## Overview

The `clip` and `clippreset` actions crash the server with `ERR_HTTP_HEADERS_SENT` because `serve-static` may partially handle the response (since clip files exist in the webroot under `/clips/`) before falling through to the API handler, which then attempts to write headers on an already-committed response. The fix adds `res.headersSent` guards in two locations to prevent duplicate header writes.

## Glossary

- **Bug_Condition (C)**: The condition where `res.headersSent` is `true` when code attempts to write headers — occurs when `serve-static` has already committed the response before the API handler or `sendResponse()` executes
- **Property (P)**: When headers are already sent, the system shall skip writing and log a warning instead of crashing
- **Preservation**: All existing behavior when `res.headersSent` is `false` must remain unchanged — normal API responses, static file serving, authentication, and error handling
- **sendResponse()**: The nested function in `lib/sonos-http-api.js` `requestHandler` that writes JSON responses
- **serve-static callback**: The fallthrough function in `server.js` that routes unhandled requests to authentication and the API

## Bug Details

### Bug Condition

The bug manifests when a clip/clippreset request URL (e.g., `/Büro/clip/test_node.mp3`) is processed and `serve-static` partially handles the response because the clip file path exists in the webroot (`static/clips/`). The `serve-static` callback then fires, and the code attempts to set headers on an already-committed response.

**Formal Specification:**
```
FUNCTION isBugCondition(req, res)
  INPUT: req of type http.IncomingMessage, res of type http.ServerResponse
  OUTPUT: boolean
  
  RETURN res.headersSent === true
         AND (codeAttemptsToSetHeader(res) OR codeAttemptsToWriteResponse(res))
END FUNCTION
```

### Examples

- `GET /Büro/clip/test_node.mp3` → `serve-static` serves the .mp3 file (headers sent), then callback fires and tries to set CORS headers → crash
- `GET /Büro/clippreset/mypreset` → clip action resolves, `sendResponse(200, ...)` tries to write headers on already-committed response → crash
- `GET /Büro/say/hello` → TTS file is generated in `/tts/` path, no conflict with `serve-static` → no crash (works correctly)
- `GET /Büro/clip/nonexistent.mp3` → file doesn't exist, `serve-static` falls through without sending headers → no crash (works correctly)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Normal API requests where `res.headersSent` is `false` must continue to receive JSON responses
- Static file serving by `serve-static` must continue to work for all files
- Authentication checks must continue to work when headers have not been sent
- Error responses (HTTP 500) must continue to be sent when headers have not been sent
- The `say`, `saypreset`, and all other non-clip actions must continue to work identically

**Scope:**
All requests where `res.headersSent` is `false` at the time of header-writing should be completely unaffected by this fix. This includes:
- All API actions that don't conflict with static file paths
- Static file requests that are fully handled by `serve-static`
- Authentication failures
- Error responses from failed actions

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Race between serve-static and API handler**: The clip file (e.g., `/clips/test_node.mp3`) exists in the webroot. When a request like `/Büro/clip/test_node.mp3` arrives, `serve-static` may match and serve the file (sending headers), then invoke the callback. The callback proceeds to set CORS headers or route to the API, crashing because headers are already sent.

2. **No headersSent guard in server.js callback**: The `serve-static` fallthrough callback in `server.js` unconditionally sets headers (`Access-Control-Allow-Methods`, etc.) without checking `res.headersSent`.

3. **No headersSent guard in sendResponse()**: The `sendResponse()` function in `lib/sonos-http-api.js` unconditionally writes `res.statusCode`, `Content-Length`, and `Content-Type` headers without checking `res.headersSent`.

## Correctness Properties

Property 1: Bug Condition - Headers Already Sent Guard

_For any_ request where `res.headersSent` is `true` at the point where code would write headers, the fixed code SHALL return early (in `server.js`) or skip writing and log a warning (in `sendResponse()`), preventing the `ERR_HTTP_HEADERS_SENT` crash.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Normal Response Behavior

_For any_ request where `res.headersSent` is `false` at the point where code writes headers, the fixed code SHALL produce exactly the same response as the original code, preserving all JSON responses, error handling, authentication, and static file serving.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `server.js`

**Location**: Top of the `serve-static` callback (`function(err)`)

**Change**: Add early return guard:
```javascript
serve(req, res, function (err) {
  if (res.headersSent) return;
  // ... rest of existing code unchanged
```

---

**File**: `lib/sonos-http-api.js`

**Function**: `sendResponse(code, body)` inside `requestHandler`

**Change**: Add guard at the top of `sendResponse`:
```javascript
function sendResponse(code, body) {
  if (res.headersSent) {
    logger.warn('Response already sent, skipping duplicate response');
    return;
  }
  // ... rest of existing code unchanged
```

### Rationale

- Both guards are minimal and defensive — they only activate when `res.headersSent` is `true`
- When `res.headersSent` is `false` (the normal case), execution proceeds exactly as before
- The `server.js` guard prevents any header-setting or API routing when the response is already committed
- The `sendResponse()` guard provides a second layer of defense and logs a warning for observability

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that `sendResponse()` and the `serve-static` callback crash when `res.headersSent` is `true`.

**Test Plan**: Create mock `res` objects with `headersSent = true` and invoke the relevant code paths. Observe the crash on unfixed code.

**Test Cases**:
1. **sendResponse with headersSent=true**: Call `sendResponse()` when `res.headersSent` is `true` (will crash on unfixed code)
2. **serve-static callback with headersSent=true**: Invoke the callback when `res.headersSent` is `true` (will crash on unfixed code)

**Expected Counterexamples**:
- `ERR_HTTP_HEADERS_SENT` thrown when `res.setHeader()` is called on a committed response
- Unhandled exception crashes the process

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL (req, res) WHERE isBugCondition(req, res) DO
  result := fixedHandler(req, res)
  ASSERT no exception thrown
  ASSERT res headers not modified after headersSent
  ASSERT server remains running
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL (req, res) WHERE NOT isBugCondition(req, res) DO
  ASSERT fixedHandler(req, res) produces same response as originalHandler(req, res)
END FOR
```

**Testing Approach**: Property-based testing with mock request/response objects to verify that when `headersSent` is `false`, the response body, status code, and headers are identical to the original behavior.

**Test Cases**:
1. **Normal API response preservation**: Verify that successful API actions still return `{"status":"success"}` with HTTP 200
2. **Error response preservation**: Verify that failed actions still return `{"status":"error",...}` with HTTP 500
3. **Authentication preservation**: Verify that auth checks still return HTTP 401 when credentials are invalid

### Unit Tests

- Test `sendResponse()` with `res.headersSent = true` → no crash, warning logged
- Test `sendResponse()` with `res.headersSent = false` → normal JSON response written
- Test `serve-static` callback with `res.headersSent = true` → early return, no headers set
- Test `serve-static` callback with `res.headersSent = false` → normal routing to API

### Property-Based Tests

- Generate random response states and verify no crash when `headersSent` is `true`
- Generate random API actions with `headersSent = false` and verify identical output to original

### Integration Tests

- Test full clip action request flow end-to-end
- Test that server remains running after clip requests
- Test that say/saypreset actions continue to work after fix
