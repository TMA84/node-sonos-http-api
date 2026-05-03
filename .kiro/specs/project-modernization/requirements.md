# Requirements Document

## Introduction

This document defines the requirements for modernizing the node-sonos-http-api project. The modernization covers five phases: converting to ES Modules, adding TypeScript, updating dependencies, adding infrastructure tooling, and improving code quality. The project must remain backward-compatible with existing configurations and HTTP API endpoints throughout all changes.

## Glossary

- **API_Server**: The HTTP server that exposes Sonos control endpoints (currently `server.js`)
- **Action_Module**: A JavaScript/TypeScript module in `lib/actions/` that registers one or more API actions
- **TTS_Provider**: A module in `lib/tts-providers/` that synthesizes text-to-speech audio
- **Settings_Loader**: The module responsible for reading and merging `settings.json` with defaults
- **Preset_Loader**: The module responsible for reading preset JSON files from the presets directory
- **Discovery_Module**: The `sonos-discovery` dependency that handles Sonos device discovery via SSDP
- **Action_Registry**: The mechanism that loads all Action_Modules and maps action names to handler functions
- **Build_Pipeline**: The TypeScript compilation and bundling process
- **CI_Pipeline**: The GitHub Actions workflow that runs linting, type checking, and tests on each push
- **Container_Image**: The Docker image that packages the API_Server for deployment
- **ESM**: ECMAScript Modules using `import`/`export` syntax
- **CJS**: CommonJS modules using `require()`/`module.exports` syntax

## Requirements

### Requirement 1: ES Module Conversion

**User Story:** As a developer, I want the project to use ES Modules, so that it aligns with modern Node.js standards and enables better tooling support.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL set `"type": "module"` in package.json
2. WHEN a source file uses `require()`, THE Build_Pipeline SHALL replace it with an ESM `import` statement
3. WHEN a source file uses `module.exports`, THE Build_Pipeline SHALL replace it with an ESM `export` statement
4. WHEN a source file uses `__dirname` or `__filename`, THE Build_Pipeline SHALL replace it with an equivalent using `import.meta.url`
5. THE Action_Registry SHALL dynamically import all Action_Modules from the `lib/actions/` directory using ESM-compatible dynamic `import()`
6. WHEN the API_Server starts after ESM conversion, THE API_Server SHALL respond to all existing HTTP endpoints with the same response format as before conversion

### Requirement 2: ESLint Modernization

**User Story:** As a developer, I want modern ESLint configuration, so that I get current linting rules and can use flat config format.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL use ESLint version 9 or later with flat config format (`eslint.config.js`)
2. THE Build_Pipeline SHALL remove the legacy `.eslintrc` file after migration
3. THE Build_Pipeline SHALL remove `eslint-config-airbnb-base` and `eslint-plugin-import` from devDependencies
4. WHEN `npm run lint` is executed, THE Build_Pipeline SHALL lint all source files in `lib/` and `server.js` without errors

### Requirement 3: Gitignore Updates

**User Story:** As a developer, I want a comprehensive `.gitignore`, so that build artifacts and environment files are excluded from version control.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL include ignore patterns for TypeScript build output (`dist/`)
2. THE Build_Pipeline SHALL include ignore patterns for environment files (`.env`, `.env.*`)
3. THE Build_Pipeline SHALL include ignore patterns for coverage reports (`coverage/`)
4. THE Build_Pipeline SHALL retain all existing ignore patterns for backward compatibility

### Requirement 4: TypeScript Configuration

**User Story:** As a developer, I want TypeScript configured for the project, so that I get type safety and better IDE support.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL include a `tsconfig.json` targeting ES2022 with `module` set to `NodeNext`
2. THE Build_Pipeline SHALL configure TypeScript to emit output to a `dist/` directory
3. THE Build_Pipeline SHALL enable `strict` mode in the TypeScript configuration
4. THE Build_Pipeline SHALL include a `tsconfig.json` path mapping for the `sonos-discovery` module
5. WHEN `npm run build` is executed, THE Build_Pipeline SHALL compile all TypeScript files without errors

