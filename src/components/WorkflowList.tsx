import { useGitHubStore } from '../state/usegithubstore';
import { isWorkflowError } from '../index';
import type { RepoKey, Workflow } from '../index';

// ── Checkbox SVG tick ─────────────────────────────────────────────────────────

function CheckTick() {
  return (
    <svg
      className="wf-checkbox-tick"
      width="9"
      height="7"
      viewBox="0 0 9 7"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="1,3.5 3.5,6 8,1"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Individual workflow row ────────────────────────────────────────────────────

interface WorkflowRowProps {
  repoKey:  RepoKey;
  wf:       Workflow;
  selected: boolean;
  onToggle: (repoKey: RepoKey, wfId: number) => void;
}

function WorkflowRow({ repoKey, wf, selected, onToggle }: WorkflowRowProps) {
  const dotClass =
    wf.state === 'active'             ? 'wf-dot-active' :
      wf.state === 'disabled_manually'  ? 'wf-dot-disabled' :
        'wf-dot-error';

  return (
    <div
      className={`wf-item${selected ? ' selected' : ''}`}
      onClick={() => onToggle(repoKey, wf.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onToggle(repoKey, wf.id); }}
    >
      <div className="wf-checkbox">
        {selected && <CheckTick />}
      </div>
      <span className={`wf-dot ${dotClass}`} />
      <span className="wf-name">{wf.name}</span>
      <span className="wf-file">{wf.file}</span>
    </div>
  );
}

// ── Loader spinner ────────────────────────────────────────────────────────────

// @ts-ignore
function Loader() {
  return <span className="loader" aria-label="Loading" />;
}

// ── WorkflowList ──────────────────────────────────────────────────────────────

export default function WorkflowList() {
  const repos         = useGitHubStore(s => s.repos);
  const repoWfs       = useGitHubStore(s => s.repoWfs);
  const selectedIds   = useGitHubStore(s => s.selectedIds);
  const toggleWorkflow   = useGitHubStore(s => s.toggleWorkflow);
  const selectAll        = useGitHubStore(s => s.selectAll);
  const deselectAll      = useGitHubStore(s => s.deselectAll);
  const fetchAllWorkflows = useGitHubStore(s => s.fetchAllWorkflows);
  const getSelectedItems  = useGitHubStore(s => s.getSelectedItems);

  const totalWfs = [...repoWfs.values()].reduce(
    (sum, g) => sum + (Array.isArray(g) ? g.length : 0), 0,
  );
  const connectedCount = [...repos.values()].filter(r => r.status === 'ok').length;

  const countLabel = repoWfs.size === 0
    ? 'No workflows loaded'
    : `${totalWfs} workflow${totalWfs !== 1 ? 's' : ''} across ${connectedCount} repo${connectedCount !== 1 ? 's' : ''}`;

  const selectedItems = getSelectedItems();

  return (
    <div className="section">
      <span className="badge badge-teal">Workflows</span>
      <h2 className="section-title">Select workflows</h2>

      {/* List header */}
      <div className="workflow-list-header">
        <span className="workflow-list-header-left">{countLabel}</span>
        <div className="workflow-list-header-right">
          <button type="button" className="btn" onClick={selectAll}>Select all</button>
          <button type="button" className="btn" onClick={deselectAll}>Clear</button>
          <button type="button" className="btn btn-primary" onClick={fetchAllWorkflows}>
            Refresh
          </button>
        </div>
      </div>

      {/* Workflow rows */}
      <div className="workflow-list" role="group" aria-label="Workflow selection">
        {repoWfs.size === 0 ? (
          <div className="workflow-empty">
            Add repositories and connect to load workflows
          </div>
        ) : (
          [...repoWfs.entries()].map(([key, group]) => {
            const repo = repos.get(key);
            const displayName = repo?.fullName ?? key;

            if (isWorkflowError(group)) {
              return (
                <div key={key}>
                  <div className="wf-group-header">
                    <span className="wf-group-dot wf-group-dot-error" />
                    {key}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--error-fg)' }}>
                      Error: {group.error}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={key}>
                <div className="wf-group-header">
                  <span className="wf-group-dot wf-group-dot-ok" />
                  {displayName}{' '}
                  <span style={{ fontWeight: 400, opacity: 0.6 }}>({group.length})</span>
                </div>

                {group.length === 0 ? (
                  <div className="workflow-empty" style={{ padding: '8px 0 4px' }}>
                    No workflows in this repository
                  </div>
                ) : (
                  group.map(wf => (
                    <WorkflowRow
                      key={wf.id}
                      repoKey={key}
                      wf={wf}
                      selected={selectedIds.has(`${key}::${wf.id}`)}
                      onToggle={toggleWorkflow}
                    />
                  ))
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Selected pills */}
      {selectedItems.length > 0 && (
        <div className="selected-pills">
          {selectedItems.map(({ repoKey, wf }) => (
            <span
              key={`${repoKey}::${wf.id}`}
              className="pill"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {repoKey.split('/')[1]}/{wf.file}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
