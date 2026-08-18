import { useState, useEffect, useCallback } from 'react';
import { cache } from '@fivem-ai/shared/cache';

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const cached = cache.get<T>(key);
    if (cached && options.enabled !== false) {
      setData(cached);
      setLastUpdated(Date.now());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cache.set(key, result, options.ttl || 60000);
      setData(result);
      setLastUpdated(Date.now());
      options.onSuccess?.(result);
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, options.enabled, options.ttl, options.onSuccess, options.onError]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options.enabled]);

  const invalidate = useCallback(() => {
    cache.invalidate(key);
    setData(null);
    setLastUpdated(null);
    fetchData();
  }, [key, fetchData]);

  return { data, loading, error, lastUpdated, invalidate, refetch: fetchData };
}
