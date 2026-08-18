/**
 * Reconstruct proposed file contents from the unified-ish diff stored on Change.diff.
 * Format produced by chatService.generateDiff:
 *
 * ```diff
 * --- Current
 * +++ Proposed
 *  unchanged
 * -old
 * +new
 * ```
 */
export function parseDiffToPatch(
  diff: string,
  touchedFiles: string[] = []
): Array<{ path: string; newContent: string; expectedSha256?: string }> {
  const lines = diff.split('\n');
  const files: Array<{ path: string; newContent: string }> = [];

  let currentFile: string | null = null;
  let inDiff = false;
  const newContentLines: string[] = [];

  const flush = () => {
    if (currentFile && newContentLines.length > 0) {
      files.push({ path: currentFile, newContent: newContentLines.join('\n') });
    }
    currentFile = null;
    newContentLines.length = 0;
  };

  for (const line of lines) {
    if (line.startsWith('```diff')) {
      inDiff = true;
      continue;
    }
    if (line.startsWith('```') && inDiff) {
      flush();
      inDiff = false;
      continue;
    }
    if (!inDiff) continue;

    if (line.startsWith('--- ')) {
      continue;
    }
    if (line.startsWith('+++ ')) {
      flush();
      const header = line.slice(4).trim();
      currentFile = header === 'Proposed' ? (touchedFiles[0] ?? header) : header;
      continue;
    }

    if (currentFile) {
      if (line.startsWith('+')) {
        newContentLines.push(line.slice(1));
      } else if (line.startsWith(' ')) {
        newContentLines.push(line.slice(1));
      }
    }
  }

  flush();

  return files;
}
