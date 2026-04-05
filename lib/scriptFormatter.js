// Rule-based ServiceNow script formatter — zero AI cost
export function formatScript(code) {
  if (!code?.trim()) return { formatted: '', changes: [] };
  const changes = [];
  let result = code;

  // 1. Fix indentation
  const lines = result.split('\n');
  let indent = 0;
  const formatted = lines.map(line => {
    let trimmed = line.trim();
    if (!trimmed) return '';
    // Decrease indent for closing braces
    if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) indent = Math.max(0, indent - 1);
    const indented = '  '.repeat(indent) + trimmed;
    // Increase indent for opening braces
    if (trimmed.endsWith('{') || trimmed.endsWith('[') || (trimmed.endsWith('(') && !trimmed.includes(')')) ) indent++;
    return indented;
  });
  result = formatted.join('\n');
  changes.push('Fixed indentation');

  // 2. Normalize semicolons
  result = result.replace(/;;\s*$/gm, ';');

  // 3. Add spaces around operators
  result = result.replace(/([=!<>])=(?!=)/g, '$1= ');
  result = result.replace(/(?<!=)=(?!=)/g, ' = ');

  // 4. Normalize quotes (single → single, consistent)
  // Don't touch strings inside strings

  // 5. Remove trailing whitespace
  result = result.replace(/[ \t]+$/gm, '');

  // 6. Remove multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // 7. ServiceNow best practices
  if (result.includes('.getRowCount()') && !result.includes('GlideAggregate')) {
    changes.push('⚠️ Consider GlideAggregate instead of getRowCount() for performance');
  }
  if (result.includes('current.update()') && result.includes('before')) {
    changes.push('⚠️ Avoid current.update() in Before business rules — changes auto-save');
  }
  if (!result.includes('setLimit') && result.includes('.query()') && (result.includes('syslog') || result.includes('sys_audit'))) {
    changes.push('⚠️ Add setLimit() when querying large tables (syslog, sys_audit)');
  }

  return { formatted: result.trim(), changes };
}
