// Error patterns and fixes for FiveM
export interface ErrorPattern {
  id: string;
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  suggestedFix: string;
  fixCommand?: string;
  documentation?: string;
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  // nil value errors
  {
    id: 'nil-index',
    pattern: /attempt to index a nil value \(global '([^']+)'\)/,
    message: 'Nil value error - variable or export not found',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Check if the resource is loaded and the export/function exists',
    fixCommand: 'ensure [resource-name]',
  },
  {
    id: 'nil-method',
    pattern: /attempt to index a nil value \(method '([^']+)'\)/,
    message: 'Method call on nil object',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Verify the object is initialized before calling methods',
  },
  // function errors
  {
    id: 'nil-function',
    pattern: /attempt to call a nil value \(global '([^']+)'\)/,
    message: 'Function or export not found',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Check if the resource providing this function is loaded',
    fixCommand: 'ensure [resource-name]',
  },
  {
    id: 'nil-method-call',
    pattern: /attempt to call a nil value \(method '([^']+)'\)/,
    message: 'Method not found on object',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Verify the method exists and the object is properly initialized',
  },
  // dependency errors
  {
    id: 'missing-dependency',
    pattern: /dependency '([^']+)'/,
    message: 'Missing dependency',
    severity: 'error',
    category: 'dependency',
    suggestedFix: 'Install the required dependency resource',
    fixCommand: 'ensure [dependency-name]',
  },
  {
    id: 'missing-resource',
    pattern: /script '~([^~]+~)' could not be found/,
    message: 'Script file not found',
    severity: 'error',
    category: 'resource',
    suggestedFix: 'Check if the resource is installed correctly',
  },
  // timeout errors
  {
    id: 'timeout',
    pattern: /timeout/,
    message: 'Operation timed out',
    severity: 'warning',
    category: 'performance',
    suggestedFix: 'Check for slow database queries or infinite loops',
  },
  // database errors
  {
    id: 'sql-error',
    pattern: /SQL ERROR: (.+)/,
    message: 'Database error',
    severity: 'error',
    category: 'database',
    suggestedFix: 'Check database connection and query syntax',
  },
  // permission errors
  {
    id: 'permission-denied',
    pattern: /permission denied/i,
    message: 'Permission denied',
    severity: 'error',
    category: 'security',
    suggestedFix: 'Check user permissions and resource access levels',
  },
  // config errors
  {
    id: 'config-error',
    pattern: /config\.lua[:\s]*(.+?)[:\s]*\((\d+)\)/,
    message: 'Configuration error',
    severity: 'warning',
    category: 'config',
    suggestedFix: 'Check the configuration file at the specified line',
  },
  // network errors
  {
    id: 'connection-lost',
    pattern: /connection lost|lost connection/i,
    message: 'Connection lost',
    severity: 'warning',
    category: 'network',
    suggestedFix: 'Check network stability and server connectivity',
  },
  // memory errors
  {
    id: 'out-of-memory',
    pattern: /out of memory|memory allocation failed/i,
    message: 'Out of memory',
    severity: 'error',
    category: 'performance',
    suggestedFix: 'Reduce resource usage or increase server memory',
  },
  // file errors
  {
    id: 'file-not-found',
    pattern: /file not found[:\s]*(.+?)[:\s]*\((\d+)\)/,
    message: 'File not found',
    severity: 'error',
    category: 'resource',
    suggestedFix: 'Check if the file exists at the specified path',
  },
  // syntax errors
  {
    id: 'syntax-error',
    pattern: /unexpected symbol near '(.+?)'/,
    message: 'Lua syntax error',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Check for typos or missing brackets/quotes',
  },
  // export errors
  {
    id: 'export-not-found',
    pattern: /cannot find export '([^']+)'/,
    message: 'Export not found',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Check if the resource is loaded and the export exists',
  },
];

export function analyzeError(log: string): ErrorPattern[] {
  const matches: ErrorPattern[] = [];
  
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(log)) {
      matches.push(pattern);
    }
  }
  
  return matches;
}

export function getSuggestedFix(error: ErrorPattern): string {
  return `${error.suggestedFix}${error.fixCommand ? `\nCommand: \`${error.fixCommand}\`` : ''}`;
}
