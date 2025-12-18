// Simple state store for explicit state management
// Provides getState, setState, and subscribe methods

/**
 * Creates a store instance with explicit state management.
 *
 * @param {Object} initialState - Initial state object
 * @returns {Object} Store instance with { getState, setState, subscribe }
 */
export function createStore(initialState) {
  let state = initialState;
  const subscribers = [];

  /**
   * Gets the current state.
   * @returns {Object} Current state object
   */
  function getState() {
    return state;
  }

  /**
   * Updates state. Accepts either:
   * - Function updater: setState(draft => { draft.mode = 'two'; })
   * - Partial object: setState({ mode: 'two' }) (shallow merge)
   *
   * @param {Function|Object} updater - Function that receives draft state, or partial object to merge
   */
  function setState(updater) {
    if (typeof updater === 'function') {
      // Function updater: allows direct mutation of draft (draft is state reference)
      updater(state);
    } else {
      // Partial object: shallow merge
      state = { ...state, ...updater };
    }

    // Notify all subscribers
    subscribers.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('Store subscriber error:', error);
      }
    });
  }

  /**
   * Subscribes to state changes.
   *
   * @param {Function} callback - Called after each setState with new state
   * @returns {Function} Unsubscribe function
   */
  function subscribe(callback) {
    subscribers.push(callback);
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }

  return {
    getState,
    setState,
    subscribe,
  };
}

