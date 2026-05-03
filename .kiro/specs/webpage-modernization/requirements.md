# Requirements Document

## Introduction

Modernize the web interface for the node-sonos-http-api project. The current static pages (`static/index.html` and `static/docs/`) use outdated libraries (jQuery 1.8, Backbone, Handlebars 1.0, Swagger UI from ~2013) and lack responsive design, accessibility, and modern UX patterns. This feature replaces the legacy web assets with a modern, lightweight, and maintainable web UI that provides API documentation and a basic control interface for the Sonos system.

## Glossary

- **Web_UI**: The static HTML/CSS/JavaScript interface served from the `static/` directory by the node-sonos-http-api server
- **Main_Page**: The landing page at `static/index.html` that displays API endpoint documentation and links
- **API_Docs_Page**: The interactive API documentation page at `static/docs/` that allows users to explore and test API endpoints
- **Legacy_Assets**: The outdated JavaScript libraries (jQuery 1.8, Backbone, Handlebars 1.0, highlight.js 7.3, Swagger UI 2013-era) currently bundled in `static/docs/lib/`
- **OpenAPI_Spec**: The API specification describing available endpoints, currently defined in `static/docs/spec.js` as a Swagger 2.0 object
- **Responsive_Layout**: A page layout that adapts to different screen sizes (mobile, tablet, desktop)

## Requirements

### Requirement 1: Remove Legacy JavaScript Dependencies

**User Story:** As a maintainer, I want all outdated third-party JavaScript libraries removed from the project, so that the codebase has no known-vulnerable or unmaintained dependencies in the web layer.

#### Acceptance Criteria

1. THE Web_UI SHALL NOT include jQuery, Backbone, Underscore, Handlebars, or the 2013-era Swagger UI libraries
2. THE Web_UI SHALL NOT load any JavaScript from external CDNs without a documented justification
3. THE Web_UI SHALL function using only modern browser APIs (ES2020+) or a single lightweight documentation library

### Requirement 2: Modern API Documentation Page

**User Story:** As a developer integrating with the Sonos API, I want interactive API documentation that uses a current OpenAPI renderer, so that I can explore endpoints with accurate, up-to-date tooling.

#### Acceptance Criteria

1. THE API_Docs_Page SHALL render API documentation using a maintained OpenAPI/Swagger renderer (Swagger UI 5.x, Redoc, or Stoplight Elements)
2. THE API_Docs_Page SHALL load the API specification from a standalone OpenAPI 3.x JSON or YAML file
3. WHEN a user opens the API_Docs_Page, THE API_Docs_Page SHALL display all available endpoints grouped by tag within 2 seconds on a standard connection
4. WHEN a user expands an endpoint, THE API_Docs_Page SHALL display the HTTP method, path, parameters, and response schema
5. THE API_Docs_Page SHALL provide a "Try it out" capability that sends requests to the local server and displays responses

### Requirement 3: Modernized Landing Page

**User Story:** As a user, I want a clean, modern landing page that clearly presents the Sonos API capabilities and provides navigation to documentation, so that I can quickly understand and use the system.

#### Acceptance Criteria

1. THE Main_Page SHALL use semantic HTML5 elements (header, nav, main, section, footer)
2. THE Main_Page SHALL use modern CSS (CSS Grid or Flexbox) for layout without relying on CSS frameworks larger than 10KB
3. THE Main_Page SHALL display the API endpoint categories (Info, Global Control, Zone Control) in a scannable format
4. THE Main_Page SHALL include a navigation link to the API_Docs_Page
5. THE Main_Page SHALL render correctly without any JavaScript enabled (progressive enhancement)

### Requirement 4: Responsive Design

**User Story:** As a user accessing the API from different devices, I want the web interface to adapt to my screen size, so that I can use it comfortably on mobile, tablet, or desktop.

#### Acceptance Criteria

1. THE Web_UI SHALL use a Responsive_Layout that adapts to viewport widths from 320px to 2560px
2. WHEN the viewport width is below 768px, THE Main_Page SHALL stack content vertically and use full-width sections
3. WHEN the viewport width is 768px or above, THE Main_Page SHALL use a multi-column layout where appropriate
4. THE Web_UI SHALL use relative units (rem, em, %, vw) for spacing and sizing instead of fixed pixel values for layout dimensions

### Requirement 5: Accessibility Compliance

**User Story:** As a user with assistive technology, I want the web interface to follow accessibility best practices, so that I can navigate and use the documentation effectively.

#### Acceptance Criteria

