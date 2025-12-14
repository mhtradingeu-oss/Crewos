import useSWR from 'swr';

export function useAuditLog() {
  const { data, error, isLoading } = useSWR('/api/automation/audit-log', async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch audit log');
    return res.json();
  });
  return {
    auditLog: data?.items ?? [],
    isLoading,
    isError: !!error,
  };
}
