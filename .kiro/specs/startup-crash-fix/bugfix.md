# Bugfix Requirements Document

## Introduction

The application crashes immediately on startup (`node server.js` / `npm start`) because the `request-promise` dependency (pinned to `~1.0.2`) is an abandoned package whose `main` field points to a missing file (`lib/tp.js`). Since `lib/helpers/require-dir.js` eagerly loads all `.js` files under `lib/actions/` at startup, any file that calls `require('request-promise')` causes a fatal `MODULE_NOT_FOUND` error before the server can start. Three files depend on this broken package: `lib/actions/siriusXM.js` (unused import), `lib/actions/musicSearch.js` (used for HTTP requests), and `lib/music_services/spotifyDef.js` (used for Spotify API authentication).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the application starts and `require-dir.js` loads `lib/actions/siriusXM.js` THEN the system crashes with a `MODULE_NOT_FOUND` error because `request-promise` at version `~1.0.2` references a missing file

1.2 WHEN the application starts and `require-dir.js` loads `lib/actions/musicSearch.js` THEN the system crashes with a `MODULE_NOT_FOUND` error because `request-promise` at version `~1.0.2` references a missing file

1.3 WHEN `lib/actions/musicSearch.js` loads `lib/music_services/spotifyDef.js` THEN the system crashes with a `MODULE_NOT_FOUND` error because `spotifyDef.js` also requires `request-promise`

### Expected Behavior (Correct)

2.1 WHEN the application starts and `require-dir.js` loads `lib/actions/siriusXM.js` THEN the system SHALL load the module successfully without requiring `request-promise` (since the import is unused)

2.2 WHEN the application starts and `require-dir.js` loads `lib/actions/musicSearch.js` THEN the system SHALL load the module successfully using a modern HTTP client (Node.js built-in `fetch`) instead of `request-promise`

2.3 WHEN `lib/actions/musicSearch.js` loads `lib/music_services/spotifyDef.js` THEN the system SHALL load the module successfully using a modern HTTP client (Node.js built-in `fetch`) instead of `request-promise`

2.4 WHEN a music search is performed that requires HTTP requests (account lookup, country detection, service API calls) THEN the system SHALL make those HTTP requests successfully using the replacement HTTP client and return results in the same format

2.5 WHEN Spotify authentication is performed THEN the system SHALL successfully obtain an access token using the replacement HTTP client and return the token for use in subsequent API calls

2.6 WHEN `request-promise` is no longer used by any file THEN the system SHALL have the `request-promise` dependency removed from `package.json`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a SiriusXM channel is requested by name or number THEN the system SHALL CONTINUE TO search the channel list using Fuse.js and play the matched channel via `setAVTransport`

3.2 WHEN a music search is performed for an album, song, station, or playlist on Spotify THEN the system SHALL CONTINUE TO return search results in the same data structure and queue tracks in the same order

3.3 WHEN a music search is performed for Apple Music, Deezer, or Library services THEN the system SHALL CONTINUE TO return search results and queue tracks identically

3.4 WHEN the Spotify service definition provides request headers via `headers()` THEN the system SHALL CONTINUE TO return a Bearer token authorization header in the same format

3.5 WHEN the country is detected via ipinfo.io for market-specific searches THEN the system SHALL CONTINUE TO append the country code to search URLs in the same format

3.6 WHEN the player account ID is retrieved from the player status endpoint THEN the system SHALL CONTINUE TO parse the account ID and serial number from the XML response in the same way

---

## Bug Condition (Formal)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ModuleLoadEvent
  OUTPUT: boolean
  
  // Returns true when a module being loaded requires 'request-promise'
  RETURN X.moduleDependencies CONTAINS 'request-promise'
END FUNCTION
```

```pascal
// Property: Fix Checking - Startup succeeds
FOR ALL X WHERE isBugCondition(X) DO
  result ← loadModule'(X)
  ASSERT result.loaded = true AND no_crash(result)
END FOR
```

```pascal
// Property: Preservation Checking - Non-affected modules unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT loadModule(X) = loadModule'(X)
END FOR
```

```pascal
// Property: Fix Checking - HTTP functionality preserved
FOR ALL X WHERE X.type = HTTPRequest AND X.previouslyUsed = 'request-promise' DO
  result ← httpClient'(X.options)
  ASSERT result.statusCode = expectedStatusCode(X) AND result.body = expectedBody(X)
END FOR
```
