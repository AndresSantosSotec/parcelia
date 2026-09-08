import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface UseApiQueryResult<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useApiQuery<T>(
    endpoint: string,
    params?: Record<string, string>
): UseApiQueryResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const paramsRef = useRef(params);
    paramsRef.current = params;

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        const qs = paramsRef.current
            ? '?' + new URLSearchParams(paramsRef.current).toString()
            : '';

        (api.get(`${endpoint}${qs}`) as Promise<T>)
            .then((res) => {
                if (!cancelled) {
                    setData(res as T);
                    setIsLoading(false);
                }
            })
            .catch((err: any) => {
                if (!cancelled) {
                    setError(err?.message ?? 'Error al cargar datos');
                    setIsLoading(false);
                }
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, tick, JSON.stringify(params)]);

    const refetch = () => setTick((t) => t + 1);

    return { data, isLoading, error, refetch };
}
