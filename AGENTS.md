# CodeSignal Probability Lab - Repository Guidelines

This repository contains the CodeSignal Probability Lab, a Bespoke simulation for repeated-trial
probability experiments (coin, die, spinner, and configurable custom devices) that visualizes
convergence.

## Overview

The Probability Lab helps students understand:

- Sample space (all possible outcomes)
- Events (subsets of outcomes)
- Theoretical probability (what should happen in the long run)
- Experimental probability (what data shows)
- Convergence (estimates stabilize as trials increase)

### Key Features

- One event mode: event builder, live bar chart, convergence chart, frequency table
- Two events mode: joint heatmap + two-way table with joint/conditional reads
- Bias controls: fair vs biased devices (coin, die, spinner; custom devices are configured via
  `config.json`)
- Seeded randomness: reproduce runs with a seed
- Event relationships: independent, dependent
- Custom devices: define up to 50 outcomes + probabilities in `config.json`

## Project Map

```
client/
  index.html                  # App shell and layout
  app.js                       # Main entry (store, config, runner, UI wiring)
  app.css                      # App styling
  help-content.html            # Help modal content
  config.json                  # Runtime configuration (dev default)
  src/                         # Modular ES modules
    shell/                     # help/config
    shared/                    # math + format utilities
    probability-lab/           # domain/engine/state/ui
  design-system/               # CodeSignal Design System assets (git submodule; treat as read-only)
    agents.md                  # Design system deep reference (lowercase file)

dist/                          # Production build output (vite build)
activity.log                   # Appends JSON lines from POST /log
package.json                   # Scripts + tool versions
package-lock.json              # Lockfile
PLAN.md                        # Project plan / working notes
server.js                      # HTTP server for prod/API
vite.config.js                 # Vite root=client, dev proxy config
vitest.config.js               # Vitest config

tests/                         # Vitest suites (domain/engine/shared)
```

## Commands

1. Start dev servers (Vite on 3000 + API server on 3001):
   `npm run start:dev`
2. Build for production:
   `npm run build`
3. Start production server (serves dist):
   `npm run start:prod`
4. Run tests:
   `npm test`
5. Start Vite only:
   `npm run dev:vite`
6. Start API server only:
   `npm run dev:api`
7. Start production via alias:
   `npm start`

## Runtime Configuration

- Dev uses `client/config.json` served by Vite.
- Production serves `/config.json` from `server.js` using `CONFIG_PATH` (default `./config.json`).
- Config validation happens in `client/src/shell/config.js`.

Supported config shapes:

Single mode:
```json
{
  "mode": "single",
  "device": "coin",
  "sections": {
    "barChart": true,
    "convergence": false,
    "frequencyTable": false
  }
}
```

Single mode (custom device):
```json
{
  "mode": "single",
  "device": "custom",
  "deviceSettings": {
    "name": "Exam",
    "icon": "📚",
    "outcomes": ["pass", "fail"],
    "probabilities": [0.7, 0.3]
  },
  "sections": {
    "barChart": true,
    "convergence": true,
    "frequencyTable": true
  }
}
```

Two-event mode:
```json
{
  "mode": "two",
  "deviceA": "coin",
  "deviceB": "die",
  "sections": {
    "jointDistribution": true,
    "twoWayTable": true
  }
}
```

Two-event mode (custom devices):
```json
{
  "mode": "two",
  "deviceA": "custom",
  "deviceASettings": {
    "name": "Weather",
    "outcomes": ["sun", "rain", "snow"]
  },
  "deviceB": "custom",
  "deviceBSettings": {
    "name": "Traffic",
    "outcomes": ["light", "medium", "heavy"]
  },
  "sections": {
    "jointDistribution": true,
    "twoWayTable": true
  }
}
```

Notes:

