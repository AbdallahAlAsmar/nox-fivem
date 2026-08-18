import { describe, it, expect } from 'vitest';
import { parseDiffToPatch } from './src/http/parseDiff';

describe('Diff Parsing', () => {
  it('should parse a simple diff into patch files', () => {
    const diff = '```diff\n--- Current\n+++ Proposed\n hello\n-world\n+new\n```';
    
    const files = parseDiffToPatch(diff);
    
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('Proposed');
    expect(files[0].newContent).toContain('hello');
    expect(files[0].newContent).toContain('new');
    expect(files[0].newContent).not.toContain('-world');
  });

  it('should handle empty diff', () => {
    const files = parseDiffToPatch('');
    expect(files).toHaveLength(0);
  });
});
