# Tasks

## Task 1: Add headersSent guard in server.js

- [x] 1.1 Add `if (res.headersSent) return;` at the top of the `serve-static` callback in `server.js`

## Task 2: Add headersSent guard in sendResponse()

- [x] 2.1 Add `res.headersSent` check with warning log at the top of `sendResponse()` in `lib/sonos-http-api.js`

## Task 3: Write bug condition tests

- [x] 3.1 Write test verifying `sendResponse()` does not crash when `res.headersSent` is `true`
- [x] 3.2 Write test verifying the `serve-static` callback returns early when `res.headersSent` is `true`

## Task 4: Write preservation tests

- [x] 4.1 Write test verifying `sendResponse()` produces normal JSON response when `res.headersSent` is `false`
- [x] 4.2 Write test verifying the `serve-static` callback routes to API normally when `res.headersSent` is `false`
