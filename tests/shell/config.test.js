import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../client/src/shell/config.js';

describe('validateConfig (visualElements)', () => {
  it('omits visualElements when not provided', () => {
    const validated = validateConfig({ mode: 'single', device: 'coin' });
    expect(validated.visualElements).toBeUndefined();
  });

  it('defaults visualElements keys to true when provided as empty object', () => {
    const validated = validateConfig({ mode: 'single', device: 'coin', visualElements: {} });
    expect(validated.visualElements).toEqual({ editExperimentButton: true, biasTag: true });
  });

  it('supports hiding biasTag via visualElements', () => {
    const validated = validateConfig({ mode: 'single', device: 'coin', visualElements: { biasTag: false } });
    expect(validated.visualElements).toEqual({ editExperimentButton: true, biasTag: false });
  });

  it('ignores visualElements when not an object', () => {
    const validated = validateConfig({ mode: 'single', device: 'coin', visualElements: 'nope' });
    expect(validated.visualElements).toBeUndefined();
  });
});

