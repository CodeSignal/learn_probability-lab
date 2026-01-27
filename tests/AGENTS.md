# Test Suite Guidelines

Scope: Vitest suites under `tests/`.

## Running Tests

1. `npm test`

## Structure

- `tests/shared/` exercises `client/src/shared` utilities.
- `tests/probability-lab/domain/` covers RNG, CDF, device definitions.
- `tests/probability-lab/engine/` covers simulation functions.
  - Includes coverage for custom devices and dependent-mode behavior.

## Conventions

- Use `.test.js` or `.spec.js` filenames (see `vitest.config.js`).
- Vitest runs with `environment: \"node\"` (see `vitest.config.js`).
- Import modules from `client/src` to test production logic.
- Keep RNG-based tests deterministic by seeding where needed.
