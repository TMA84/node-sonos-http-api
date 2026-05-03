# Implementation Plan: Webpage Modernization

## Overview

Replace the legacy web interface (jQuery, Backbone, Handlebars, Swagger UI ~2013) with a modern, lightweight, accessible web UI. Implementation proceeds bottom-up: shared styles first, then the landing page structure, zone fetcher module, OpenAPI spec, API docs page, and finally legacy asset removal.

## Tasks

- [x] 1. Create shared CSS stylesheet with theming system
  - [x] 1.1 Create `static/css/styles.css` with CSS custom properties for light and dark themes
    - Define all color tokens (--color-bg, --color-surface, --color-text, --color-text-secondary, --color-accent, --color-border, --color-success, --color-warning, --color-error)
    - Define spacing tokens (--space-xs, --space-sm, --space-md, --space-lg) and --radius
    - Implement `@media (prefers-color-scheme: dark)` override block
    - Add base reset/normalize styles, typography, and layout utilities
    - Implement responsive breakpoints (mobile-first: 320px base, 768px tablet, 1024px+ desktop)
    - Use relative units (rem, em, %, vw) for all layout dimensions
    - Ensure WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text) in both themes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 8.1, 8.2, 8.3, 8.4_

  - [x] 1.2 Write property test: CSS layout properties use relative units
    - **Property 1: CSS layout properties use relative units**
    - Parse `styles.css` and verify no px values in layout dimension properties (width, max-width, min-width, height, margin, padding, gap)
    - Allow px only for border-width and outline-width
    - **Validates: Requirements 4.4**

  - [x] 1.3 Write property test: Theme color pairs meet WCAG AA contrast ratios
    - **Property 2: Theme color pairs meet WCAG AA contrast ratios**
    - Extract color pairs from CSS custom properties for both light and dark themes
    - Compute WCAG 2.1 contrast ratios and verify ≥4.5:1 for normal text, ≥3:1 for large text/UI
    - **Validates: Requirements 5.1, 8.4**

