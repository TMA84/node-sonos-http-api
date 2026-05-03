# Implementation Plan: Project Modernization

## Overview

This plan modernizes `node-sonos-http-api` from a legacy CJS/JavaScript project to a modern ESM/TypeScript codebase with infrastructure tooling. The execution order minimizes rework: ESM first (TypeScript requires ESM imports), dependencies second (avoid double-work on type annotations), TypeScript third, then infrastructure and code quality as additive layers.

## Tasks

- [x] 1. Phase 1: ESM Conversion — Foundation
  - [x] 1.1 Add `"type": "module"` to package.json and create `lib/helpers/import-dir.js`
    - Add `"type": "module"` to package.json
    - Create `lib/helpers/import-dir.js` as async ESM replacement for `require-dir.js`
    - Uses `readdir` + dynamic `import()` to load action modules
    - _Requirements: 1.1, 1.5_

  - [x] 1.2 Convert `settings.js` and `lib/helpers/try-load-json.js` to ESM
    - Replace `require()` with `import` statements
    - Replace `module.exports` with `export default`
    - Replace `__dirname` with `fileURLToPath(import.meta.url)` + `dirname()`
    - Handle `sonos-discovery/lib/helpers/logger` via `createRequire`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.3 Convert `lib/sonos-http-api.js` to ESM
    - Replace `require('./helpers/require-dir')` with import of new `import-dir.js`
    - Replace `require('sonos-discovery/lib/helpers/request')` and logger with `createRequire`
    - Convert `module.exports = HttpAPI` to `export default HttpAPI`
    - Make action loading async (update constructor to use an `init()` method or top-level await pattern)
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 1.4 Convert `server.js` to ESM
    - Replace all `require()` calls with `import` statements
    - Use `createRequire` for `sonos-discovery` CJS interop
    - Replace `__dirname` usage with `import.meta.url` equivalent
    - Await the async action loading from `sonos-http-api.js`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.5 Convert all `lib/helpers/*.js` files to ESM
    - Convert `all-player-announcement.js`, `file-duration.js`, `http-event-server.js`, `is-radio-or-line-in.js`, `preset-announcement.js`, `single-player-announcement.js`, `try-download-tts.js`
    - Replace `require()` → `import`, `module.exports` → `export default`
    - Use `createRequire` for any `sonos-discovery` imports
    - _Requirements: 1.2, 1.3_

  - [x] 1.6 Convert all `lib/actions/*.js` files to ESM (batch 1: a–l)
    - Convert: `aldilifeMusic`, `amazonMusic`, `appleMusic`, `bbcSounds`, `clearqueue`, `clip`, `clipall`, `clippreset`, `debug`, `equalizer`, `favorite`, `favorites`, `group`, `linein`, `lockvolumes`
    - Each file: `require()` → `import`, `module.exports` → `export default`
    - _Requirements: 1.2, 1.3_

  - [x] 1.7 Convert all `lib/actions/*.js` files to ESM (batch 2: m–z)
    - Convert: `musicSearch`, `mute`, `napster`, `nextprevious`, `pandora`, `pauseall`, `playlist`, `playlists`, `playmode`, `playpause`, `preset`, `queue`, `reindex`, `say`, `sayall`, `saypreset`, `seek`, `services`, `setavtransporturi`, `siriusXM`, `sleep`, `spotify`, `state`, `sub`, `tunein`, `volume`, `zones`
    - Each file: `require()` → `import`, `module.exports` → `export default`
    - _Requirements: 1.2, 1.3_

  - [x] 1.8 Convert `lib/tts-providers/*.js` and `lib/music_services/*.js` to ESM
    - Convert: `aws-polly.js`, `elevenlabs.js`, `mac-os.js`, `microsoft.js`, `voicerss.js`, `default/google.js`
    - Convert: `appleDef.js`, `deezerDef.js`, `libraryDef.js`, `spotifyDef.js`
    - Convert `lib/presets-loader.js` to ESM
    - _Requirements: 1.2, 1.3_

  - [x] 1.9 Update test files and verify all existing tests pass
    - Test files are already `.mjs` — update any `require()` calls if present
    - Ensure test imports resolve correctly with ESM
    - Run `npx vitest run` and fix any failures
    - _Requirements: 1.6_

