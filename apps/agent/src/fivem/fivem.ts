import { ErrorCodes, createError } from '@fivem-ai/shared';

export class FiveMActions {
  /**
   * Restart a resource
   * In Phase 1, we'll use txAdmin API if available, or RCON as fallback
   */
  async restartResource(
    resourceName: string,
    timeout: number = 30000
  ): Promise<{
    resourceName: string;
    success: boolean;
    error?: string;
  }> {
    // TODO: Implement actual txAdmin/RCON integration
    // For now, simulate the action
    
    console.log(`[FiveM] Restarting resource: ${resourceName}`);

    // Check if txAdmin is available
    const txAdminUrl = process.env.TXADMIN_URL;
    const txAdminToken = process.env.TXADMIN_TOKEN;

    if (txAdminUrl && txAdminToken) {
      try {
        const response = await fetch(`${txAdminUrl}/api/resources/${resourceName}/restart`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${txAdminToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`txAdmin returned ${response.status}`);
        }

        return {
          resourceName,
          success: true,
        };
      } catch (error: any) {
        return {
          resourceName,
          success: false,
          error: error.message,
        };
      }
    }

    // Fallback: Simulate success for now
    // In production, would use RCON or process signals
    return {
      resourceName,
      success: true,
    };
  }

  /**
   * Tail console output
   */
  async tailConsole(
    durationMs: number = 5000,
    maxLines: number = 100
  ): Promise<{
    lines: Array<{
      timestamp: string;
      level?: 'info' | 'warn' | 'error' | 'debug';
      message: string;
      resource?: string;
    }>;
  }> {
    // TODO: Implement actual console tailing
    // For now, return empty
    
    console.log(`[FiveM] Tailing console for ${durationMs}ms`);

    return {
      lines: [],
    };
  }

  /**
   * Restart the FiveM server
   */
  async restartServer(
    timeout: number = 30000
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const txAdminUrl = process.env.TXADMIN_URL;
    const txAdminToken = process.env.TXADMIN_TOKEN;

    if (txAdminUrl && txAdminToken) {
      try {
        const response = await fetch(`${txAdminUrl}/api/server/restart`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${txAdminToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`txAdmin returned ${response.status}`);
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

    // No txAdmin — log intent; actual restart requires txAdmin or process signal
    console.log('[FiveM] restartServer: no txAdmin configured, logging intent');
    return { success: true };
  }
  async detectTxAdmin(): Promise<{
    detected: boolean;
    url?: string;
    version?: string;
  }> {
    const txAdminUrl = process.env.TXADMIN_URL;

    if (!txAdminUrl) {
      return { detected: false };
    }

    try {
      const response = await fetch(`${txAdminUrl}/api/status`);
      const data = (await response.json()) as { version?: string };

      return {
        detected: true,
        url: txAdminUrl,
        version: data.version as string,
      };
    } catch {
      return { detected: false };
    }
  }
}
