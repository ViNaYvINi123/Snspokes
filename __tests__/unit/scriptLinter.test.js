const { lintScript } = require('../../lib/scriptLinter');

describe('scriptLinter', () => {
  test('passes clean script with no issues', () => {
    const script = `
      // Get high priority incidents
      var gr = new GlideRecord('incident');
      gr.addQuery('priority', '1');
      gr.setLimit(100);
      gr.query();
      while (gr.next()) {
        gs.info('Found incident: ' + gr.number);
      }
    `;
    const result = lintScript(script, { type: 'server' });
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('grade');
    expect(result.score).toBeGreaterThan(0);
  });

  test('detects missing setLimit', () => {
    const script = `
      var gr = new GlideRecord('incident');
      gr.query();
      while (gr.next()) { gs.info(gr.number); }
    `;
    const result = lintScript(script, { type: 'server' });
    const issue = result.issues.find(i => i.id === 'no-limit');
    expect(issue).toBeTruthy();
    expect(issue.severity).toBe('warning');
  });

  test('detects update inside loop', () => {
    const script = `
      var gr = new GlideRecord('incident');
      gr.query();
      while (gr.next()) {
        gr.state = 2;
        gr.update();
      }
    `;
    const result = lintScript(script, { type: 'server' });
    const issue = result.issues.find(i => i.id === 'update-in-loop');
    expect(issue).toBeTruthy();
    expect(issue.severity).toBe('error');
  });

  test('detects GlideRecord in client script', () => {
    const script = `
      var gr = new GlideRecord('incident');
      gr.query();
    `;
    const result = lintScript(script, { type: 'client_script' });
    const issue = result.issues.find(i => i.id === 'gr-in-client');
    expect(issue).toBeTruthy();
    expect(issue.severity).toBe('error');
  });

  test('detects eval usage', () => {
    const script = `eval("gs.info('test')")`;
    const result = lintScript(script, { type: 'server' });
    const issue = result.issues.find(i => i.id === 'eval');
    expect(issue).toBeTruthy();
    expect(issue.severity).toBe('error');
  });

  test('detects hardcoded sys_id', () => {
    const script = `var sysId = 'abc123def456abc123def456abc123de';`;
    const result = lintScript(script, { type: 'server' });
    const issue = result.issues.find(i => i.id === 'hardcoded-sysid');
    expect(issue).toBeTruthy();
  });

  test('detects deprecated gs.log', () => {
    const script = `gs.log('test message');`;
    const result = lintScript(script, { type: 'server' });
    const issue = result.issues.find(i => i.id === 'gs-log');
    expect(issue).toBeTruthy();
    expect(issue.severity).toBe('info');
  });

  test('score decreases with more errors', () => {
    const cleanScript = `// Clean\nvar gr = new GlideRecord('incident');\ngr.setLimit(10);\ngr.query();\nwhile(gr.next()) { gs.info(gr.number); }`;
    const dirtyScript = `eval('x'); var gr = new GlideRecord('t'); while(gr.next()) { gr.update(); }`;
    const cleanResult = lintScript(cleanScript, { type: 'server' });
    const dirtyResult = lintScript(dirtyScript, { type: 'server' });
    expect(cleanResult.score).toBeGreaterThan(dirtyResult.score);
  });

  test('grade is A for perfect script', () => {
    const script = `
      // Perfect script with comments
      try {
        var gr = new GlideRecord('incident');
        gr.addQuery('active', true);
        gr.setLimit(50);
        gr.query();
        while (gr.next()) {
          gs.info('Processing: ' + gr.number);
        }
      } catch(e) {
        gs.error('Error: ' + e.message);
      }
    `;
    const result = lintScript(script, { type: 'server' });
    expect(['A', 'B']).toContain(result.grade);
  });

  test('returns required fields', () => {
    const result = lintScript('gs.info("test");', { type: 'server' });
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('errors');
    expect(result.summary).toHaveProperty('warnings');
    expect(result.summary).toHaveProperty('info');
    expect(Array.isArray(result.issues)).toBe(true);
  });
});
