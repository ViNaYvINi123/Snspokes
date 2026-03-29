const { CODE_TYPES, buildSystemPrompt } = require('../../lib/codeGenerator');

describe('CODE_TYPES', () => {
  test('has all required code types', () => {
    const required = ['business_rule', 'script_include', 'client_script', 'scheduled_job', 'rest_api', 'transform_map', 'flow_script'];
    required.forEach(type => {
      expect(CODE_TYPES).toHaveProperty(type);
    });
  });

  test('each type has label', () => {
    Object.entries(CODE_TYPES).forEach(([key, value]) => {
      expect(value).toHaveProperty('label');
      expect(typeof value.label).toBe('string');
      expect(value.label.length).toBeGreaterThan(0);
    });
  });
});

describe('buildSystemPrompt', () => {
  test('builds prompt for business_rule', () => {
    const prompt = buildSystemPrompt('business_rule', { tableName: 'incident', when: 'before' });
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt.toLowerCase()).toContain('servicenow');
  });

  test('builds prompt for script_include', () => {
    const prompt = buildSystemPrompt('script_include', {});
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  test('builds prompt for client_script', () => {
    const prompt = buildSystemPrompt('client_script', { tableName: 'incident' });
    expect(typeof prompt).toBe('string');
    expect(prompt.toLowerCase()).toContain('client');
  });

  test('handles unknown code type gracefully', () => {
    expect(() => buildSystemPrompt('unknown_type', {})).not.toThrow();
  });

  test('returns string for all code types', () => {
    Object.keys(CODE_TYPES).forEach(type => {
      const prompt = buildSystemPrompt(type, {});
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});
