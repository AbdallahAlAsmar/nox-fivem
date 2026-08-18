import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ErrorCodes, createError } from '@fivem-ai/shared';

export class FilesystemActions {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  /**
   * Validate that a path is within the server-data root
   */
  private validatePath(requestedPath: string): string {
    const resolved = path.resolve(this.rootPath, requestedPath);
    
    if (!resolved.startsWith(this.rootPath)) {
      throw createError(ErrorCodes.PATH_OUTSIDE_ROOT, 
        'Path is outside the configured server-data directory');
    }

    return resolved;
  }

  /**
   * Read a file from the server-data directory
   */
  async readFile(relativePath: string, maxBytes: number = 200000): Promise<{
    path: string;
    content: string;
    sha256: string;
    size: number;
    modifiedAt: string;
  }> {
    const filePath = this.validatePath(relativePath);

    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > maxBytes) {
        throw createError(ErrorCodes.FILE_TOO_LARGE, 
          `File is ${stats.size} bytes, max allowed is ${maxBytes}`);
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');

      return {
        path: relativePath,
        content,
        sha256,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw createError(ErrorCodes.PATH_NOT_FOUND, `File not found: ${relativePath}`);
      }
      throw error;
    }
  }

  /**
   * List files and directories
   */
  async listDirectory(
    relativePath: string,
    recursive: boolean = false
  ): Promise<{
    path: string;
    entries: Array<{
      name: string;
      path: string;
      type: 'file' | 'directory';
      size?: number;
      modifiedAt?: string;
    }>;
  }> {
    const dirPath = this.validatePath(relativePath);

    try {
      const entries = await this.walkDirectory(dirPath, recursive);
      
      return {
        path: relativePath,
        entries: entries.map(entry => ({
          name: entry.name,
          path: path.relative(this.rootPath, entry.path),
          type: entry.type,
          size: entry.size,
          modifiedAt: entry.modifiedAt,
        })),
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw createError(ErrorCodes.PATH_NOT_FOUND, `Directory not found: ${relativePath}`);
      }
      throw error;
    }
  }

  /**
   * Walk a directory recursively or not
   */
  private async walkDirectory(
    dirPath: string,
    recursive: boolean
  ): Promise<Array<{
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedAt?: string;
  }>> {
    const entries: Array<any> = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: itemPath,
          type: 'directory' as const,
        });

        if (recursive) {
          const subEntries = await this.walkDirectory(itemPath, recursive);
          entries.push(...subEntries);
        }
      } else if (item.isFile()) {
        const stats = await fs.stat(itemPath);
        entries.push({
          name: item.name,
          path: itemPath,
          type: 'file' as const,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }

    return entries;
  }

  /**
   * Apply file patches (after git checkpoint)
   */
  async applyPatch(
    changeId: string,
    files: Array<{
      path: string;
      expectedSha256?: string;
      newContent: string;
    }>
  ): Promise<{
    changeId: string;
    appliedFiles: Array<{ path: string; success: boolean; error?: string }>;
    allSucceeded: boolean;
  }> {
    const appliedFiles: Array<{ path: string; success: boolean; error?: string }> = [];

    for (const file of files) {
      try {
        const filePath = this.validatePath(file.path);

        // Verify expected hash if provided
        if (file.expectedSha256) {
          try {
            const existing = await fs.readFile(filePath, 'utf-8');
            const existingHash = crypto.createHash('sha256').update(existing).digest('hex');
            
            if (existingHash !== file.expectedSha256) {
              appliedFiles.push({
                path: file.path,
                success: false,
                error: 'File changed since staged',
              });
              continue;
            }
          } catch (error: any) {
            if (error.code !== 'ENOENT') {
              throw error;
            }
            // File doesn't exist yet, that's okay for new files
          }
        }

        // Create parent directories if needed
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write the file
        await fs.writeFile(filePath, file.newContent, 'utf-8');

        appliedFiles.push({
          path: file.path,
          success: true,
        });
      } catch (error: any) {
        appliedFiles.push({
          path: file.path,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      changeId,
      appliedFiles,
      allSucceeded: appliedFiles.every(f => f.success),
    };
  }
}
