# Client App Guidelines

Scope: everything under `client/` (Vite root, UI, and design system assets).

## Entry Points

- `client/index.html` loads the Design System CSS, `app.css`, and `app.js`.
- `client/app.js` is the main orchestrator (state, config, runner, UI wiring).
- `client/app.css` owns layout + Probability Lab styling.
- `client/help-content.html` is loaded into the help modal via Vite `?raw` import.
- `client/config.json` is the dev-time config default (served by Vite).

## Data Flow (High Level)

1. `app.js` loads `/config.json` via `loadConfig()`.
2. Store state is initialized and device definitions are built.
3. `render()` updates the DOM based on state.
4. UI events mutate state, then re-render (or trigger runner updates).

## Design System Integration

- CSS foundations and component styles are loaded in `client/index.html`.
- JS components are imported as ES modules from `client/design-system/components`.
- If you add a new Design System component, update `client/index.html` to load its CSS.

## Guardrails

- Keep `client/index.html` IDs in sync with DOM lookups in `client/app.js`.
- Keep `client/config.json` keys in sync with validation in `client/src/shell/config.js`.
- All client code is ES modules; avoid introducing non-module scripts.

## References

- Core modules: `client/src/AGENTS.md` and `client/src/probability-lab/AGENTS.md`.
- Design System: `client/design-system/agents.md` and `client/design-system/components/AGENTS.md`.
