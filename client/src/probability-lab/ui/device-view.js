// Device visualization (coin/die/spinner DOM rendering)
import { clamp } from '../../shared/math.js';
import { getCssVar } from './charts/colors.js';

/**
 * Abbreviates an outcome label for compact display.
 * Single word: returns first letter capitalized (e.g., "Unlocked" → "U")
 * Multiple words: returns first letter of each word capitalized (e.g., "Camera Error" → "CE")
 */
function abbreviateOutcome(outcome) {
  if (!outcome || typeof outcome !== 'string') return '';
  const trimmed = outcome.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  if (words.length === 0) return '';

  if (words.length === 1) {
    // Single word: return first letter capitalized
    return words[0][0].toUpperCase();
  }

  // Multiple words: return first letter of each word capitalized
  return words.map(word => word[0].toUpperCase()).join('');
}

function renderCustomDevice(target, def, index, { compact = false } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = `pl-custom-device${compact ? ' pl-custom-device--mini' : ''}`;

  const header = document.createElement('div');
  header.className = 'pl-custom-device-header';

  const nameWrap = document.createElement('div');
  nameWrap.className = 'pl-custom-device-name body-xsmall';

  if (def.icon) {
    const icon = document.createElement('span');
    icon.className = 'pl-custom-device-icon';
    icon.textContent = def.icon;
    nameWrap.append(icon);
  }

  const name = document.createElement('h2');
  name.className = 'heading-xxxsmall';
  name.textContent = def.name || 'Custom';
  nameWrap.append(name);
  header.append(nameWrap);

  const grid = document.createElement('div');
  grid.className = 'pl-custom-outcomes';

  for (let i = 0; i < def.labels.length; i += 1) {
    const item = document.createElement('div');
    item.className = 'pl-custom-outcome body-xsmall';
    if (i === index) item.classList.add('pl-custom-outcome--selected');
    // Use abbreviated labels in compact mode (two-device mode)
    item.textContent = abbreviateOutcome(def.labels[i]);
    grid.append(item);
  }

  wrapper.append(header, grid);
  target.append(wrapper);
}

export function buildSpinnerGradient(sectors) {
  // Classic palette colors
  const colors = ['#f5c84c', '#d7a028', '#6cb4ff', '#a855f7', '#10b981', '#f97316', '#ef4444', '#0ea5e9'];
  const selectedColors = colors.slice(0, sectors);
  const step = 360 / Math.max(1, sectors);
  const segments = selectedColors
    .map((color, i) => `${color} ${i * step}deg ${(i + 1) * step}deg`)
    .join(', ');
  return `conic-gradient(from -90deg, ${segments})`;
}

export function updateDeviceViewSingle(deviceViewEl, def, singleState) {
  deviceViewEl.classList.remove('pl-device--two');
  deviceViewEl.classList.toggle('pl-device--custom', def.device === 'custom');
  deviceViewEl.dataset.device = def.device;

  deviceViewEl.innerHTML = '';
  if (singleState.lastIndex === null) return;

  const label = def.labels[singleState.lastIndex] ?? '—';
  if (def.device === 'custom') {
    renderCustomDevice(deviceViewEl, def, singleState.lastIndex);
    return;
  }
  if (def.device === 'coin') {
    const coin = document.createElement('div');
    coin.className = 'pl-coin';
    coin.id = 'pl-coin-element';

    const heads = document.createElement('div');
    heads.className = 'pl-coin-heads';
    heads.textContent = 'H';

    const tails = document.createElement('div');
    tails.className = 'pl-coin-tails';
    tails.textContent = 'T';

    coin.append(heads, tails);
    deviceViewEl.append(coin);
    return;
  }

  if (def.device === 'die') {
    const die = document.createElement('div');
    die.className = 'pl-die';

    const positions = [
      { x: 25, y: 25 },
      { x: 50, y: 25 },
      { x: 75, y: 25 },
      { x: 25, y: 50 },
      { x: 50, y: 50 },
      { x: 75, y: 50 },
      { x: 25, y: 75 },
      { x: 50, y: 75 },
      { x: 75, y: 75 },
    ];

    const face = clamp(parseInt(label, 10), 1, 6);
    const pipMap = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const on = new Set(pipMap[face] ?? []);
    for (let i = 0; i < positions.length; i += 1) {
      const pip = document.createElement('div');
      pip.className = on.has(i) ? 'pl-pip on' : 'pl-pip';
      pip.style.left = `${positions[i].x}%`;
      pip.style.top = `${positions[i].y}%`;
      die.append(pip);
    }

    deviceViewEl.append(die);
    return;
  }

  const spinner = document.createElement('div');
  spinner.className = 'pl-spinner';
  const sectors = def.labels.length;
  spinner.style.background = buildSpinnerGradient(sectors);
  spinner.style.transition = 'transform 160ms ease-out';

  const rotation = -((singleState.lastIndex + 0.5) * (360 / Math.max(1, sectors)));
  spinner.style.transform = `rotate(${rotation}deg)`;

  const pointer = document.createElement('div');
  pointer.className = 'pl-spinner-pointer';
  spinner.append(pointer);
  deviceViewEl.append(spinner);
}

