import { formatCount } from '../../shared/format.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parsePx(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function getRowHeightPx(scrollerEl) {
  const fromScroller = getComputedStyle(scrollerEl).getPropertyValue('--pl-history-row-h');
  const fromRoot = getComputedStyle(document.documentElement).getPropertyValue('--pl-history-row-h');
  return Math.max(16, parsePx(fromScroller.trim(), parsePx(fromRoot.trim(), 28)));
}

function isNearBottom(el, tolerancePx = 4) {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - tolerancePx;
}

function getSingleLabel(state, trialIndex) {
  const def = state.single?.definition;
  const history = state.single?.trialHistory;
  if (!def || !history) return '—';
  const idx = history.get(trialIndex);
  if (idx === null) return '—';
  return def.labels?.[idx] ?? '—';
}

function getTwoLabels(state, trialIndex) {
  const defA = state.two?.definitionA;
  const defB = state.two?.definitionB;
  const history = state.two?.trialHistory;
  if (!defA || !defB || !history) return { a: '—', b: '—' };
  const packed = history.getPacked(trialIndex);
  if (packed === null) return { a: '—', b: '—' };
  const aIdx = packed >>> 16;
  const bIdx = packed & 0xffff;
  return { a: defA.labels?.[aIdx] ?? '—', b: defB.labels?.[bIdx] ?? '—' };
}

export function createHistoryView({
  summaryEl,
  emptyEl,
  scrollerEl,
  viewportEl,
  itemsEl,
  jumpTopButton,
  jumpLatestButton,
} = {}) {
  if (!summaryEl || !emptyEl || !scrollerEl || !viewportEl || !itemsEl) {
    throw new Error('createHistoryView requires summaryEl, emptyEl, scrollerEl, viewportEl, and itemsEl.');
  }

  let rowHeight = 28;
  let pool = [];
  let poolSize = 0;
  let currentState = null;
  let currentTrials = 0;

  function ensurePool() {
    rowHeight = getRowHeightPx(scrollerEl);
    const visibleRows = Math.ceil((scrollerEl.clientHeight || 0) / rowHeight);
    const desired = clamp(visibleRows + 12, 24, 240);
    if (desired === poolSize) return;

    poolSize = desired;

    itemsEl.innerHTML = '';
    pool = Array.from({ length: poolSize }, () => {
      const row = document.createElement('div');
      row.className = 'pl-history-row';
      row.setAttribute('role', 'listitem');

      const trialEl = document.createElement('div');
      trialEl.className = 'pl-history-trial body-xsmall';

      const outcomeEl = document.createElement('div');
      outcomeEl.className = 'pl-history-outcome body-xsmall';

      row.append(trialEl, outcomeEl);
      itemsEl.appendChild(row);
      return { row, trialEl, outcomeEl };
    });
  }

  function setScrollToLatest() {
    const maxScroll = Math.max(0, scrollerEl.scrollHeight - scrollerEl.clientHeight);
    scrollerEl.scrollTop = maxScroll;
  }

  function renderWindow() {
    if (!currentState || currentTrials <= 0) return;

    const scrollTop = scrollerEl.scrollTop;
    const overscan = 6;
    const firstVisible = Math.floor(scrollTop / rowHeight);
    const start = clamp(firstVisible - overscan, 0, Math.max(0, currentTrials - 1));

    for (let i = 0; i < poolSize; i += 1) {
      const trialIndex = start + i;
      const slot = pool[i];

      if (trialIndex >= currentTrials) {
        slot.row.hidden = true;
        continue;
      }

      slot.row.hidden = false;
      slot.row.style.transform = `translateY(${trialIndex * rowHeight}px)`;
      slot.trialEl.textContent = `#${formatCount(trialIndex + 1)}`;

      if (currentState.mode === 'two') {
        const labels = getTwoLabels(currentState, trialIndex);
        slot.outcomeEl.textContent = `A: ${labels.a} · B: ${labels.b}`;
      } else {
        slot.outcomeEl.textContent = getSingleLabel(currentState, trialIndex);
      }
    }
  }

  function sync(state, { scrollToLatest = false, preserveScroll = false } = {}) {
    currentState = state;
    currentTrials = state?.mode === 'two' ? state.two?.trials ?? 0 : state.single?.trials ?? 0;

    summaryEl.textContent = `Trials: ${formatCount(currentTrials)}`;

    if (currentTrials <= 0) {
      emptyEl.hidden = false;
      scrollerEl.hidden = true;
      viewportEl.style.height = '0px';
      itemsEl.innerHTML = '';
      pool = [];
      poolSize = 0;
      return;
    }

    emptyEl.hidden = true;
    scrollerEl.hidden = false;

    const wasAtBottom = preserveScroll ? isNearBottom(scrollerEl) : false;
    const previousScrollTop = scrollerEl.scrollTop;

    viewportEl.style.height = `${currentTrials * rowHeight}px`;
    ensurePool();

    const shouldScrollToLatest = scrollToLatest || wasAtBottom;
    if (shouldScrollToLatest) {
      setScrollToLatest();
    } else {
      const maxScroll = Math.max(0, scrollerEl.scrollHeight - scrollerEl.clientHeight);
      scrollerEl.scrollTop = clamp(previousScrollTop, 0, maxScroll);
    }

    renderWindow();
  }

  scrollerEl.addEventListener('scroll', () => {
    renderWindow();
  }, { passive: true });

  if (jumpTopButton) {
    jumpTopButton.addEventListener('click', () => {
      scrollerEl.scrollTop = 0;
      renderWindow();
    });
  }

  if (jumpLatestButton) {
    jumpLatestButton.addEventListener('click', () => {
      setScrollToLatest();
      renderWindow();
    });
  }

  return { sync };
}

