import { describe, it, expect } from 'vitest';
import { sanitizeRelativePath } from './src/http/pathGuard';

describe('sanitizeRelativePath', () => {
  const valid = [
    ['resources/my-resource/fxmanifest.lua', 'resources/my-resource/fxmanifest.lua'],
    ['a/b/c.lua', 'a/b/c.lua'],
    ['dir/./file.txt', 'dir/file.txt'],
    ['double//slash.txt', 'double/slash.txt'],
  ] as const;

  for (const [input, expected] of valid) {
    it(`accepts: ${input}`, () => {
      expect(sanitizeRelativePath(input)).toBe(expected);
    });
  }

  const invalid = [
    'C:\\absolute\\path',
    'C:/absolute/path',
    '\\\\server\\share\\file',
    '/etc/passwd',
    '\\windows\\system32',
    'resources/../../../etc/passwd',
    '..\\..\\windows\\system32\\config',
    'a/../b/../../c',
    '\0hidden',
    '',
    '   ',
  ];

  for (const input of invalid) {
    it(`rejects: ${input === '' ? '(empty)' : JSON.stringify(input)}`, () => {
      expect(sanitizeRelativePath(input)).toBeNull();
    });
  }

  it('normalizes backslashes to forward slashes when safe', () => {
    // Backslash normalization is fine as long as no traversal results.
    expect(sanitizeRelativePath('resources\\my-res\\fxmanifest.lua')).toBe(
      'resources/my-res/fxmanifest.lua'
    );
  });
});