1. THE Web_UI SHALL achieve WCAG 2.1 Level AA compliance for color contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)
2. THE Web_UI SHALL provide meaningful alt text for all images
3. THE Web_UI SHALL be fully navigable using keyboard-only input (Tab, Enter, Escape)
4. THE Web_UI SHALL use ARIA landmarks (banner, navigation, main, contentinfo) to identify page regions
5. THE Web_UI SHALL maintain a logical heading hierarchy (h1 through h6 without skipping levels)

### Requirement 6: OpenAPI Specification Upgrade

**User Story:** As a maintainer, I want the API specification upgraded from Swagger 2.0 to OpenAPI 3.x format, so that it is compatible with modern tooling and accurately describes the current API.

#### Acceptance Criteria

1. THE OpenAPI_Spec SHALL conform to OpenAPI 3.0 or 3.1 specification format
2. THE OpenAPI_Spec SHALL be stored as a standalone file (JSON or YAML) in the `static/docs/` directory
3. THE OpenAPI_Spec SHALL document all endpoints currently listed on the Main_Page
4. THE OpenAPI_Spec SHALL include parameter descriptions, types, and example values for each endpoint
5. THE OpenAPI_Spec SHALL define response schemas for endpoints that return structured data (zones, state, favorites, playlists, queue)

### Requirement 7: Performance and Bundle Size

**User Story:** As a user on a local network, I want the web pages to load quickly with minimal resource usage, so that the interface is responsive even on low-powered devices like Raspberry Pi.

#### Acceptance Criteria

1. THE Main_Page SHALL have a total page weight (HTML + CSS + images) below 100KB excluding the API documentation renderer
2. THE Main_Page SHALL achieve a DOMContentLoaded time below 500ms when served locally
3. THE Web_UI SHALL NOT require a build step or bundler for the static assets (files served as-is from the `static/` directory)
4. IF the API documentation renderer requires external resources, THEN THE API_Docs_Page SHALL load the renderer from a vendored local copy or a pinned CDN version with integrity hashes

### Requirement 8: Dark Mode Support

**User Story:** As a user who prefers dark interfaces, I want the web UI to respect my system color scheme preference, so that the interface is comfortable to use in low-light environments.

#### Acceptance Criteria

1. WHEN the user's system preference is set to dark mode, THE Web_UI SHALL render with a dark color scheme
2. WHEN the user's system preference is set to light mode, THE Web_UI SHALL render with a light color scheme
3. THE Web_UI SHALL use CSS `prefers-color-scheme` media query to detect the user's preference
4. THE Web_UI SHALL maintain WCAG 2.1 AA contrast ratios in both light and dark modes

### Requirement 9: Clean Removal of Obsolete Assets

**User Story:** As a maintainer, I want all obsolete web assets removed from the repository, so that the project does not carry dead code or outdated files.

#### Acceptance Criteria

1. THE Web_UI SHALL NOT contain the files in `static/docs/lib/` (jQuery, Backbone, Underscore, Handlebars, highlight.js, shred, swagger-oauth, swagger-client)
2. THE Web_UI SHALL NOT contain the legacy `static/docs/swagger-ui.js` or `static/docs/swagger-ui.min.js` files
3. THE Web_UI SHALL NOT contain the legacy `static/docs/o2c.html` file
4. THE Web_UI SHALL retain the `static/clips/` and `static/tts/` directories as they serve functional purposes
5. THE Web_UI SHALL retain the `static/sonos-icon.png` file for branding

### Requirement 10: Display Discovered Speakers and Zones

**User Story:** As a user, I want to see all discovered Sonos speakers and zones on the landing page, so that I can quickly view the current state of my audio system without using the API directly.

#### Acceptance Criteria

1. WHEN the Main_Page loads, THE Main_Page SHALL fetch zone data from the `/zones` endpoint and display all discovered zones
2. THE Main_Page SHALL display each zone as a distinct visual group containing the zone coordinator and member players
3. THE Main_Page SHALL display the room name, playback state (playing, paused, stopped), and current track information (title, artist, album) for each player in a zone
4. WHEN a player has no current track information, THE Main_Page SHALL display a "No music selected" indicator for that player
5. WHEN the `/zones` endpoint returns an empty array, THE Main_Page SHALL display a message indicating that no speakers have been discovered yet
6. IF the `/zones` endpoint request fails, THEN THE Main_Page SHALL display an error message describing the connection failure
7. THE Main_Page SHALL provide a manual refresh control that re-fetches zone data from the `/zones` endpoint when activated
8. WHEN the refresh control is activated, THE Main_Page SHALL update the displayed zone data without a full page reload
9. THE Main_Page SHALL display the volume level for each player in the zone
10. WHILE zone data is being fetched, THE Main_Page SHALL display a loading indicator to communicate progress to the user