### Requirement 5: TypeScript Migration of Source Files

**User Story:** As a developer, I want source files converted to TypeScript, so that the codebase benefits from static type checking.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL convert `server.js` to `server.ts` with proper type annotations
2. THE Build_Pipeline SHALL convert `settings.js` to `settings.ts` with a typed settings interface
3. THE Build_Pipeline SHALL convert `lib/sonos-http-api.js` to `lib/sonos-http-api.ts` with typed request handling
4. THE Build_Pipeline SHALL convert all files in `lib/helpers/` to TypeScript
5. THE Build_Pipeline SHALL convert all files in `lib/actions/` to TypeScript
6. THE Build_Pipeline SHALL convert all files in `lib/tts-providers/` to TypeScript
7. WHEN a module imports from `sonos-discovery`, THE Build_Pipeline SHALL resolve it using a local type declaration file (`sonos-discovery.d.ts`)

### Requirement 6: AWS SDK Migration

**User Story:** As a developer, I want to use AWS SDK v3, so that I get smaller bundle size, modern API patterns, and continued support.

#### Acceptance Criteria

1. THE TTS_Provider SHALL use `@aws-sdk/client-polly` instead of the `aws-sdk` v2 package
2. WHEN the TTS_Provider synthesizes speech, THE TTS_Provider SHALL use the v3 `SynthesizeSpeechCommand` API
3. THE Build_Pipeline SHALL remove the `aws-sdk` v2 package from dependencies
4. WHEN `settings.aws.credentials` is configured, THE TTS_Provider SHALL pass credentials to the Polly client constructor in v3 format
5. WHEN the TTS_Provider is invoked with the same phrase and voice, THE TTS_Provider SHALL produce the same cached filename as before migration

### Requirement 7: Dependency Updates

**User Story:** As a developer, I want all dependencies updated to their latest compatible versions, so that I benefit from bug fixes, security patches, and new features.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL update `json5` to version 2.x or later
2. THE Build_Pipeline SHALL update `html-entities` to version 2.x or later
3. THE Build_Pipeline SHALL update `mime` to version 4.x or later
4. WHEN `html-entities` is updated, THE TTS_Provider SHALL use the new API (`decode`/`encode` from the updated package)
5. WHEN `json5` is updated, THE Settings_Loader SHALL continue to parse settings files with JSON5 syntax (comments, trailing commas)
6. THE Build_Pipeline SHALL remove any unused dependencies from package.json

### Requirement 8: Sonos Discovery Module Management

**User Story:** As a developer, I want the sonos-discovery dependency managed as a proper local module or maintained fork, so that builds are reproducible and not dependent on a GitHub tarball URL.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL replace the GitHub tarball reference for `sonos-discovery` with a local workspace package or a versioned npm reference
2. WHEN the Discovery_Module is loaded, THE API_Server SHALL resolve it from the local workspace or a pinned version
3. THE Build_Pipeline SHALL include type declarations for the Discovery_Module public API

### Requirement 9: Dockerfile

**User Story:** As a user, I want a Docker image for the project, so that I can deploy it consistently on any platform including Raspberry Pi.

#### Acceptance Criteria

1. THE Container_Image SHALL use a multi-stage build with a Node.js 20 Alpine base image
2. THE Container_Image SHALL support `linux/amd64` and `linux/arm/v7` architectures
3. THE Container_Image SHALL expose port 5005 by default
4. THE Container_Image SHALL use a non-root user to run the application
5. WHEN a `settings.json` file is mounted at `/app/settings.json`, THE API_Server SHALL load it as configuration
6. THE Container_Image SHALL include a `docker-compose.yml` for single-command startup with volume mounts for settings and presets

### Requirement 10: CI/CD Pipeline

**User Story:** As a developer, I want automated CI/CD, so that every push is validated and releases are consistent.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL run on every push to `main` and on every pull request
2. THE CI_Pipeline SHALL execute linting, type checking, and tests as separate steps
3. THE CI_Pipeline SHALL test against Node.js 18 and Node.js 20
4. THE CI_Pipeline SHALL build the Docker image on tagged releases
5. IF any CI step fails, THEN THE CI_Pipeline SHALL report the failure and stop subsequent steps

