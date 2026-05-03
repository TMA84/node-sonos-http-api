# Design Document: Webpage Modernization

## Overview

This design replaces the legacy web interface (jQuery 1.8, Backbone, Handlebars 1.0, Swagger UI ~2013) with a modern, lightweight, accessible web UI. The modernized interface consists of two pages:

1. **Landing Page** (`static/index.html`) — A semantic HTML5 page displaying API endpoint categories and live Sonos zone/speaker status, styled with modern CSS and CSS custom properties for theming.
2. **API Documentation Page** (`static/docs/index.html`) — An interactive OpenAPI 3.0 documentation page powered by Swagger UI 5.x.

Key constraints:
- No build step — all static assets are served as-is from `static/` via `serve-static`
- No CSS frameworks — vanilla CSS with custom properties
- No JavaScript frameworks — vanilla ES2020+ with `fetch` API
- Total landing page weight under 100KB (excluding API docs renderer)
- WCAG 2.1 AA accessibility compliance
- Responsive from 320px to 2560px
- Dark mode via `prefers-color-scheme`

## Architecture

```mermaid
graph TD
    subgraph "Static Assets (static/)"
        A[index.html - Landing Page]
        B[docs/index.html - API Docs]
        C[docs/openapi.yaml - OpenAPI 3.0 Spec]
        D[css/styles.css - Shared Styles]
        E[js/zones.js - Zone Fetcher]
        F[docs/swagger-ui/ - Vendored Swagger UI 5.x]
        G[sonos-icon.png - Logo]
    end

    subgraph "Server (server.js)"
        H[serve-static middleware]
        I[HTTP API handlers]
    end

    subgraph "API Endpoints"
        J[GET /zones]
        K[GET /{room}/state]
    end

    A -->|loads| D
    A -->|loads| E
    B -->|loads| F
    B -->|references| C
    E -->|fetch| J
    H -->|serves| A
    H -->|serves| B
    I -->|handles| J
    I -->|handles| K
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API docs renderer | Swagger UI 5.x (vendored) | Maintained, feature-rich, supports "Try it out", no CDN dependency |
| Landing page framework | None (vanilla HTML/CSS/JS) | No build step requirement, minimal weight, full control |
| CSS architecture | Custom properties + media queries | Native dark mode, responsive, zero dependencies |
| OpenAPI spec format | YAML file | Human-readable, easier to maintain, smaller than JSON |
| Zone data fetching | Vanilla `fetch` API | No dependencies, ES2020+ baseline, async/await |
| Swagger UI delivery | Vendored local copy | No external CDN dependency, works offline on LAN |

### File Structure (Post-Modernization)

```
static/
├── index.html              # Modernized landing page
├── css/
│   └── styles.css          # Shared styles (theming, layout, components)
├── js/
│   └── zones.js            # Zone data fetcher and renderer
├── docs/
│   ├── index.html          # API docs page (Swagger UI host)
│   ├── openapi.yaml        # OpenAPI 3.0 specification
│   └── swagger-ui/         # Vendored Swagger UI 5.x dist files
│       ├── swagger-ui-bundle.js
│       ├── swagger-ui-standalone-preset.js
│       └── swagger-ui.css
├── sonos-icon.png          # Retained branding asset
├── clips/                  # Retained (functional)
└── tts/                    # Retained (functional)
```

### Removed Assets

All files in `static/docs/lib/` (jQuery, Backbone, Underscore, Handlebars, highlight.js, shred, swagger-oauth, swagger-client), plus `swagger-ui.js`, `swagger-ui.min.js`, `o2c.html`, `spec.js`, and the legacy `css/` and `images/` directories.

## Components and Interfaces

### 1. Landing Page (`static/index.html`)

Semantic HTML5 structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sonos HTTP API</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header role="banner">
    <img src="/sonos-icon.png" alt="Sonos" width="64" height="64">
    <h1>Sonos HTTP API</h1>
    <nav role="navigation" aria-label="Main navigation">
      <a href="/docs">API Documentation</a>
    </nav>
  </header>

  <main role="main">
    <section id="zones" aria-label="Discovered Zones">
      <!-- Dynamically populated by zones.js -->
    </section>

    <section id="api-reference" aria-label="API Quick Reference">
      <!-- Static endpoint categories -->
    </section>
  </main>

  <footer role="contentinfo">
    <!-- Links to GitHub, docs -->
  </footer>

  <script type="module" src="/js/zones.js"></script>
</body>
</html>
```

### 2. Zone Fetcher Module (`static/js/zones.js`)

ES module responsible for fetching and rendering zone data.

