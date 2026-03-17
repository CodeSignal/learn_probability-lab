# CodeSignal Probability Lab

## Overview

CodeSignal Probability Lab is an interactive probability simulator for repeated-trial experiments. It is designed to help learners compare theoretical probability with experimental results and see convergence over time.

The app currently supports:

- Single-event experiments with a coin, die, spinner, or custom device
- Two-event experiments with joint outcomes shown in a heatmap and two-way table
- Fair and biased devices
- Independent and dependent relationships in two-event mode
- Custom devices with 2-50 outcomes and optional custom probabilities
- Optional UI sections such as bar chart, convergence chart, frequency table, joint distribution, two-way table, and single-mode history
- Activity logging to `activity.log` for grading

## Using the App

### Install dependencies

```bash
npm ci
# or
npm install
```

### Start in development

```bash
npm run start:dev
```

Then open [http://localhost:3000](http://localhost:3000).

Development uses two local servers:

- `http://localhost:3000`: Vite dev server for the app UI
- `http://localhost:3001`: API server that accepts `/log` requests and writes `activity.log`

In dev mode, the browser sends activity events to `/log`, and Vite proxies those requests to port `3001`.

### Start a production-style build locally

```bash
npm run build
npm run start:prod
```

This serves the built app on [http://localhost:3000](http://localhost:3000) and writes activity events to the same root-level `activity.log` file.

### Use an alternate production config

By default, the production server reads `./config.json` from the repository root. You can point it at another file with `CONFIG_PATH`.

```bash
CONFIG_PATH=./some-other-config.json npm run start:prod
```

## Configuring `config.json`

The app loads its runtime configuration from `/config.json`.

If a field is missing or invalid, the app falls back to safe defaults. Invalid custom probabilities are normalized when possible; otherwise they fall back to a uniform distribution.

### Supported top-level keys

| Key | Used in | Description |
| --- | --- | --- |
| `mode` | all configs | `"single"` or `"two"` |
| `device` | single mode | Initial device: `"coin"`, `"die"`, `"spinner"`, or `"custom"` |
| `deviceA` | two mode | Initial device for event A |
| `deviceB` | two mode | Initial device for event B |
| `deviceSettings` | single mode with `device: "custom"` | Custom device definition |
| `deviceASettings` | two mode with `deviceA: "custom"` | Custom device definition for A |
| `deviceBSettings` | two mode with `deviceB: "custom"` | Custom device definition for B |
| `sections` | all configs | Controls which result panels are visible |
| `visualElements` | all configs | Controls selected UI elements such as the edit button and bias tag |

### Supported values and defaults

| Setting | Valid values | Default if missing or invalid |
| --- | --- | --- |
| `mode` | `single`, `two` | `single` |
| `device`, `deviceA`, `deviceB` | `coin`, `die`, `spinner`, `custom` | `coin` |
| `sections.*` | `true`, `false` | `false` for each supported section key |
| `visualElements.editExperimentButton` | `true`, `false` | `true` |
| `visualElements.biasTag` | `true`, `false` | `true` |

### `sections` keys

Single-mode section keys:

- `barChart`
- `convergence`
- `frequencyTable`
- `history`

Two-mode section keys:

- `jointDistribution`
- `twoWayTable`

Notes:

- `history` only applies to single mode
- When `history` is `true` in single mode, history is shown as a standalone widget card instead of only through the History modal
- Missing or invalid section values default to `false`

### `visualElements` keys

Supported UI toggles:

- `editExperimentButton`
- `biasTag`

Both default to `true`.

### Custom device settings

Each custom device settings object can include:

| Key | Required | Description |
| --- | --- | --- |
| `name` | no | Display name for the custom device |
| `icon` | no | Optional icon string shown in the UI |
| `outcomes` | yes | Array of outcome labels |
| `probabilities` | no | Array of non-negative weights or probabilities aligned with `outcomes` |

Current constraints:

- `outcomes` must contain 2-50 unique, non-empty strings
- Extra outcomes beyond 50 are truncated
- Duplicate or empty outcome labels are ignored
- If `probabilities` is present, it must match the final outcome count
- Probability values must be non-negative numbers
- Probability values are normalized to sum to `1`
- If `probabilities` is missing, invalid, or sums to `0`, the app uses a uniform distribution

### What is not configured through `config.json`

Do not pretend `config.json` controls everything. It does not.

These are adjusted in the app UI, not through runtime config:

- Bias settings for coin, die, and spinner
- Spinner sector count
- Selected event outcomes in single mode
- Relationship mode in two-event experiments (`independent` or `dependent`)

## `config.json` Examples

### Single mode with a standard device

```json
{
  "mode": "single",
  "device": "die",
  "sections": {
    "barChart": true,
    "convergence": true,
    "frequencyTable": true,
    "history": false
  },
  "visualElements": {
    "editExperimentButton": true,
    "biasTag": true
  }
}
```

### Single mode with a custom device

```json
{
  "mode": "single",
  "device": "custom",
  "deviceSettings": {
    "name": "Exam",
    "icon": "📚",
    "outcomes": ["Pass", "Fail"],
    "probabilities": [0.7, 0.3]
  },
  "sections": {
    "barChart": true,
    "convergence": true,
    "frequencyTable": true,
    "history": true
  },
  "visualElements": {
    "editExperimentButton": true,
    "biasTag": true
  }
}
```

### Two-event mode with standard devices

```json
{
  "mode": "two",
  "deviceA": "coin",
  "deviceB": "die",
  "sections": {
    "jointDistribution": true,
    "twoWayTable": true
  },
  "visualElements": {
    "editExperimentButton": true,
    "biasTag": true
  }
}
```

### Two-event mode with custom devices

```json
{
  "mode": "two",
  "deviceA": "custom",
  "deviceASettings": {
    "name": "Weather",
    "icon": "🌦",
    "outcomes": ["Sunny", "Rainy", "Snowy"],
    "probabilities": [0.6, 0.3, 0.1]
  },
  "deviceB": "custom",
  "deviceBSettings": {
    "name": "Traffic",
    "icon": "🚗",
    "outcomes": ["Light", "Medium", "Heavy"],
    "probabilities": [0.5, 0.35, 0.15]
  },
  "sections": {
    "jointDistribution": true,
    "twoWayTable": true
  },
  "visualElements": {
    "editExperimentButton": true,
    "biasTag": true
  }
}
```

## Activity Logging and Grading

The app writes grading or review data to a root-level `activity.log` file as JSON Lines: one JSON object per line.

Behavior by environment:

- Development: the browser posts to `/log`, Vite proxies that request to the API server on port `3001`, and `server.js` appends to `activity.log`
- Production: `server.js` serves the built app and appends the same event stream to `activity.log`

The log is append-only. If you want a clean grading run, you need to clear or rotate the file yourself before starting.

### Event types written today

| Event type | When it appears | What it contains |
| --- | --- | --- |
| `app_start` | Initial app load | A config snapshot with mode, device selection, and visible sections |
| `settings_change` | User changes settings | Changed keys plus a full settings snapshot |
| `run_reset` | A run is reset because settings changed | Reset reason plus a full settings snapshot |
| `status` | At trial milestones during simulation | Current trial count and mode-specific results |
| `click` | User clicks a selected cell in two-event mode | Source and selected cell labels |

### Status milestone schedule

`status` events are not written on every single trial forever. They are logged at milestone counts:

`1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, ...`

That keeps the log useful without making it absurdly noisy.

### Mode-specific `status` payloads

Single-mode `status` events can include:

- `trials`
- `lastOutcome`
- `event.selectedOutcomes`
- `event.pEstimated`
- `event.pTheoretical`
- `barChart.rows` when the bar chart section is enabled
- `convergence` when the convergence section is enabled
- `frequencyTable.rows` when the frequency table section is enabled

Two-mode `status` events can include:

- `trials`
- `lastOutcome.a` and `lastOutcome.b`
- `relationship`
- `jointDistribution.labelsA`, `jointDistribution.labelsB`, `jointDistribution.matrixRel`
- `twoWayTable.labelsA`, `twoWayTable.labelsB`, `twoWayTable.jointCounts`

### Example log lines

Single-mode `status`:

```json
{"type":"status","data":{"mode":"single","trials":100,"lastOutcome":"Heads","event":{"selectedOutcomes":["Heads"],"pEstimated":0.55,"pTheoretical":0.5},"barChart":{"rows":[{"outcome":"Heads","count":55,"relFreq":0.55},{"outcome":"Tails","count":45,"relFreq":0.45}]}}}
```

Two-mode `status`:

```json
{"type":"status","data":{"mode":"two","trials":200,"lastOutcome":{"a":"Sunny","b":"Heavy"},"relationship":"independent","jointDistribution":{"labelsA":["Sunny","Rainy"],"labelsB":["Light","Heavy"],"matrixRel":[[0.4,0.2],[0.3,0.1]]},"twoWayTable":{"labelsA":["Sunny","Rainy"],"labelsB":["Light","Heavy"],"jointCounts":[[80,40],[60,20]]}}}
```

`settings_change`:

```json
{"type":"settings_change","data":{"changed":["bias"],"settings":{"mode":"single","device":"coin","sections":{"barChart":true,"convergence":true,"frequencyTable":true,"jointDistribution":false,"twoWayTable":false},"spinnerSectors":8,"bias":{"coinProbabilities":[1,0],"dieProbabilities":[0.167,0.167,0.167,0.167,0.167,0.167],"spinnerSkew":0},"eventSelected":["Heads"]}}}
```

`run_reset`:

```json
{"type":"run_reset","data":{"reason":"bias_change","settings":{"mode":"single","device":"coin","sections":{"barChart":true,"convergence":true,"frequencyTable":true,"jointDistribution":false,"twoWayTable":false},"spinnerSectors":8,"bias":{"coinProbabilities":[0,1],"dieProbabilities":[0.167,0.167,0.167,0.167,0.167,0.167],"spinnerSkew":0},"eventSelected":["Heads"]}}}
```

`click`:

```json
{"type":"click","data":{"source":"jointDistributionHeatmap","cell":{"r":0,"c":1},"labels":{"a":"Sunny","b":"Heavy"}}}
```

## CI/CD and Automated Releases

This repository has a GitHub Actions workflow at [`.github/workflows/build-release.yml`](/Users/diego/repos/bespoke-sims/learn_probability-lab/.github/workflows/build-release.yml).

Current behavior:

- Every push to `main` triggers the workflow
- The workflow checks out the repo and initializes the design-system submodule
- It installs dependencies with `npm ci`
- It builds the app with `npm run build`
- It installs production dependencies only
- It creates a `release.tar.gz` archive containing the built app, `server.js`, `package.json`, and production `node_modules`
- It uploads the build artifact in GitHub Actions
- It publishes a GitHub Release automatically

