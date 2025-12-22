// Simulation runner with RAF chunking and auto-run loop
import { clamp } from '../../shared/math.js';

/**
 * Creates a runner instance that manages trial execution with requestAnimationFrame chunking.
 *
 * @param {Object} runningState - State object with:
 *   - cancel: boolean
 *   - auto: boolean
 *   - rafId: number | null
 * @param {Object} callbacks - Callback functions:
 *   - onTick(): Called after each chunk of trials (for rendering)
 *   - onDone(): Called when a run completes (for updating controls)
 *   - onStop(): Called when a run stops (for updating controls)
 * @returns {Object} Runner instance with runTrials, startAuto, stopRunning methods
 */
export function createRunner(runningState, callbacks) {
  const { onTick, onDone, onStop } = callbacks;

  function stopRunning() {
    runningState.cancel = true;
    runningState.auto = false;
    if (runningState.rafId) {
      window.cancelAnimationFrame(runningState.rafId);
      runningState.rafId = null;
    }
    if (onStop) onStop();
  }

  function runTrials(total, mode, simulateSingle, simulateTwo, stateSlice, rng) {
    if (runningState.rafId !== null) return;
    if (!Number.isFinite(total) || total <= 0) return;

    runningState.cancel = false;
    if (onDone) onDone();

    const chunkSize = 50_000;
    let remaining = Math.floor(total);

    const tick = () => {
      if (runningState.cancel) {
        runningState.rafId = null;
        if (onDone) onDone();
        if (onTick) onTick();
        return;
      }

      const chunk = Math.min(chunkSize, remaining);
      if (mode === 'two') {
        simulateTwo(stateSlice, rng, chunk);
      } else {
        simulateSingle(stateSlice, rng, chunk);
      }

      remaining -= chunk;
      if (onTick) onTick();

      if (remaining > 0) {
        runningState.rafId = window.requestAnimationFrame(tick);
      } else {
        runningState.rafId = null;
        if (onDone) onDone();
      }
    };

    runningState.rafId = window.requestAnimationFrame(tick);
  }

  function startAuto(mode, simulateSingle, simulateTwo, stateSlice, rng, speed) {
    if (runningState.rafId !== null) return;
    runningState.auto = true;
    runningState.cancel = false;
    if (onDone) onDone();

    // Clamp speed to valid range (1-60 iterations/sec)
    const clampedSpeed = Math.max(1, Math.min(60, speed || 60));
    const delayMs = 1000 / clampedSpeed;
    let lastTime = performance.now();

    const tick = (currentTime) => {
      if (!runningState.auto || runningState.cancel) {
        runningState.auto = false;
        runningState.rafId = null;
        if (onDone) onDone();
        return;
      }

      // Check if enough time has passed for the next iteration
      const elapsed = currentTime - lastTime;
      if (elapsed >= delayMs) {
        const chunk = 1;

        if (mode === 'two') {
          simulateTwo(stateSlice, rng, chunk);
        } else {
          simulateSingle(stateSlice, rng, chunk);
        }

        if (onTick) onTick();
        lastTime = currentTime;
      }

      // Continue the loop
      runningState.rafId = window.requestAnimationFrame(tick);
    };

    runningState.rafId = window.requestAnimationFrame(tick);
  }

  return {
    runTrials,
    startAuto,
    stopRunning,
  };
}