export function updateDeviceViewTwo(deviceViewEl, defA, defB, twoState) {
  const lastA = twoState.lastA;
  const lastB = twoState.lastB;

  deviceViewEl.classList.add('pl-device--two');
  deviceViewEl.classList.remove('pl-device--custom');
  deviceViewEl.innerHTML = '';

  if (lastA === null || lastB === null) return;

  const aWrap = document.createElement('div');
  aWrap.className = 'pl-device pl-device-mini';

  const bWrap = document.createElement('div');
  bWrap.className = 'pl-device pl-device-mini';

  function renderInto(target, def, index) {
    const label = def.labels[index] ?? '—';
    if (def.device === 'custom') {
      renderCustomDevice(target, def, index, { compact: true });
      return;
    }
    if (def.device === 'coin') {
      const coin = document.createElement('div');
      coin.className = 'pl-coin';

      const heads = document.createElement('div');
      heads.className = 'pl-coin-heads';
      heads.textContent = 'H';

      const tails = document.createElement('div');
      tails.className = 'pl-coin-tails';
      tails.textContent = 'T';

      coin.append(heads, tails);
      target.append(coin);
      return;
    }
    if (def.device === 'die') {
      const die = document.createElement('div');
      die.className = 'pl-die';
      const positions = [
        { x: 25, y: 25 },
        { x: 50, y: 25 },
        { x: 75, y: 25 },
        { x: 25, y: 50 },
        { x: 50, y: 50 },
        { x: 75, y: 50 },
        { x: 25, y: 75 },
        { x: 50, y: 75 },
        { x: 75, y: 75 },
      ];

      const face = clamp(parseInt(label, 10), 1, 6);
      const pipMap = {
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8],
      };
      const on = new Set(pipMap[face] ?? []);
      for (let i = 0; i < positions.length; i += 1) {
        const pip = document.createElement('div');
        pip.className = on.has(i) ? 'pl-pip on' : 'pl-pip';
        pip.style.left = `${positions[i].x}%`;
        pip.style.top = `${positions[i].y}%`;
        die.append(pip);
      }
      target.append(die);
      return;
    }

    const spinner = document.createElement('div');
    spinner.className = 'pl-spinner';
    const sectors = def.labels.length;
    spinner.style.background = buildSpinnerGradient(sectors);
    const rotation = -((index + 0.5) * (360 / Math.max(1, sectors)));
    spinner.style.transform = `rotate(${rotation}deg)`;
    const pointer = document.createElement('div');
    pointer.className = 'pl-spinner-pointer';
    spinner.append(pointer);
    target.append(spinner);
  }

  renderInto(aWrap, defA, lastA);
  renderInto(bWrap, defB, lastB);

  const pair = document.createElement('div');
  pair.className = 'pl-two-device-wrap';
  pair.append(aWrap, bWrap);
  deviceViewEl.append(pair);
}
