import useSWR from 'swr';

export function useRunDetail(runId: string) {
  const { data, error, isLoading } = useSWR(runId ? `/api/automation/runs/${runId}` : null, async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch run detail');
    return res.json();
  });
  return {
    run: data ?? null,
    isLoading,
    isError: !!error,
  };
}
