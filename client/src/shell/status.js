// Shared status utilities
// Provides setStatus and getStatusEl for both app.js and codesignal-probability-lab.js

let statusEl = null;

export function getStatusEl() {
  if (!statusEl) {
    statusEl = document.getElementById('status');
  }
  return statusEl;
}

export function setStatus(message) {
  const el = getStatusEl();
  if (!el) return;
  el.textContent = message;
}

