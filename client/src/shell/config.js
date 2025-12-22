// Configuration loader for Probability Lab
// Loads config.json at runtime and validates structure

const VALID_MODES = ['single', 'two'];
const VALID_DEVICES = ['coin', 'die', 'spinner'];
const VALID_SECTIONS_SINGLE = ['barChart', 'convergence', 'frequencyTable'];
const VALID_SECTIONS_TWO = ['jointDistribution', 'twoWayTable'];

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

  // Validate sections object
  if (config.sections && typeof config.sections === 'object') {
    const validatedSections = {};
    const validSections = validated.mode === 'single' ? VALID_SECTIONS_SINGLE : VALID_SECTIONS_TWO;

    for (const sectionKey of validSections) {
      const value = config.sections[sectionKey];
      if (typeof value === 'boolean') {
        validatedSections[sectionKey] = value;
      } else {
        // Default to false (hidden) for missing/invalid values
        validatedSections[sectionKey] = false;
      }
    }

    validated.sections = validatedSections;
  }
  // If sections is missing entirely, don't add it (will use store defaults)

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
      sections: {
        barChart: false,
        convergence: false,
        frequencyTable: false,
        jointDistribution: false,
        twoWayTable: false,
      },
    };
  }
}