- [x] 2. Checkpoint — ESM conversion complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 3: Dependency Updates
  - [x] 3.1 Replace `aws-sdk` v2 with `@aws-sdk/client-polly`
    - Install `@aws-sdk/client-polly`
    - Remove `aws-sdk` from dependencies
    - Rewrite `lib/tts-providers/aws-polly.js` to use `PollyClient` + `SynthesizeSpeechCommand`
    - Preserve the cache filename format: `polly-{sha1(phrase)}-{VoiceId}.mp3`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Update `html-entities` to 2.x
    - Update package.json dependency to `^2.0.0`
    - Replace `new XmlEntities().decode(text)` with `import { decode } from 'html-entities'`
    - Search all files for `html-entities` usage and update API calls
    - _Requirements: 7.2, 7.4_

  - [x] 3.3 Update `mime` to 4.x
    - Update package.json dependency to `^4.0.0`
    - Replace `mime.lookup(path)` with `mime.getType(path)` in all usages
    - _Requirements: 7.3_

  - [x] 3.4 Update `json5` to 2.x
    - Update package.json dependency to `^2.0.0`
    - Verify `JSON5.parse()` API is unchanged (it is)
    - Verify settings loading still works with JSON5 features (comments, trailing commas)
    - _Requirements: 7.1, 7.5_

  - [x] 3.5 Handle `sonos-discovery` as local dependency
    - Replace GitHub tarball URL with a local file reference or workspace package
    - Ensure `createRequire` interop still resolves the module
    - _Requirements: 8.1, 8.2_

  - [x] 3.6 Remove unused dependencies and update ESLint
    - Remove `eslint-config-airbnb-base` and `eslint-plugin-import` from devDependencies
    - Install ESLint 9.x and create `eslint.config.js` (flat config)
    - Remove legacy `.eslintrc` file
    - Add `npm run lint` script that lints `lib/` and `server.js`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.6_

- [x] 4. Checkpoint — Dependencies updated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Phase 2: TypeScript Migration
  - [x] 5.1 Set up TypeScript configuration and build scripts
    - Install `typescript` as devDependency
    - Create `tsconfig.json` targeting ES2022, `module: "NodeNext"`, strict mode, outDir `dist/`
    - Add `"build": "tsc"` script to package.json
    - Create `types/sonos-discovery.d.ts` with type declarations for the Discovery_Module public API
    - Update `.gitignore` to include `dist/`, `.env`, `.env.*`, `coverage/`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Convert `settings.js` → `src/settings.ts`
    - Move to `src/settings.ts`
    - Add `Settings` interface with all typed fields
    - Add `merge()` function with proper typing
    - Type the default settings object
    - _Requirements: 5.2_

  - [x] 5.3 Convert `lib/helpers/*.js` → `src/lib/helpers/*.ts`
    - Convert all helper files to TypeScript with proper type annotations
    - `import-dir.ts` — generic type parameter for module type
    - `try-load-json.ts` — return type annotation
    - `file-duration.ts`, `http-event-server.ts`, etc.
    - _Requirements: 5.4_

  - [x] 5.4 Convert `lib/tts-providers/*.js` → `src/lib/tts-providers/*.ts`
    - Add typed interfaces for TTS provider return values
    - Type the AWS Polly provider with v3 SDK types
    - Type all other providers (elevenlabs, mac-os, microsoft, voicerss, google)
    - _Requirements: 5.6_

  - [x] 5.5 Convert `lib/music_services/*.js` → `src/lib/music_services/*.ts`
    - Add typed interfaces for music service definitions
    - Convert all 4 service definition files
    - _Requirements: 5.5_

  - [x] 5.6 Convert `lib/actions/*.js` → `src/lib/actions/*.ts` (batch 1: a–l)
    - Define `ActionHandler` type: `(player: Player, values: string[]) => Promise<ActionResponse>`
    - Convert first batch of action files with proper type annotations
    - _Requirements: 5.5_

  - [x] 5.7 Convert `lib/actions/*.js` → `src/lib/actions/*.ts` (batch 2: m–z)
    - Convert remaining action files with proper type annotations
    - _Requirements: 5.5_

  - [x] 5.8 Convert `lib/sonos-http-api.js` → `src/lib/sonos-http-api.ts`
    - Type the `HttpAPI` class/function with proper interfaces
    - Type the request handler, action dispatch, and webhook logic
    - _Requirements: 5.3_

  - [x] 5.9 Convert `server.js` → `src/server.ts`
    - Type the HTTP/HTTPS server setup
    - Type the request handler with auth logic
    - Ensure `npm run build` compiles without errors
    - _Requirements: 5.1, 4.5_

  - [x] 5.10 Update test imports and verify TypeScript build
    - Update test file imports to reference `dist/` or use ts paths
    - Run `npm run build` and verify no type errors
    - Run `npx vitest run` and verify all tests pass
    - _Requirements: 4.5, 12.2_

