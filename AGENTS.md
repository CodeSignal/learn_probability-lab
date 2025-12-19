# Repository Guidelines

This repository contains the **CodeSignal Probability Lab** — a Bespoke Simulation for repeated-trial probability experiments (coin, die, spinner) that visualizes convergence: as you run more trials, relative frequencies become more stable and tend to approach theoretical probabilities.

## Overview

The Probability Lab is an educational simulation that helps students understand:

- **Sample space** (all possible outcomes)
- **Events** (subsets of outcomes)
- **Theoretical probability** (what "should" happen in the long run)
- **Experimental probability** (what your data shows)
- **Convergence** (how estimates stabilize with more trials)

### Key Features

- **One event mode**: Event builder (select outcomes), live bar chart, convergence chart, frequency table
- **Two events mode**: Joint heatmap + two-way table; click a cell to see joint and conditional probabilities
- **Bias controls**: Explore fair vs biased devices (coin, die, spinner)
- **Seeded randomness**: Optionally reproduce runs with a seed
- **Device types**: Coin, die, spinner (with configurable sectors)
- **Event relationships**: Independent, copy (B = A), complement (B = not A)

## Project Structure

### Current Structure

```
client/
  ├── index.html                          # Main HTML template
  ├── app.js                              # App shell initialization (WebSocket, help modal)
  ├── codesignal-probability-lab.js       # Main orchestration file
  ├── codesignal-probability-lab.css      # App-specific styling
  ├── bespoke-template.css                # Template-specific styles
  ├── help-content.html                   # Help modal content
  ├── config.json                         # Runtime configuration (mode, device)
  ├── src/                                # Modular source code
  │   ├── shell/                          # App shell (status, websocket, help, config)
  │   ├── shared/                         # Shared utilities (math, format)
  │   └── probability-lab/                # Probability Lab modules
  │       ├── domain/                     # Domain logic (RNG, CDF, devices)
  │       ├── engine/                     # Simulation engine (runner, simulate-single, simulate-two)
  │       ├── state/                      # State management (store)
  │       └── ui/                         # UI rendering (charts, tables, device-view, render)
  └── design-system/                      # CodeSignal Design System
      ├── colors/
      ├── spacing/
      ├── typography/
      └── components/
server.js                                  # Development server (Vite + API)
```

## Architecture Notes

### Current State

- **Modular ES module architecture**: `codesignal-probability-lab.js` serves as the main orchestration file
- **ES modules**: All code uses ES modules with explicit imports/exports
- **Vite setup**: Using Vite for development with full ES module support and dependency graph benefits
- **Design System**: Modal component and all app code use ES modules with direct imports

### Key Components

- **Simulation engine**: Pure functions for single and two-event trials (`engine/simulate-single.js`, `engine/simulate-two.js`, `engine/runner.js`)
- **Rendering**: Charts (bar, line, heatmap), tables (frequency, two-way), device visualization (in `ui/` directory)
- **State management**: Explicit store pattern with `createStore` providing `getState`, `setState`, and `subscribe` methods (`state/store.js`)
- **Domain logic**: Pure utilities for RNG, CDF, and device definitions (`domain/`)
- **Configuration**: Runtime configuration via `config.json` loaded at startup (`shell/config.js`). Supports mode (`single`/`two`) and device selection (`coin`/`die`/`spinner`). Falls back to defaults if config is missing or invalid.

### Configuration

The application loads configuration from `client/config.json` at startup. The configuration file supports:

**Single mode** (`mode: "single"`):
```json
{
  "mode": "single",
  "device": "coin"
}
```

**Two-event mode** (`mode: "two"`):
```json
{
  "mode": "two",
  "deviceA": "coin",
  "deviceB": "die"
}
```

- Valid modes: `"single"`, `"two"`
- Valid devices: `"coin"`, `"die"`, `"spinner"`
- Configuration is validated on load; invalid values fall back to defaults (`mode: "single"`, `device: "coin"`)
- If `config.json` is missing or fails to load, the app uses default configuration

## Key Conventions

### Status Messages

Use these exact status messages for consistency:

- "Ready" - Application loaded successfully
- "Loading..." - Data is being loaded
- "Saving..." - Data is being saved
- "Changes saved" - Auto-save completed successfully
- "Save failed (will retry)" - Server save failed, will retry
- "Failed to load data" - Data loading failed
- "Auto-save initialized" - Auto-save system started

### DOM Element IDs

All Probability Lab-specific DOM elements use the `pl-` prefix:

- Mode/configuration: `pl-mode`, `pl-single-config`, `pl-two-config`
- Devices: `pl-device`, `pl-device-a`, `pl-device-b`
- Controls: `pl-reset`, `pl-step`, `pl-step-size`, `pl-auto`
- Seed: `pl-seed`, `pl-apply-seed`, `pl-randomize-seed`
- Event: `pl-event-card`, `pl-event-outcomes`, `pl-event-est`, `pl-event-theory`
- Visualization: `pl-device-view`, `pl-trials`, `pl-last`
- Charts: `pl-bar-chart`, `pl-line-chart`, `pl-heatmap`
- Tables: `pl-frequency-table`, `pl-twoway-table`, `pl-cell-summary`

### Device Types

- **Coin**: Two outcomes (Heads, Tails)
- **Die**: Six outcomes (1-6)
- **Spinner**: Configurable sectors (2-10)

### Modes

- **One event**: Single sample space, event builder, bar chart, convergence chart, frequency table
- **Two events**: Two sample spaces, joint heatmap, two-way table, conditional probabilities

### Event Relationships (Two Events Mode)

- **Independent**: Events A and B are independent
- **Copy**: B = A (same outcome)
- **Complement**: B = not A (opposite outcome)

### Chart Types

- **Bar chart**: Relative frequency of each outcome
- **Line chart**: Convergence of estimated P(E) over trials
- **Heatmap**: Joint relative frequencies for two events

### Table Types

- **Frequency table**: Theoretical probability, count, relative frequency, difference (Δ) for each outcome
- **Two-way table**: Joint counts and probabilities for two events

## Development Workflow

### Development Server

```bash
# Start development server (Vite + API server)
npm run start:dev
```

Opens `http://localhost:3000` (Vite dev server) with API server on port 3001.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

### WebSocket Messaging

The server provides a `POST /message` endpoint for real-time messaging:

```bash
curl -X POST http://localhost:3001/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'
```

This sends alerts to connected clients via WebSocket.

## Error Handling

- Wrap all async operations in try-catch blocks
- Provide meaningful error messages to users
- Log errors to console for debugging
- Implement retry logic for network operations
- Validate data before operations

## Design System

The Probability Lab uses the CodeSignal Design System. For component usage and styling guidelines, see:

- [BESPOKE-TEMPLATE.md](./BESPOKE-TEMPLATE.md) - Template documentation with Design System reference
- `client/design-system/` - Design System source files

Key Design System components used:
- Modal (help system)
- Button, Input, Dropdown (controls)
- Box/Card (content containers)
- Typography, Colors, Spacing (styling)

## Notes for AI Agents

When working on the Probability Lab:

1. **Use Design System components** directly
2. **Maintain consistency** with existing patterns and structure
3. **Keep guidelines up to date** by editing this AGENTS.md file as the codebase evolves
