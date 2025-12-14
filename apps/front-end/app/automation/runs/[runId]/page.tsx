import { useParams } from 'next/navigation';
import { useRunDetail } from './useRunDetail';

export default function RunDetailPage() {
  const params = useParams();
  const runId = typeof params?.runId === 'string' ? params.runId : Array.isArray(params?.runId) ? params.runId[0] : '';
  const { run, isLoading, isError } = useRunDetail(runId);

  return (
    <div>
      <h2>Run Detail</h2>
      {isLoading && <div>Loading...</div>}
      {isError && <div>Error loading run detail.</div>}
      {!isLoading && !isError && !run && <div>Run not found.</div>}
      {!isLoading && !isError && run && (
        <>
          <div>
            <strong>ID:</strong> {run.id}<br />
            <strong>Status:</strong> {run.status}<br />
            <strong>Started:</strong> {run.startedAt}<br />
            <strong>Finished:</strong> {run.finishedAt}
          </div>
          <section>
            <h3>Action Runs</h3>
            {run.actionRuns && run.actionRuns.length > 0 ? (
              <ul>
                {run.actionRuns.map((ar: any) => (
                  <li key={ar.id}>
                    {ar.actionType} — {ar.status} (Started: {ar.startedAt})
                  </li>
                ))}
              </ul>
            ) : (
              <div>No action runs found.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