```javascript
// static/js/zones.js
const ZONES_ENDPOINT = '/zones';

export async function fetchZones() { /* returns zone array or throws */ }
export function renderZones(zones, container) { /* builds DOM */ }
export function renderError(message, container) { /* shows error state */ }
export function renderLoading(container) { /* shows loading indicator */ }
export function renderEmpty(container) { /* shows "no speakers" message */ }
```

**Behavior:**
- On page load: show loading indicator → fetch `/zones` → render zones or error
- Refresh button: re-fetch and re-render without page reload
- Handles empty array (no speakers) and network errors gracefully

### 3. CSS Theme System (`static/css/styles.css`)

```css
:root {
  /* Light mode (default) */
  --color-bg: #ffffff;
  --color-surface: #f8f9fa;
  --color-text: #1a1a2e;
  --color-text-secondary: #4a4a6a;
  --color-accent: #2563eb;
  --color-border: #e2e8f0;
  /* ... spacing, typography tokens */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f0f23;
    --color-surface: #1a1a2e;
    --color-text: #e2e8f0;
    --color-text-secondary: #94a3b8;
    --color-accent: #60a5fa;
    --color-border: #2d2d44;
  }
}
```

### 4. API Documentation Page (`static/docs/index.html`)

Minimal HTML host that initializes Swagger UI with the local OpenAPI spec:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sonos API Documentation</title>
  <link rel="stylesheet" href="swagger-ui/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="swagger-ui/swagger-ui-bundle.js"></script>
  <script src="swagger-ui/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout'
    });
  </script>
</body>
</html>
```

### 5. OpenAPI 3.0 Specification (`static/docs/openapi.yaml`)

Converted from the existing Swagger 2.0 `spec.js`, expanded with:
- Proper `info`, `servers` block (relative URL `/`)
- Tags: `info`, `global`, `zone-control`, `playback`, `volume`, `queue`, `grouping`
- Full parameter descriptions with types and examples
- Response schemas for `/zones`, `/{room}/state`, `/favorites`, `/playlists`, `/queue`
- Reusable component schemas: `Zone`, `Player`, `State`, `Track`, `PlayMode`, `GroupState`

## Data Models

### Zone Response Schema (from `/zones` endpoint)

Based on `lib/actions/zones.js` `simplifyPlayer` and `simplifyZones`:

```typescript
interface ZoneResponse {
  uuid: string;
  coordinator: Player;
  members: Player[];
}

interface Player {
  uuid: string;
  state: PlayerState;
  playMode: PlayMode;
  roomName: string;
  coordinator: string;       // UUID of zone coordinator
  groupState: GroupState;
  baseUrl: string;
}

interface PlayerState {
  currentTrack: Track;
  nextTrack: Track;
  volume: number;
  mute: boolean;
  trackNo: number;
  elapsedTime: number;
  elapsedTimeFormatted: string;
  zoneState: string;         // "PLAYING" | "PAUSED_PLAYBACK" | "STOPPED"
  playerState: string;       // "PLAYING" | "PAUSED_PLAYBACK" | "STOPPED"
}

interface Track {
  artist: string;
  title: string;
  album: string;
  albumArtURI: string;
  duration: number;
  uri: string;
}

interface PlayMode {
  shuffle: boolean;
  repeat: string;            // "all" | "one" | "none"
  crossfade: boolean;
}

interface GroupState {
  volume: number;
  mute: boolean;
}
```

### OpenAPI 3.0 Component Schemas

The `openapi.yaml` file will define these as reusable components under `components/schemas/`, matching the TypeScript interfaces above. Response schemas will reference these components.

### CSS Custom Properties Token Map

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#ffffff` | `#0f0f23` | Page background |
| `--color-surface` | `#f8f9fa` | `#1a1a2e` | Card/section backgrounds |
| `--color-text` | `#1a1a2e` | `#e2e8f0` | Primary text |
| `--color-text-secondary` | `#4a4a6a` | `#94a3b8` | Secondary/muted text |
| `--color-accent` | `#2563eb` | `#60a5fa` | Links, interactive elements |
| `--color-border` | `#e2e8f0` | `#2d2d44` | Borders, dividers |
| `--color-success` | `#16a34a` | `#4ade80` | Playing state |
| `--color-warning` | `#d97706` | `#fbbf24` | Paused state |
| `--color-error` | `#dc2626` | `#f87171` | Error states |
| `--radius` | `0.5rem` | `0.5rem` | Border radius |
| `--space-xs` | `0.25rem` | `0.25rem` | Tight spacing |
| `--space-sm` | `0.5rem` | `0.5rem` | Small spacing |
| `--space-md` | `1rem` | `1rem` | Medium spacing |
| `--space-lg` | `2rem` | `2rem` | Large spacing |


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSS layout properties use relative units

