# Client Source Guidelines

Scope: `client/src` ES modules (no framework, no bundler-specific globals).

## Directory Layout

- `shell/`: websocket, help modal, config loader.
- `shared/`: pure utilities (math, formatting).
- `probability-lab/`: domain logic, simulation engine, state, and UI rendering.

## Module Boundaries

- `domain/` and `engine/` are pure logic; no DOM access.
- `ui/` is the only place that touches the DOM or canvas.
- `state/` provides the mutable store used by `client/app.js`.

## Config Loader

- `shell/config.js` fetches `/config.json` and validates known keys.
- If you add config fields, update both the validator and the app state defaults.

## Help Modal

- `shell/help.js` uses Vite `?raw` import for `help-content.html`.
- Keep that import path intact if the help content moves.

## WebSocket

- `shell/websocket.js` connects to `/ws` and expects JSON messages like:
  `{ "type": "message", "message": "..." }`.

## Guardrails

- Keep shared utilities side-effect free.
- Keep UI rendering idempotent and driven by state.
- Use explicit imports/exports for all modules.

## References

- Probability Lab internals: `client/src/probability-lab/AGENTS.md`.