- Valid modes: `single`, `two`.
- Valid devices: `coin`, `die`, `spinner`, `custom`.
- `sections` is optional; keys are validated and default to `false` if missing/invalid.
- Custom device settings:
  - Single mode uses `deviceSettings`; two-event mode uses `deviceASettings` / `deviceBSettings`.
  - `outcomes` must contain 2-50 unique, non-empty strings (extras are truncated; duplicates
    ignored).
  - `probabilities` is optional; if present it must match `outcomes` length and contain non-negative
    numbers. Values are normalized to sum to 1; invalid inputs fall back to a uniform distribution.

## Architecture Notes

- `client/app.js` is the main entrypoint and orchestrates state, rendering, and controls.
- `client/src/probability-lab/engine` mutates state slices with pure, DOM-free logic.
- `client/src/probability-lab/ui` is the only place that touches the DOM or canvases.
- `server.js` serves static files in production.
- Activity logging:
  - `client/src/shell/activity-logger.js` POSTs JSON events to `/log`.
  - In dev, Vite proxies `/log` to the API server (see `vite.config.js`).
  - `server.js` appends JSONL events to `activity.log`.

## Conventions

### DOM Element IDs

App shell:

- btn-help
- probability-lab

Experiment summary:

- pl-open-settings
- pl-setup-device, pl-setup-sample-space
- pl-spinner-options, pl-spinner-sectors
- pl-bias-summary, pl-relationship-summary

Settings modal:

- pl-settings-modal
- pl-settings-section-probabilities, pl-settings-section-event, pl-settings-section-randomness
- pl-single-config, pl-two-config
- pl-bias-options, pl-bias-options-a, pl-bias-options-b
- pl-relationship, pl-seed

Controls:

- pl-reset, pl-step, pl-step-size, pl-auto, pl-auto-speed-container
- pl-run-mode-toggle-manual, pl-run-mode-toggle-auto
- pl-run-mode-manual, pl-run-mode-auto

Event builder:

- pl-event-outcomes

Visualization:

- pl-device-view, pl-trials, pl-last

Single-event view:

- pl-single-view
- pl-bar-chart-section, pl-bar-chart
- pl-convergence-card, pl-line-chart
- pl-frequency-card, pl-frequency-table

Two-event view:

- pl-two-view
- pl-joint-distribution-card, pl-heatmap, pl-cell-summary
- pl-two-way-table-card, pl-twoway-table

### Device Types

- Coin: two outcomes (Heads, Tails)
- Die: six outcomes (1-6)
- Spinner: configurable sectors (2-12)
- Custom: outcomes configured in `config.json` (2-50) with optional probabilities and icon/name

### Event Relationships (Two Events Mode)

- Independent: A and B drawn separately
- Dependent: Probabilistic dependence where "high" outcomes of A make "high" outcomes of B more
  likely
  - For all devices (including custom), "low half" vs "high half" is based on outcome order.
  - If you want dependence to feel meaningful for custom devices, order outcomes from low → high.

### Chart Types

- Bar chart: relative frequency of each outcome
- Line chart: convergence of estimated P(E) over trials
- Heatmap: joint relative frequencies for two events

### Table Types

- Frequency table: theoretical probability, count, relative frequency, delta
- Two-way table: joint counts and probabilities for two events

## Testing

- Tests live under `tests/` and run with Vitest (`npm test`).
- Test files are `tests/**/*.test.js` or `tests/**/*.spec.js`.

## Design System

- Design system assets live in `client/design-system/`.
- Primary references: `client/design-system/README.md`,
  `client/design-system/agents.md`, and `client/design-system/llms.txt`.
- JS components available: modal, numeric-slider, dropdown, horizontal-cards.
- The app currently imports modal and numeric-slider in `client/app.js`.
- `client/design-system` is a git submodule; do not edit it in this repo.
  > TODO: Document the owner/workflow for proposing design system changes.

## Notes for AI Agents

1. Use Design System components and tokens whenever possible.
2. Keep DOM IDs and config schemas in sync with `client/app.js` and `client/src/shell/config.js`.
3. Maintain nested AGENTS files; they override this root doc for their directories.
4. Do not modify git submodules (e.g. `client/design-system`).
