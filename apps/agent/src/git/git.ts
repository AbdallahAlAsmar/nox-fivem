import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { ErrorCodes, createError } from '@fivem-ai/shared';

export class GitActions {
  private rootPath: string;
  private git: SimpleGit;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
    this.git = simpleGit(this.rootPath);
  }

  /**
   * Check if directory is a git repo
   */
  async isRepo(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo();
      return isRepo;
    } catch {
      return false;
    }
  }

  /**
   * Initialize git repo if not exists
   */
  async ensureRepo(): Promise<void> {
    const isRepo = await this.isRepo();
    if (!isRepo) {
      await this.git.init();
      await this.git.addConfig('user.email', 'agent@fivem-ai.dev');
      await this.git.addConfig('user.name', 'FiveM AI Agent');
    }
  }

  /**
   * Create a checkpoint before applying changes
   */
  async checkpoint(changeId: string, message?: string): Promise<{
    changeId: string;
    sha: string;
    branch: string;
  }> {
    await this.ensureRepo();

    try {
      // Add all changes
      await this.git.add('.');

      // Create commit
      const commitMessage = message || `Checkpoint: Change ${changeId}`;
      const result = await this.git.commit(commitMessage);

      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

      return {
        changeId,
        sha: result.commit,
        branch: branch.trim(),
      };
    } catch (error: any) {
      // No changes to commit is okay
      if (error.message?.includes('nothing to commit')) {
        // Get current HEAD
        const sha = await this.git.revparse(['HEAD']);
        const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
        
        return {
          changeId,
          sha: sha.trim(),
          branch: branch.trim(),
        };
      }
      
      throw createError(ErrorCodes.GIT_CHECKPOINT_FAILED, error.message);
    }
  }

  /**
   * Rollback to a previous checkpoint
   */
  async rollback(sha: string): Promise<{
    sha: string;
    rolledBackFiles: string[];
    success: boolean;
  }> {
    try {
      // Get list of files that will change
      const diff = await this.git.diff(['--name-only', sha]);

      // Reset to the checkpoint
      await this.git.reset(['--hard', sha]);

      const rolledBackFiles = diff.split('\n').filter(Boolean);

      return {
        sha,
        rolledBackFiles,
        success: true,
      };
    } catch (error: any) {
      throw createError(ErrorCodes.GIT_ROLLBACK_FAILED, error.message);
    }
  }

  /**
   * Get current status
   */
  async status(): Promise<{
    isRepo: boolean;
    branch?: string;
    clean?: boolean;
    ahead?: number;
    behind?: number;
  }> {
    const isRepo = await this.isRepo();
    
    if (!isRepo) {
      return { isRepo: false };
    }

    const status = await this.git.status();
    
    return {
      isRepo: true,
      branch: status.current || undefined,
      clean: status.isClean(),
      ahead: status.ahead,
      behind: status.behind,
    };
  }
}
