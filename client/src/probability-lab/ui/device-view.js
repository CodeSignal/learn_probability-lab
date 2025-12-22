// Device visualization (coin/die/spinner DOM rendering)
import { clamp } from '../../shared/math.js';
import { getCssVar } from './charts/colors.js';

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
  deviceViewEl.dataset.device = def.device;

  deviceViewEl.innerHTML = '';
  if (singleState.lastIndex === null) return;

  const label = def.labels[singleState.lastIndex] ?? '—';
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
  deviceViewEl.innerHTML = '';

  if (lastA === null || lastB === null) return;

  const aWrap = document.createElement('div');
  aWrap.className = 'pl-device pl-device-mini';

  const bWrap = document.createElement('div');
  bWrap.className = 'pl-device pl-device-mini';

  function renderInto(target, def, index) {
    const label = def.labels[index] ?? '—';
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

