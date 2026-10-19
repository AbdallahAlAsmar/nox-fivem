import { useState, useCallback } from 'react';
import { retry, type RetryOptions } from '@fivem-ai/shared/retry';

export function useRetry(options: RetryOptions = {}) {
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    setAttempt(prev => prev + 1);
    try {
      const result = await retry(operation, {
        ...options,
        onError: (error, attempt) => {
          setLastError(error);
          options.onError?.(error, attempt);
        },
        onSuccess: () => {
          setLastError(null);
          options.onSuccess?.();
        },
      });
      return result;
    } catch (error) {
      setLastError(error as Error);
      throw error;
    }
  }, [options]);

  return { retryOperation, attempt, lastError };
}
