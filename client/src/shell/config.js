// Configuration loader for Probability Lab
// Loads config.json at runtime and validates structure

const VALID_MODES = ['single', 'two'];
const VALID_DEVICES = ['coin', 'die', 'spinner'];

/**
 * Validates configuration object structure
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated config with defaults for missing/invalid fields
 */
function validateConfig(config) {
  const validated = {};

  // Validate mode
  if (VALID_MODES.includes(config.mode)) {
    validated.mode = config.mode;
  } else {
    console.warn(`Invalid mode "${config.mode}", defaulting to "single"`);
    validated.mode = 'single';
  }

  // Validate device(s) based on mode
  if (validated.mode === 'single') {
    if (VALID_DEVICES.includes(config.device)) {
      validated.device = config.device;
    } else {
      console.warn(`Invalid device "${config.device}", defaulting to "coin"`);
      validated.device = 'coin';
    }
  } else {
    // Two-event mode
    if (VALID_DEVICES.includes(config.deviceA)) {
      validated.deviceA = config.deviceA;
    } else {
      console.warn(`Invalid deviceA "${config.deviceA}", defaulting to "coin"`);
      validated.deviceA = 'coin';
    }

    if (VALID_DEVICES.includes(config.deviceB)) {
      validated.deviceB = config.deviceB;
    } else {
      console.warn(`Invalid deviceB "${config.deviceB}", defaulting to "coin"`);
      validated.deviceB = 'coin';
    }
  }

  return validated;
}

/**
 * Loads configuration from config.json
 * @returns {Promise<Object>} Promise resolving to validated config object
 */
export async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
    }
    const config = await response.json();
    return validateConfig(config);
  } catch (error) {
    console.error('Error loading config.json:', error);
    // Return default config on error
    return {
      mode: 'single',
      device: 'coin',
    };
  }
}

