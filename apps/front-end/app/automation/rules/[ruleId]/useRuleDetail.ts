import useSWR from 'swr';

export function useRuleDetail(ruleId: string) {
  const { data, error, isLoading } = useSWR(ruleId ? `/api/automation/rules/${ruleId}` : null, async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch rule detail');
    return res.json();
  });
  return {
    rule: data ?? null,
    isLoading,
    isError: !!error,
  };
}
