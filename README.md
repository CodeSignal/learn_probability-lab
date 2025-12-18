# CodeSignal Probability Lab

A Bespoke Simulation for repeated-trial probability experiments (coin, die, spinner) that visualizes convergence: as you run more trials, relative frequencies become more stable and tend to approach theoretical probabilities.

## What’s Included

- **One event mode**: event builder (select outcomes), live bar chart, convergence chart, frequency table
- **Two events mode**: joint heatmap + two-way table; click a cell to see joint and conditional probabilities
- **Bias controls**: explore fair vs biased devices
- **Seeded randomness**: optionally reproduce runs with a seed

## Development

```bash
npm run start:dev
```

Open `http://localhost:3000`.

## Build / Production

```bash
npm run build
npm run start:prod
```

## Key Files

- `client/index.html` – app shell + layout
- `client/codesignal-probability-lab.js` – simulation engine + rendering
- `client/codesignal-probability-lab.css` – app-specific styling
- `client/help-content.html` – Help modal content

