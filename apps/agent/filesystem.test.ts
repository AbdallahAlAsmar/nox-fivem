import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemActions } from './src/fs/filesystem';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FilesystemActions', () => {
  let tmpDir: string;
  let fsActions: FilesystemActions;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fivem-test-'));
    fsActions = new FilesystemActions(tmpDir);
    
    await fs.writeFile(path.join(tmpDir, 'test.lua'), 'hello world');
    await fs.mkdir(path.join(tmpDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'subdir', 'nested.lua'), 'nested content');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should read a file', async () => {
    const result = await fsActions.readFile('test.lua');
    expect(result.content).toBe('hello world');
    expect(result.path).toBe('test.lua');
    expect(result.size).toBeGreaterThan(0);
    expect(result.sha256).toBeDefined();
  });

  it('should list a directory', async () => {
    const result = await fsActions.listDirectory('.');
    expect(result.entries.some(e => e.name === 'test.lua')).toBe(true);
    expect(result.entries.some(e => e.name === 'subdir')).toBe(true);
  });

  it('should reject paths outside root', async () => {
    await expect(fsActions.readFile('../../etc/passwd')).rejects.toThrow();
  });

  it('should apply a patch', async () => {
    const changeId = 'test-change-id';
    const result = await fsActions.applyPatch(changeId, [{
      path: 'new-file.lua',
      newContent: 'return { hello = "world" }',
    }]);

    expect(result.allSucceeded).toBe(true);
    expect(result.appliedFiles[0].success).toBe(true);

    const content = await fs.readFile(path.join(tmpDir, 'new-file.lua'), 'utf-8');
    expect(content).toBe('return { hello = "world" }');
  });
});
