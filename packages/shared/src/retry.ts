// Retry logic for failed operations
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential' | 'fixed';
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: () => void;
}

export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  onError: () => {},
  onSuccess: () => {},
};

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    onError,
    onSuccess,
  } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      onSuccess();
      return result;
    } catch (error) {
      lastError = error as Error;
      onError(error as Error, attempt);

      if (attempt < maxAttempts) {
        const waitTime = backoff === 'exponential'
          ? delay * Math.pow(2, attempt - 1)
          : backoff === 'linear'
          ? delay * attempt
          : delay;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
