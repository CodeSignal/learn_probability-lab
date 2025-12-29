# Probability Lab Core Guidelines

Scope: `client/src/probability-lab` (domain, engine, state, UI rendering).

## State Shape (Owned by `client/app.js`)

Single mode (`state.single`):

- `device`, `spinnerSectors`, `coinProbabilities`, `dieProbabilities`, `spinnerSkew`
- `definition` (labels, probabilities, cdf)
- `trials`, `counts`, `lastIndex`, `history`
- `eventSelected` (Set of labels)

Two-event mode (`state.two`):

- `deviceA`, `deviceB`
- `spinnerSectorsA/B`, `coinProbabilitiesA/B`, `dieProbabilitiesA/B`, `spinnerSkewA/B`
- `relationship` (`independent`, `dependent`)
- `definitionA`, `definitionB`
- `trials`, `countsA`, `countsB`, `joint`, `lastA`, `lastB`, `selectedCell`

## Domain

- `domain/rng.js`: deterministic RNG utilities; empty seed returns `Math.random`.
- `domain/cdf.js`: builds CDF and samples indexes.
- `domain/devices.js`: builds device definitions and clamps probabilities.
  - Spinner sectors are clamped to 2-12.
  - Spinner skew is clamped to -1..1.

## Engine

- `simulate-single.js` mutates state slice and appends to `history`.
  - `history` is decimated when it exceeds 2000 entries.
- `simulate-two.js` mutates counts and joint matrix.
- `runner.js` handles execution:
  1. Manual runs chunk at 50,000 trials per animation frame.
  2. Auto-run uses 1 trial per frame at speed 1-60 iterations/sec.

## UI

- `ui/render.js` decides single vs two and calls `render-single.js` or `render-two.js`.
- Charts are canvas-based in `ui/charts/*.js`.
- Tables are built in `ui/tables.js`.
- `state.sections` controls visibility; `client/app.js` toggles DOM visibility.

## Guardrails

- Keep `counts` arrays aligned with `definition.labels.length`.
- Keep `joint` shaped as `[labelsA][labelsB]`.
- Do not touch the DOM outside `ui/`.