- [x] 2. Build modernized landing page structure
  - [x] 2.1 Create `static/index.html` with semantic HTML5 structure
    - Use semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
    - Add ARIA landmarks: role="banner", role="navigation", role="main", role="contentinfo"
    - Include proper heading hierarchy (h1 → h2 → h3, no skipped levels)
    - Add viewport meta tag for responsive design
    - Link to `/css/styles.css` for styling
    - Include navigation link to `/docs` (API Documentation)
    - Add static API endpoint categories (Info, Global Control, Zone Control) in scannable format
    - Add `<noscript>` fallback in zones section directing users to `/zones` endpoint
    - Ensure page renders correctly without JavaScript (progressive enhancement)
    - Add meaningful alt text for the Sonos logo image
    - Load `js/zones.js` as ES module (`type="module"`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 Write unit tests for landing page HTML structure
    - Verify semantic HTML5 elements are present
    - Verify ARIA landmarks exist
    - Verify heading hierarchy is logical
    - Verify no external CDN script tags
    - _Requirements: 3.1, 5.3, 5.4, 5.5, 1.2_

- [x] 3. Implement zone fetcher and renderer module
  - [x] 3.1 Create `static/js/zones.js` ES module
    - Export `fetchZones()` — fetches `/zones` with AbortController (5s timeout), returns zone array or throws
    - Export `renderZones(zones, container)` — builds DOM with one zone group per zone, showing coordinator + members
    - Export `renderError(message, container)` — displays error with `role="alert"` and retry button
    - Export `renderLoading(container)` — shows loading indicator
    - Export `renderEmpty(container)` — shows "No speakers discovered yet" message
    - On page load: show loading → fetch → render zones/error/empty
    - Implement refresh button that re-fetches without page reload
    - Display for each player: room name, playback state, current track (title, artist, album), volume level
    - Display "No music selected" when track info is absent
    - Handle network failures, HTTP errors, invalid JSON, empty arrays, and timeouts
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

  - [x] 3.2 Write property test: Zone rendering produces correct group structure
    - **Property 4: Zone rendering produces correct group structure**
    - Generate random zone arrays (varying sizes, 0-10 zones, 1-5 members each)
    - Verify exactly one zone group container per zone in rendered output
    - Verify each group contains coordinator + all member players
    - **Validates: Requirements 10.1, 10.2**

  - [x] 3.3 Write property test: Player rendering includes all required information
    - **Property 5: Player rendering includes all required information**
    - Generate random player objects with and without track data
    - Verify rendered output contains room name, playback state, track info (or "No music selected"), and volume
    - **Validates: Requirements 10.3, 10.4, 10.9**

  - [x] 3.4 Write unit tests for zones.js fetch behavior
    - Test fetchZones with mocked success response
    - Test fetchZones with network error
    - Test fetchZones with HTTP error status
    - Test fetchZones with timeout
    - Test renderEmpty and renderLoading output
    - _Requirements: 10.5, 10.6, 10.10_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create OpenAPI 3.0 specification
  - [x] 5.1 Create `static/docs/openapi.yaml` with full API specification
    - Use OpenAPI 3.0 format with proper `openapi`, `info`, and `servers` fields
    - Define tags: info, global, zone-control, playback, volume, queue, grouping
    - Document all endpoints from the landing page (zones, favorites, playlists, lockvolumes, unlockvolumes, pauseall, resumeall, reindex, sleep, preset, room/action, room/action/parameter)
    - Include parameter descriptions, types (string, integer), and example values for every parameter
    - Define response schemas for structured endpoints: /zones, /{room}/state, /favorites, /playlists, /{room}/queue
    - Create reusable component schemas: Zone, Player, PlayerState, Track, PlayMode, GroupState
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Write property test: OpenAPI spec parameters are fully documented
    - **Property 3: OpenAPI spec parameters are fully documented**
    - Parse `openapi.yaml` and iterate all endpoints with parameters
    - Verify each parameter has non-empty `description`, `schema.type`, and `example`
    - **Validates: Requirements 6.4**

- [x] 6. Set up API documentation page with Swagger UI 5.x
  - [x] 6.1 Vendor Swagger UI 5.x distribution files
    - Download `swagger-ui-bundle.js`, `swagger-ui-standalone-preset.js`, and `swagger-ui.css` from Swagger UI 5.x release
    - Place files in `static/docs/swagger-ui/` directory
    - _Requirements: 2.1, 7.4_

  - [x] 6.2 Create `static/docs/index.html` as Swagger UI host page
    - Minimal HTML5 page with proper meta tags and lang attribute
    - Load vendored Swagger UI CSS and JS from local `swagger-ui/` directory
    - Initialize SwaggerUIBundle with `url: '/docs/openapi.yaml'` and StandaloneLayout
    - Ensure "Try it out" functionality works against local server
    - No external CDN references
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 1.2, 7.4_

- [x] 7. Remove legacy assets
  - [x] 7.1 Delete all obsolete files from the repository
    - Remove entire `static/docs/lib/` directory (jQuery, Backbone, Underscore, Handlebars, highlight.js, shred, swagger-oauth, swagger-client)
    - Remove `static/docs/swagger-ui.js` and `static/docs/swagger-ui.min.js`
    - Remove `static/docs/o2c.html`
    - Remove `static/docs/spec.js`
    - Remove legacy `static/docs/css/` directory
    - Remove legacy `static/docs/images/` directory
    - Retain `static/clips/`, `static/tts/`, and `static/sonos-icon.png`
    - _Requirements: 1.1, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 7.2 Write smoke tests verifying legacy removal and new structure
    - Verify no jQuery, Backbone, Underscore, Handlebars files exist in static/docs/lib/
    - Verify swagger-ui vendored files are present
    - Verify openapi.yaml exists and is valid YAML
    - Verify clips/, tts/, sonos-icon.png are retained
    - Verify no external CDN script tags in any HTML file
    - _Requirements: 1.1, 1.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Verify page weight and performance constraints
  - [x] 8.1 Validate total landing page weight is under 100KB
    - Measure combined size of index.html + css/styles.css + js/zones.js + sonos-icon.png
    - Optimize if needed (compress PNG, minify CSS if over budget)
    - Ensure no build step is required — files served as-is
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest for testing and fast-check for property-based tests (both already in devDependencies)
- All static assets are vanilla HTML/CSS/JS with no build step required