- [x] 6. Checkpoint — TypeScript migration complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase 4: Infrastructure
  - [x] 7.1 Create Dockerfile and docker-compose.yml
    - Create multi-stage `Dockerfile` with `node:20-alpine` base
    - Builder stage: install deps, copy source, run `npm run build`
    - Production stage: non-root user, copy dist + node_modules + static
    - Expose port 5005
    - Create `docker-compose.yml` with volume mounts for settings.json and presets/
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 7.2 Create GitHub Actions CI workflow
    - Create `.github/workflows/ci.yml`
    - Jobs: lint, typecheck (`tsc --noEmit`), test (`vitest run`)
    - Matrix: Node.js 18 and 20
    - Trigger on push to `main` and pull requests
    - Docker build step on tagged releases only
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 7.3 Rewrite README.md and create CONTRIBUTING.md
    - README: installation, Docker usage, API endpoint reference, configuration options with defaults/types
    - CONTRIBUTING: development setup, coding standards, PR guidelines
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 8. Checkpoint — Infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Phase 5: Code Quality
  - [x] 9.1 Implement health check endpoint
    - Create `src/health.ts` with `healthHandler` function
    - Returns `{ status: "ok", timestamp, discovery: "connected"|"pending" }`
    - Wire into server request handler at `/health` path
    - Bypass authentication for `/health`
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 9.2 Implement structured logger
    - Create `src/lib/helpers/logger.ts`
    - Support levels: error, warn, info, debug
    - Support `settings.log.level` threshold filtering
    - Support `settings.log.format` as `text` or `json`
    - Include timestamp, level, and message in each entry
    - Replace `sonos-discovery/lib/helpers/logger` usage throughout codebase
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 9.3 Improve error handling and input validation in request handler
    - Return 404 with JSON error for invalid player names
    - Return 400 with JSON error for unknown actions (include action name)
    - Return 400 for missing required action values
    - Return 500 for unhandled action errors (without stack trace)
    - Remove `stack` from all error responses
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 9.4 Write property test: TTS Cache Filename Determinism (Property 1)
    - **Property 1: TTS Cache Filename Determinism**
    - Test that for any phrase and voice, filename is `polly-{sha1(phrase)}-{voice}.mp3`
    - Verify output matches pre-migration behavior
    - Use `fc.string()` for phrase, `fc.constantFrom(voices)` for voice
    - **Validates: Requirements 6.5**

  - [x] 9.5 Write property test: Settings Merge Precedence (Property 2)
    - **Property 2: Settings Merge Precedence**
    - Test that source leaf values always appear in output, target-only leaves are preserved
    - Use `fc.dictionary()` with nested objects
    - **Validates: Requirements 12.3**

  - [x] 9.6 Write property test: Settings Serialization Round-Trip (Property 3)
    - **Property 3: Settings Serialization Round-Trip**
    - Test that `JSON.parse(JSON.stringify(settings))` produces equivalent object
    - Use custom `settingsArbitrary` matching Settings interface
    - **Validates: Requirements 12.6, 16.1**

  - [x] 9.7 Write property test: Invalid Player Returns 404 (Property 4)
    - **Property 4: Invalid Player Returns 404**
    - Test that any string not matching a registered player returns 404 with `status: "error"`
    - Use `fc.string()` filtered to exclude registered player names
    - **Validates: Requirements 13.1**

  - [x] 9.8 Write property test: Unknown Action Returns 400 (Property 5)
    - **Property 5: Unknown Action Returns 400**
    - Test that any string not matching a registered action returns 400 with `status: "error"` and action name
    - Use `fc.string()` filtered to exclude registered action names
    - **Validates: Requirements 13.2**

  - [x] 9.9 Write property tests: Log Level Filtering and Log Entry Structure (Properties 6 & 7)
    - **Property 6: Log Level Filtering**
    - Test that messages are emitted iff level ≥ threshold
    - **Property 7: Log Entry Structure**
    - Test that entries contain valid ISO 8601 timestamp, level, message; JSON format is parseable
    - Use `fc.constantFrom(levels)` × `fc.constantFrom(levels)` × `fc.string()`
    - **Validates: Requirements 15.2, 15.3, 15.4**

  - [x] 9.10 Write unit tests for Settings, Action Registry, and TTS Provider
    - Settings: JSON5 parsing (comments, trailing commas, unquoted keys), merge behavior
    - Action Registry: dynamic module loading from directory
    - TTS Provider: cache hit path, cache miss path, credential passing
    - **Validates: Requirements 12.3, 12.4, 12.5**

- [x] 10. Final Checkpoint — All phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between phases
- Property tests validate universal correctness properties from the design document
- The `sonos-discovery` module remains CJS throughout — interop via `createRequire`
- Existing test files (`.mjs`) should need minimal changes since they're already ESM-compatible
- The recommended phase order (ESM → Deps → TS → Infra → Quality) minimizes rework
