import { useGitHubStore } from '../state/usegithubstore';
import type { RunResult } from '../index';

// ── Loader ────────────────────────────────────────────────────────────────────

function Loader({ size = 13 }: { size?: number }) {
  return (
    <span
      className="loader"
      aria-label="Loading"
      style={{ width: size, height: size, borderWidth: size < 13 ? 1.5 : 2 }}
    />
  );
}

// ── Run result row ────────────────────────────────────────────────────────────

function RunRow({ result }: { result: RunResult }) {
  const badgeClass =
    result.status === 'dispatched' ? 'run-ok' :
      result.status === 'error'      ? 'run-error' :
        'run-queued';

  return (
    <div className="run-item" id={result.runId}>
      <span className="run-item-name">{result.wf.name}</span>
      <span className="run-item-repo">{result.repoKey}</span>
      <span className={`run-badge ${badgeClass}`}>
        {result.status === 'queued' && <><Loader size={9} /> </>}
        {result.message}
      </span>
    </div>
  );
}

// ── DispatchSection ───────────────────────────────────────────────────────────

export default function DispatchSection() {
  const repos             = useGitHubStore(s => s.repos);
  // Subscribed for reactivity — component must re-render when any of these change
  //@ts-ignore
  const _selectedIds      = useGitHubStore(s => s.selectedIds);   // eslint-disable-line @typescript-eslint/no-unused-vars
  //@ts-ignore
  const _repoWfs          = useGitHubStore(s => s.repoWfs);       // eslint-disable-line @typescript-eslint/no-unused-vars
  //@ts-ignore
  const _gitRef           = useGitHubStore(s => s.gitRef);        // eslint-disable-line @typescript-eslint/no-unused-vars
  //@ts-ignore
  const _params           = useGitHubStore(s => s.params);        // eslint-disable-line @typescript-eslint/no-unused-vars
  const buildPayload      = useGitHubStore(s => s.buildPayload);
  const getSelectedItems  = useGitHubStore(s => s.getSelectedItems);
  const triggerWorkflows  = useGitHubStore(s => s.triggerWorkflows);
  const clearRunResults   = useGitHubStore(s => s.clearRunResults);
  const runResults        = useGitHubStore(s => s.runResults);
  const isDispatching     = useGitHubStore(s => s.isDispatching);

  const selectedItems = getSelectedItems();

  // Build preview text — mirrors buildPayload() but purely for display
  const previewText = (() => {
    if (selectedItems.length === 0) {
      return 'Add repositories and select workflows to preview the request';
    }
    const payload = buildPayload();
    const sep = '\n' + '\u2500'.repeat(44) + '\n\n';
    return selectedItems
      .map(({ repoKey, wf }) =>
        `POST https://api.github.com/repos/${repoKey}/actions/workflows/${wf.file}/dispatches\n` +
        JSON.stringify(payload, null, 2),
      )
      .join(sep);
  })();

  // Progress: how many run results have resolved (not queued)
  const doneCount = runResults.filter(r => r.status !== 'queued').length;
  const progressPct = runResults.length > 0
    ? Math.round((doneCount / runResults.length) * 100)
    : 0;

  const handleTrigger = async () => {
    const anyConnected = [...repos.values()].some(r => r.status === 'ok');
    if (!anyConnected) { alert('Connect to at least one repository first.'); return; }
    if (selectedItems.length === 0) { alert('Select at least one workflow.'); return; }
    await triggerWorkflows();
  };

  const handleClear = () => {
    clearRunResults();
  };

  return (
    <div className="section">
      <span className="badge badge-green">Dispatch</span>
      <h2 className="section-title">Trigger runs</h2>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
        Sends a{' '}
        <code style={{ fontFamily: 'var(--font-mono)' }}>workflow_dispatch</code>{' '}
        event to each selected workflow via the GitHub API.
      </p>

      {/* Request preview */}
      <div className="preview-box">{previewText}</div>

      {/* Action buttons */}
      <div className="row">
        <button
          type="button"
          className="btn btn-success"
          id="trigger-btn"
          disabled={isDispatching}
          onClick={handleTrigger}
        >
          {isDispatching ? <><Loader size={11} /> Triggering…</> : 'Trigger selected'}
        </button>
        <button type="button" className="btn" onClick={handleClear}>
          Clear
        </button>
      </div>

      {/* Progress bar */}
      {runResults.length > 0 && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Run result rows */}
      {runResults.length > 0 && (
        <div className="run-summary">
          {runResults.map(r => (
            <RunRow key={r.runId} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
