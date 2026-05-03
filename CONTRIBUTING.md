# Contributing to Sonos HTTP API

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api

# Install dependencies
npm install

# Build TypeScript source
npm run build

# Run the development server
node dist/server.js
```

**Requirements:**
- Node.js 18 or higher
- npm 9+

## Project Structure

```
├── src/                    # TypeScript source files
│   ├── server.ts           # HTTP/HTTPS server entry point
│   ├── settings.ts         # Configuration loading and types
│   └── lib/
│       ├── sonos-http-api.ts    # Core API and action dispatch
│       ├── helpers/             # Utility modules
│       ├── actions/             # API action handlers
│       ├── tts-providers/       # Text-to-speech integrations
│       └── music_services/      # Music service definitions
├── lib/                    # Legacy JavaScript source (being migrated)
├── dist/                   # Compiled output (gitignored)
├── test/                   # Test files
├── types/                  # TypeScript type declarations
│   └── sonos-discovery.d.ts
├── packages/
│   └── sonos-discovery/    # Local Sonos discovery module
├── static/                 # Static web assets
├── presets/                # Preset JSON files
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint flat config
└── package.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run lint` | Run ESLint on source files |
| `npm run typecheck` | Run TypeScript type checking without emitting |
| `npm test` | Run all tests with vitest |
| `npm start` | Start the server (`node server.js`) |

## Coding Standards

### TypeScript

- All new code should be written in TypeScript in the `src/` directory
- Use ES Module syntax (`import`/`export`)
- Enable strict mode — no `any` types unless absolutely necessary
- Add proper type annotations to function parameters and return types
- Use interfaces for object shapes, type aliases for unions/intersections

### Style

- Follow the ESLint configuration (flat config format, ESLint 9+)
- Use `const` by default, `let` when reassignment is needed
- Prefer `async`/`await` over raw Promises
- Use template literals over string concatenation
- Keep functions focused and small

### ESM Conventions

- Use `.js` extensions in import paths (TypeScript resolves `.ts` files from `.js` imports with `NodeNext` module resolution)
- Use `import.meta.url` instead of `__dirname`/`__filename`
- Use `createRequire` for CJS interop with `sonos-discovery`

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (during development)
npx vitest

# Run a specific test file
npx vitest run test/preservation.test.mjs
```

Tests use [vitest](https://vitest.dev/) as the test runner and [fast-check](https://fast-check.dev/) for property-based testing.

### Writing Tests

- Place test files in the `test/` directory
- Use `.test.ts` or `.test.mjs` extension
- Write both unit tests and property-based tests for new functionality
- Don't mock unless absolutely necessary — test real behavior

## Pull Request Guidelines

### Branch Naming

Use descriptive branch names with a prefix:

- `feature/add-new-tts-provider`
- `fix/volume-overflow-handling`
- `docs/update-api-reference`
- `refactor/extract-auth-middleware`

### Commit Messages

Write clear, concise commit messages:

```
feat: add ElevenLabs TTS provider support

fix: handle negative volume values in groupVolume

docs: document new health check endpoint

refactor: extract request parsing into helper
```

Use conventional commit prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

### PR Requirements

Before submitting a pull request:

1. **Build passes:** `npm run build` completes without errors
2. **Types check:** `npm run typecheck` reports no errors
3. **Lint passes:** `npm run lint` reports no errors
4. **Tests pass:** `npm test` passes all existing tests
5. **New tests added:** Include tests for new functionality or bug fixes
6. **Documentation updated:** Update README if adding user-facing features

### PR Description

Include in your PR description:

- Summary of what changed and why
- How to test the changes
- Any breaking changes or migration notes

## Getting Help

If you run into issues or have questions:

- Check existing [issues](https://github.com/jishi/node-sonos-http-api/issues) for similar problems
- Open a new issue with a detailed description of the problem
- Include your Node.js version, OS, and relevant configuration
