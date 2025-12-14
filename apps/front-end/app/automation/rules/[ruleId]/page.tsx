
import { useParams } from 'next/navigation';
import { useRuleDetail } from './useRuleDetail';
import { useGovernanceActions } from './useGovernanceActions';
import { useState } from 'react';

export default function RuleDetailPage() {
  const params = useParams();
  const ruleId = typeof params?.ruleId === 'string' ? params.ruleId : Array.isArray(params?.ruleId) ? params.ruleId[0] : '';
  const { rule, isLoading, isError } = useRuleDetail(ruleId);
  const [modal, setModal] = useState<null | { action: string; reason: string; details: string }>(null);

  function showModal(action: string, v: any) {
    let reason = '';
    let details = '';
    if (action === 'approve') {
      if (v.state !== 'REVIEW') {
        reason = 'Blocked: Rule must be in REVIEW state.';
        details = 'Only rules in REVIEW state can be approved.';
      } else {
        reason = 'Blocked: Approval rights or policy required.';
        details = 'You do not have permission or policy check failed.';
      }
    } else if (action === 'pause') {
      if (v.state !== 'ACTIVE') {
        reason = 'Blocked: Rule must be ACTIVE.';
        details = 'Only ACTIVE rules can be paused.';
      } else {
        reason = 'Blocked: Pause rights or policy required.';
        details = 'You do not have permission or policy check failed.';
      }
    } else if (action === 'archive') {
      if (v.state !== 'ACTIVE' && v.state !== 'PAUSED') {
        reason = 'Blocked: Rule must be ACTIVE or PAUSED.';
        details = 'Only ACTIVE or PAUSED rules can be archived.';
      } else {
        reason = 'Blocked: Archive rights or policy required.';
        details = 'You do not have permission or policy check failed.';
      }
    }
    setModal({ action, reason, details });
  }

  return (
    <div>
      <h2>Rule Detail (Read-only)</h2>
      {isLoading && <div>Loading...</div>}
      {isError && <div>Error loading rule detail.</div>}
      {!isLoading && !isError && !rule && <div>Rule not found.</div>}
      {!isLoading && !isError && rule && (
        <>
          {/* --- Governance Summary Panel --- */}
          <section style={{
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            background: '#fafbfc',
            maxWidth: 480
          }}>
            <h3 style={{ marginTop: 0 }}>Governance Summary</h3>
            <div><strong>Name:</strong> {rule.name}</div>
            <div><strong>Current State:</strong> {rule.state}</div>
            <div><strong>Current Version:</strong> {rule.versions?.[0]?.versionNumber ?? '—'}</div>
            <div><strong>Last Approved By:</strong> {/* TODO: wire real data */}System Admin</div>
            <div><strong>Last Run:</strong> {/* TODO: wire real data */}2025-12-12 14:00</div>
            <div>
              <strong>Policy Status:</strong>{' '}
              {/* TODO: wire real policy status */}
              <span style={{ color: '#2ecc40', fontWeight: 600 }}>✅ Compliant</span>
            </div>
          </section>
          <section>
            <h3>Versions</h3>
            {rule.versions && rule.versions.length > 0 ? (
              <ul>
                {rule.versions.map((v: any) => {
                  const actions = useGovernanceActions(rule.id, v.id);
                  return (
                    <li key={v.id}>
                      Version {v.versionNumber} — {v.state} (Created: {v.createdAt})
                      <div style={{ marginTop: 4 }}>
                        <button
                          disabled
                          onClick={() => showModal('approve', v)}
                          title={
                            v.state !== 'REVIEW'
                              ? 'Rule must be in REVIEW state to approve.'
                              : 'Requires approval rights or policy check.'
                          }
                          style={{ opacity: 0.7 }}
                        >
                          {actions.loading === 'approve' ? 'Approving...' : 'Approve'}
                        </button>
                        <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                          {v.state !== 'REVIEW'
                            ? 'Disabled: Not in REVIEW state'
                            : 'Disabled: Approval rights or policy required'}
                        </span>{' '}
                        <button
                          disabled
                          onClick={() => showModal('pause', v)}
                          title={
                            v.state !== 'ACTIVE'
                              ? 'Rule must be ACTIVE to pause.'
                              : 'Requires pause rights or policy check.'
                          }
                          style={{ opacity: 0.7 }}
                        >
                          {actions.loading === 'pause' ? 'Pausing...' : 'Pause'}
                        </button>
                        <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                          {v.state !== 'ACTIVE'
                            ? 'Disabled: Not in ACTIVE state'
                            : 'Disabled: Pause rights or policy required'}
                        </span>{' '}
                        <button
                          disabled
                          onClick={() => showModal('archive', v)}
                          title={
                            v.state !== 'ACTIVE' && v.state !== 'PAUSED'
                              ? 'Rule must be ACTIVE or PAUSED to archive.'
                              : 'Requires archive rights or policy check.'
                          }
                          style={{ opacity: 0.7 }}
                        >
                          {actions.loading === 'archive' ? 'Archiving...' : 'Archive'}
                        </button>
                        <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
                          {v.state !== 'ACTIVE' && v.state !== 'PAUSED'
                            ? 'Disabled: Not in ACTIVE/PAUSED state'
                            : 'Disabled: Archive rights or policy required'}
                        </span>
                      </div>
                      <div style={{ color: 'red', fontSize: 12 }}>
                        {actions.error && <span>{actions.error}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div>No versions found.</div>
            )}
          </section>

          {/* --- Version Diff View (Read-only) --- */}
          <section style={{ marginTop: 32 }}>
            <h3>Version Diff (ACTIVE vs REVIEW)</h3>
            {(() => {
              const active = rule.versions?.find((v: any) => v.state === 'ACTIVE');
              const review = rule.versions?.find((v: any) => v.state === 'REVIEW' || v.state === 'DRAFT');
              if (!active || !review) return <div>No diff available (need ACTIVE and REVIEW/DRAFT versions).</div>;
              // For demo: mock fields to diff
              const fields = [
                { label: 'Conditions', key: 'conditions', active: active.conditions ?? 'A', review: review.conditions ?? 'B' },
                { label: 'Actions', key: 'actions', active: active.actions ?? 'Send Email', review: review.actions ?? 'Send Email + Log' },
                { label: 'Trigger', key: 'trigger', active: active.trigger ?? 'On Signup', review: review.trigger ?? 'On Signup' },
              ];
              return (
                <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Field</th>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>ACTIVE</th>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>REVIEW/DRAFT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f.key} style={{ background: f.active !== f.review ? '#fffbe6' : undefined }}>
                        <td style={{ fontWeight: 500 }}>{f.label}</td>
                        <td>{f.active}</td>
                        <td>{f.review}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </section>

          {/* --- Confirmation Modal (Mock) --- */}
          {modal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.25)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                padding: 32,
                minWidth: 320,
                maxWidth: 400,
              }}>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Action: {modal.action.charAt(0).toUpperCase() + modal.action.slice(1)}</h3>
                <div style={{ color: '#d9534f', fontWeight: 600, marginBottom: 8 }}>{modal.reason}</div>
                <div style={{ color: '#555', marginBottom: 16 }}>{modal.details}</div>
                <button onClick={() => setModal(null)} style={{ marginTop: 8 }}>Close</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
