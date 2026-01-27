# Probability Lab Core Guidelines

Scope: `client/src/probability-lab` (domain, engine, state, UI rendering).

## State Shape (Owned by `client/app.js`)

Single mode (`state.single`):

- `device`, `spinnerSectors`, `coinProbabilities`, `dieProbabilities`, `spinnerSkew`,
  `customDeviceSettings`
- `definition` (device metadata + `labels`, `probabilities`, `cdf`; spinner adds `sectors`, `skew`)
- `trials`, `counts`, `lastIndex`, `history`
- `eventSelected` (Set of labels)

Two-event mode (`state.two`):

- `deviceA`, `deviceB`
- `spinnerSectorsA/B`, `coinProbabilitiesA/B`, `dieProbabilitiesA/B`, `spinnerSkewA/B`,
  `customDeviceSettingsA/B`
- `relationship` (`independent`, `dependent`)
- `definitionA`, `definitionB`
- `trials`, `countsA`, `countsB`, `joint`, `lastA`, `lastB`, `selectedCell`

## Domain

- `domain/rng.js`: deterministic RNG utilities; empty seed returns `Math.random`.
- `domain/cdf.js`: builds CDF and samples indexes.
- `domain/devices.js`: builds device definitions and clamps probabilities.
  - Spinner sectors are clamped to 2-12.
  - Spinner skew is clamped to -1..1.
  - Custom devices are built from `deviceSettings` (`outcomes` 2-50; `probabilities` normalized or
    uniform).

## Engine

- `simulate-single.js` mutates state slice and appends to `history`.
  - `history` is decimated when it exceeds 2000 entries.
- `simulate-two.js` mutates counts and joint matrix.
  - Dependent mode uses outcome order to split "low half" vs "high half" (via `Math.ceil(n / 2)`).
- `runner.js` handles execution:
  1. Manual runs chunk at 50,000 trials per animation frame.
  2. Auto-run uses 1 trial per frame at speed 1-60 iterations/sec.

## UI

- `ui/render.js` decides single vs two and calls `render-single.js` or `render-two.js`.
- Charts are canvas-based in `ui/charts/*.js`.
- Tables are built in `ui/tables.js`.
- `state.sections` controls visibility; `client/app.js` toggles DOM visibility.
- Device display uses `definition.name` / `definition.icon` when present (custom devices, and
  built-in device metadata).

## Guardrails

- Keep `counts` arrays aligned with `definition.labels.length`.
- Keep `joint` shaped as `[labelsA][labelsB]`.
- For dependent simulations, keep label ordering meaningful (low → high), especially for custom
  devices.
- Do not touch the DOM outside `ui/`.
