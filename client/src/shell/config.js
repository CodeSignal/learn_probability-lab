// Configuration loader for Probability Lab
// Loads config.json at runtime and validates structure

const VALID_MODES = ['single', 'two'];
const VALID_DEVICES = ['coin', 'die', 'spinner', 'custom'];
const MAX_CUSTOM_OUTCOMES = 50;
const VALID_SECTIONS_SINGLE = ['barChart', 'convergence', 'frequencyTable'];
const VALID_SECTIONS_TWO = ['jointDistribution', 'twoWayTable'];

/**
 * Validates configuration object structure
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated config with defaults for missing/invalid fields
 */
const DEFAULT_CUSTOM_SETTINGS = {
  name: 'Custom Device',
  icon: '',
  outcomes: ['Outcome 1', 'Outcome 2'],
};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildUniformProbabilities(length) {
  if (length <= 0) return [];
  const p = 1 / length;
  return Array.from({ length }, () => p);
}

function validateCustomDeviceSettings(settings, label) {
  if (!settings || typeof settings !== 'object') {
    console.warn(`Invalid ${label}: expected object, using defaults`);
    return {
      ...DEFAULT_CUSTOM_SETTINGS,
      probabilities: buildUniformProbabilities(DEFAULT_CUSTOM_SETTINGS.outcomes.length),
    };
  }

  const name = isNonEmptyString(settings.name) ? settings.name.trim() : DEFAULT_CUSTOM_SETTINGS.name;
  if (!isNonEmptyString(settings.name)) {
    console.warn(`Invalid ${label}.name, using "${DEFAULT_CUSTOM_SETTINGS.name}"`);
  }

  const icon = isNonEmptyString(settings.icon) ? settings.icon.trim() : '';

  const outcomesSource = Array.isArray(settings.outcomes) ? settings.outcomes : null;
  if (!outcomesSource) {
    console.warn(`Invalid ${label}.outcomes, using defaults`);
  }

  const seen = new Set();
  const outcomes = [];
  const probabilitiesSource = Array.isArray(settings.probabilities) ? settings.probabilities : null;
  const probabilitiesRaw = probabilitiesSource ? [] : null;

  if (outcomesSource) {
    for (let i = 0; i < outcomesSource.length; i += 1) {
      const text = String(outcomesSource[i] ?? '').trim();
      if (!text) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      outcomes.push(text);
      if (probabilitiesRaw) probabilitiesRaw.push(probabilitiesSource[i]);
    }
  }

  if (outcomes.length < 2) {
    console.warn(`Invalid ${label}.outcomes, using defaults`);
    outcomes.length = 0;
    outcomes.push(...DEFAULT_CUSTOM_SETTINGS.outcomes);
    if (probabilitiesRaw) probabilitiesRaw.length = 0;
  }

  if (outcomes.length > MAX_CUSTOM_OUTCOMES) {
    console.warn(`${label}.outcomes exceeds ${MAX_CUSTOM_OUTCOMES}, truncating`);
    outcomes.length = MAX_CUSTOM_OUTCOMES;
    if (probabilitiesRaw) probabilitiesRaw.length = MAX_CUSTOM_OUTCOMES;
  }

  let probabilities = null;
  if (probabilitiesRaw) {
    if (probabilitiesRaw.length !== outcomes.length) {
      console.warn(`${label}.probabilities length mismatch, using uniform`);
    } else {
      const numeric = probabilitiesRaw.map((value) => Number(value));
      const invalid = numeric.some((value) => !Number.isFinite(value) || value < 0);
      const sum = numeric.reduce((acc, value) => acc + value, 0);
      if (invalid || sum <= 0) {
        console.warn(`${label}.probabilities invalid, using uniform`);
      } else {
        probabilities = numeric.map((value) => value / sum);
      }
    }
  }

  if (!probabilities) {
    probabilities = buildUniformProbabilities(outcomes.length);
  }

  return {
    name,
    icon,
    outcomes,
    probabilities,
  };
}

function validateConfig(config) {
  const validated = {};
  const rawConfig = config && typeof config === 'object' ? config : {};

  // Validate mode
  if (VALID_MODES.includes(rawConfig.mode)) {
    validated.mode = rawConfig.mode;
  } else {
    console.warn(`Invalid mode "${rawConfig.mode}", defaulting to "single"`);
    validated.mode = 'single';
  }

  // Validate device(s) based on mode
  if (validated.mode === 'single') {
    if (VALID_DEVICES.includes(rawConfig.device)) {
      validated.device = rawConfig.device;
    } else {
      console.warn(`Invalid device "${rawConfig.device}", defaulting to "coin"`);
      validated.device = 'coin';
    }

    if (validated.device === 'custom') {
      validated.deviceSettings = validateCustomDeviceSettings(rawConfig.deviceSettings, 'deviceSettings');
    }
  } else {
    // Two-event mode
    if (VALID_DEVICES.includes(rawConfig.deviceA)) {
      validated.deviceA = rawConfig.deviceA;
    } else {
      console.warn(`Invalid deviceA "${rawConfig.deviceA}", defaulting to "coin"`);
      validated.deviceA = 'coin';
    }

    if (VALID_DEVICES.includes(rawConfig.deviceB)) {
      validated.deviceB = rawConfig.deviceB;
    } else {
      console.warn(`Invalid deviceB "${rawConfig.deviceB}", defaulting to "coin"`);
      validated.deviceB = 'coin';
    }

    if (validated.deviceA === 'custom') {
      validated.deviceASettings = validateCustomDeviceSettings(rawConfig.deviceASettings, 'deviceASettings');
    }
    if (validated.deviceB === 'custom') {
      validated.deviceBSettings = validateCustomDeviceSettings(rawConfig.deviceBSettings, 'deviceBSettings');
    }
  }

  // Validate sections object
  if (rawConfig.sections && typeof rawConfig.sections === 'object') {
    const validatedSections = {};
    const validSections = validated.mode === 'single' ? VALID_SECTIONS_SINGLE : VALID_SECTIONS_TWO;

    for (const sectionKey of validSections) {
      const value = rawConfig.sections[sectionKey];
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