*For any* CSS declaration in `styles.css` that sets a layout dimension property (width, max-width, min-width, height, margin, padding, gap), the value SHALL use relative units (rem, em, %, vw, vh, fr, auto) rather than fixed pixel values — with the exception of border-width and outline-width where px is standard.

**Validates: Requirements 4.4**

### Property 2: Theme color pairs meet WCAG AA contrast ratios

*For any* text color and background color pair defined in the CSS custom properties (in both light and dark theme definitions), the computed WCAG 2.1 contrast ratio SHALL be at least 4.5:1 for normal text colors and at least 3:1 for large text / UI component colors.

**Validates: Requirements 5.1, 8.4**

### Property 3: OpenAPI spec parameters are fully documented

*For any* endpoint in the OpenAPI specification that declares parameters, each parameter SHALL have a non-empty `description` field, a `schema` with a defined `type`, and an `example` value.

**Validates: Requirements 6.4**

### Property 4: Zone rendering produces correct group structure

*For any* valid zones response array (including empty arrays), calling the zone renderer SHALL produce exactly one zone group container per zone, and each zone group SHALL contain a representation of the coordinator player plus all member players listed in that zone.

**Validates: Requirements 10.1, 10.2**

### Property 5: Player rendering includes all required information

*For any* player object with populated state data, the rendered output for that player SHALL contain the room name, the playback state (playing/paused/stopped), the current track information (title, artist, album), and the volume level. When track information is absent, a "No music selected" indicator SHALL appear instead.

**Validates: Requirements 10.3, 10.4, 10.9**

## Error Handling

### Zone Fetching Errors

| Scenario | Behavior |
|----------|----------|
| Network failure (fetch rejects) | Display error message: "Unable to connect to Sonos API. Check that the server is running." |
| HTTP error (non-2xx response) | Display error message: "Failed to load zone data (HTTP {status})." |
| Invalid JSON response | Display error message: "Received invalid data from the server." |
| Empty zones array | Display informational message: "No speakers discovered yet. Make sure your Sonos system is on the same network." |
| Timeout (>5 seconds) | Use AbortController with 5s timeout; display timeout error |

### Error Display Pattern

Errors are rendered inline in the zones section with:
- A descriptive message (no technical jargon)
- A retry button that triggers a fresh fetch
- ARIA `role="alert"` for screen reader announcement

### Progressive Enhancement

The landing page renders all static content (API reference sections, navigation, footer) without JavaScript. The zones section shows a `<noscript>` fallback message directing users to the `/zones` endpoint directly. If JavaScript is enabled but the fetch fails, the error handling above applies.

### Swagger UI Errors

If the vendored Swagger UI files are missing or the OpenAPI spec fails to load, Swagger UI displays its own built-in error messaging. No custom error handling is needed for the docs page.

## Testing Strategy

### Unit Tests (Vitest)

Focus on the `zones.js` module logic:

- **renderZones**: Verify correct DOM structure for various zone configurations
- **renderError**: Verify error message display
- **renderEmpty**: Verify empty state message
- **renderLoading**: Verify loading indicator
- **fetchZones**: Verify fetch behavior with mocked responses (success, error, empty)

### Property-Based Tests (fast-check + Vitest)

The project already has `fast-check` as a dev dependency. Property tests will use `fast-check` with Vitest.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: webpage-modernization, Property {N}: {title}`

**Property tests to implement:**

1. **CSS relative units** — Parse `styles.css`, generate arbitrary layout declarations, verify no px values in layout properties
2. **WCAG contrast ratios** — Generate color pairs from theme tokens, compute contrast ratios, verify AA compliance
3. **OpenAPI parameter documentation** — Parse `openapi.yaml`, for each parameterized endpoint verify description/type/example
4. **Zone rendering structure** — Generate random zone arrays (varying sizes, member counts), verify rendered DOM structure
5. **Player rendering completeness** — Generate random player objects (with/without track data), verify rendered output contains required fields

### Integration Tests

- Verify static file serving works (serve-static serves new files)
- Verify `/zones` endpoint returns data matching the OpenAPI schema
- Visual regression at 320px, 768px, 1440px, 2560px viewports (manual or Playwright)

### Smoke Tests

- Legacy files removed (no jQuery, Backbone, etc. in static/docs/lib/)
- Swagger UI vendored files present
- OpenAPI spec file exists and is valid YAML
- Total page weight under 100KB
- No external CDN script tags in HTML files
- `clips/`, `tts/`, `sonos-icon.png` retained

### Accessibility Testing

- Automated: axe-core or similar tool for WCAG AA checks
- Manual: keyboard navigation, screen reader testing
- Note: Full WCAG 2.1 AA validation requires manual testing with assistive technologies and expert accessibility review

