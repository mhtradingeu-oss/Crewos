import useSWR from 'swr';

export function useRules() {
  const { data, error, isLoading } = useSWR('/api/automation/rules', async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch rules');
    return res.json();
  });
  return {
    rules: data?.items ?? [],
    isLoading,
    isError: !!error,
  };
}