### Requirement 11: Documentation

**User Story:** As a user or contributor, I want up-to-date documentation, so that I can set up, use, and contribute to the project.

#### Acceptance Criteria

1. THE API_Server SHALL include a README.md with installation instructions, Docker usage, API endpoint reference, and configuration options
2. THE API_Server SHALL include a CONTRIBUTING.md with development setup, coding standards, and pull request guidelines
3. WHEN the README references configuration, THE README SHALL document all `settings.json` options with their defaults and types

### Requirement 12: Test Coverage

**User Story:** As a developer, I want comprehensive test coverage, so that regressions are caught early and behavior is documented.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL maintain vitest as the test runner with fast-check for property-based tests
2. WHEN `npm test` is executed, THE Build_Pipeline SHALL run all tests in the `test/` directory
3. THE Build_Pipeline SHALL include unit tests for the Settings_Loader covering JSON5 parsing and merge behavior
4. THE Build_Pipeline SHALL include unit tests for the Action_Registry covering dynamic module loading
5. THE Build_Pipeline SHALL include unit tests for the TTS_Provider covering cache hit and cache miss paths
6. FOR ALL valid settings objects, parsing then serializing then parsing SHALL produce an equivalent object (round-trip property)

### Requirement 13: Error Handling and Validation

**User Story:** As a user, I want proper error handling and input validation, so that the API responds predictably to malformed requests.

#### Acceptance Criteria

1. WHEN a request URL contains an invalid player name, THE API_Server SHALL return HTTP 404 with a JSON error body containing `status: "error"` and a descriptive message
2. WHEN a request URL contains an unknown action, THE API_Server SHALL return HTTP 400 with a JSON error body containing `status: "error"` and the unrecognized action name
3. IF an unhandled exception occurs during request processing, THEN THE API_Server SHALL return HTTP 500 with a JSON error body and log the error without crashing
4. WHEN a request is received with missing required action values, THE API_Server SHALL return HTTP 400 with a descriptive error message

### Requirement 14: Health Check Endpoint

**User Story:** As a DevOps engineer, I want a health check endpoint, so that container orchestrators and load balancers can verify the service is running.

#### Acceptance Criteria

1. WHEN a GET request is made to `/health`, THE API_Server SHALL return HTTP 200 with a JSON body containing `status: "ok"` and the current timestamp
2. WHEN the Discovery_Module has not yet found any Sonos devices, THE API_Server SHALL return HTTP 200 from `/health` with `status: "ok"` and `discovery: "pending"`
3. THE API_Server SHALL respond to `/health` without requiring authentication even when `settings.auth` is configured

### Requirement 15: Structured Logging

**User Story:** As a developer, I want structured logging with configurable levels, so that I can control verbosity and parse logs programmatically.

#### Acceptance Criteria

1. THE API_Server SHALL support log levels: `error`, `warn`, `info`, `debug`
2. WHEN `settings.log.level` is configured, THE API_Server SHALL only emit log messages at or above the configured level
3. THE API_Server SHALL include a timestamp, level, and message in each log entry
4. WHEN `settings.log.format` is set to `json`, THE API_Server SHALL emit log entries as JSON objects

### Requirement 16: Backward Compatibility

**User Story:** As an existing user, I want the modernized project to work with my current setup, so that I do not need to reconfigure anything.

#### Acceptance Criteria

1. WHEN an existing `settings.json` file is present, THE Settings_Loader SHALL parse it and apply all settings as before modernization
2. THE API_Server SHALL serve all existing HTTP endpoints at the same URL paths with the same response JSON structure
3. THE API_Server SHALL default to port 5005 for HTTP and port 5006 for HTTPS when no settings override is provided
4. WHEN preset files exist in the `presets/` directory, THE Preset_Loader SHALL load them identically to pre-modernization behavior
5. THE API_Server SHALL continue to support basic authentication when `settings.auth` is configured
