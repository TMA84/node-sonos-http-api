# Bugfix Requirements Document

## Introduction

When playing a clip via the HTTP API (e.g., `/{room}/clip/{filename}.mp3`), the server crashes with `ERR_HTTP_HEADERS_SENT: Cannot write headers after they are sent to the client`. This affects the `clip` and `clippreset` actions but not `say` or `saypreset`. The crash brings down the entire server, requiring a manual restart. The root cause is that the response-writing code in `sonos-http-api.js` and `server.js` does not guard against writing headers on a response that has already been committed, which can occur when `serve-static` has partially handled the response before falling through to the API handler.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a clip action request (e.g., `/Büro/clip/test_node.mp3`) is processed and the response headers have already been sent by a prior middleware THEN the system crashes with `ERR_HTTP_HEADERS_SENT` when `sendResponse()` attempts to write headers a second time

1.2 WHEN a clippreset action request is processed and the response headers have already been sent THEN the system crashes with `ERR_HTTP_HEADERS_SENT` in the same manner

1.3 WHEN the `sendResponse()` error handler in `sonos-http-api.js` catches a rejected promise and the response headers have already been sent THEN the system crashes with `ERR_HTTP_HEADERS_SENT` when attempting to write the error response

1.4 WHEN the `serve-static` callback in `server.js` is invoked and headers have already been sent THEN the system crashes when attempting to set CORS headers or authentication headers on the already-committed response

### Expected Behavior (Correct)

2.1 WHEN a clip action request is processed and the response headers have already been sent THEN the system SHALL skip writing the response and log a warning instead of crashing

2.2 WHEN a clippreset action request is processed and the response headers have already been sent THEN the system SHALL skip writing the response and log a warning instead of crashing

2.3 WHEN the `sendResponse()` error handler catches a rejected promise and the response headers have already been sent THEN the system SHALL log the error without attempting to write to the response

2.4 WHEN the `serve-static` callback in `server.js` is invoked and headers have already been sent THEN the system SHALL return early without attempting to set additional headers or route to the API handler

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a clip action request is processed and the response headers have NOT been sent THEN the system SHALL CONTINUE TO return a JSON success response with HTTP 200 status

3.2 WHEN a clippreset action request is processed and the response headers have NOT been sent THEN the system SHALL CONTINUE TO return a JSON success response with HTTP 200 status

3.3 WHEN a say or saypreset action request is processed THEN the system SHALL CONTINUE TO return a JSON success response with HTTP 200 status

3.4 WHEN a static file request is served successfully by `serve-static` THEN the system SHALL CONTINUE TO serve the file without invoking the API handler

3.5 WHEN an API action rejects with an error and the response headers have NOT been sent THEN the system SHALL CONTINUE TO return a JSON error response with HTTP 500 status

3.6 WHEN authentication is enabled and invalid credentials are provided THEN the system SHALL CONTINUE TO return HTTP 401 with the appropriate WWW-Authenticate header
