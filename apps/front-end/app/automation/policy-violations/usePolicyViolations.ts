import useSWR from 'swr';

export function usePolicyViolations() {
  const { data, error, isLoading } = useSWR('/api/automation/policy-violations', async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch policy violations');
    return res.json();
  });
  return {
    violations: data?.items ?? [],
    isLoading,
    isError: !!error,
  };
}
