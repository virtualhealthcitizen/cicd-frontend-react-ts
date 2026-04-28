import { useEffect } from 'react';
import { useGitHubStore }  from '../state/usegithubstore';
import { useRunsStore }    from '../state/useRunsStore';
import { PAGE_SIZE_OPTIONS } from '../types/runs';
import type { EnrichedRun, RunConclusion, RunStatus, RunConclusionFilter, PageSize } from '../types/runs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeSince(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ── Status badge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status:     RunStatus;
  conclusion: RunConclusion;
}

function StatusBadge({ status, conclusion }: StatusBadgeProps) {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting' || status === 'pending') {
    return (
      <span className="run-status-badge run-status-progress">
        <span className="run-status-dot run-status-dot-progress" />
        {status === 'in_progress' ? 'Running' : status.replace('_', ' ')}
      </span>
    );
  }

  const clsMap: Record<NonNullable<RunConclusion>, string> = {
    success:         'run-status-success',
    failure:         'run-status-failure',
    cancelled:       'run-status-cancelled',
    skipped:         'run-status-skipped',
    timed_out:       'run-status-failure',
    action_required: 'run-status-warning',
    neutral:         'run-status-neutral',
    stale:           'run-status-neutral',
  };
  const lblMap: Record<NonNullable<RunConclusion>, string> = {
    success:         'Success',
    failure:         'Failed',
    cancelled:       'Cancelled',
    skipped:         'Skipped',
    timed_out:       'Timed out',
    action_required: 'Action required',
    neutral:         'Neutral',
    stale:           'Stale',
  };

  const cls = conclusion ? clsMap[conclusion] : 'run-status-neutral';
  const lbl = conclusion ? lblMap[conclusion] : 'Completed';

  return <span className={`run-status-badge ${cls}`}>{lbl}</span>;
}

// ── Table row ─────────────────────────────────────────────────────────────────

function RunRow({ run }: { run: EnrichedRun }) {
  return (
    <tr className="runs-table-row">
      <td className="runs-td runs-td-status">
        <StatusBadge status={run.status} conclusion={run.conclusion} />
      </td>
      <td className="runs-td runs-td-name">
        <a
          href={run.html_url}
          target="_blank"
          rel="noreferrer"
          className="runs-name-link"
          title={run.display_title}
        >
          {run.display_title || run.name || '—'}
        </a>
        <span className="runs-event-tag">{run.event}</span>
      </td>
      <td className="runs-td runs-td-repo">
        <span className="runs-repo-label">{run.repoKey}</span>
      </td>
      <td className="runs-td runs-td-branch">
        {run.head_branch && (
          <span className="runs-branch-label">{run.head_branch}</span>
        )}
      </td>
      <td className="runs-td runs-td-sha">
        <span className="runs-sha">{shortSha(run.head_sha)}</span>
      </td>
      <td className="runs-td runs-td-actor">
        <span className="runs-actor">
          <img
            src={run.actor?.avatar_url}
            alt={run.actor?.login}
            className="runs-avatar"
          />
          {run.actor?.login}
        </span>
      </td>
      <td className="runs-td runs-td-age" title={formatDate(run.created_at)}>
        {timeSince(run.created_at)}
      </td>
    </tr>
  );
}

// ── Pager ─────────────────────────────────────────────────────────────────────

interface PagerProps {
  page:           number;
  totalPages:     number;
  totalCount:     number;
  pageSize:       PageSize;
  loading:        boolean;
  showPageNav:    boolean;
  onPrev:         () => void;
  onNext:         () => void;
  onPageSize:     (size: PageSize) => void;
}

function Pager({ page, totalPages, totalCount, pageSize, loading, showPageNav, onPrev, onNext, onPageSize }: PagerProps) {
  return (
    <div className="runs-pager">
      <div className="runs-pager-left">
        <span className="runs-pager-label">Rows per page</span>
        <select
          className="runs-pagesize-select"
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value) as PageSize)}
          disabled={loading}
        >
          {PAGE_SIZE_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {showPageNav && (
        <div className="runs-pager-right">
          <span className="runs-pager-info">
            Page {page} of {totalPages}
            <span className="runs-pager-total"> ({totalCount.toLocaleString()} total)</span>
          </span>
          <button
            type="button"
            className="btn runs-pager-btn"
            onClick={onPrev}
            disabled={page <= 1 || loading}
            aria-label="Previous page"
          >
            &#8592;
          </button>
          <button
            type="button"
            className="btn runs-pager-btn"
            onClick={onNext}
            disabled={page >= totalPages || loading}
            aria-label="Next page"
          >
            &#8594;
          </button>
        </div>
      )}

      {!showPageNav && (
        <div className="runs-pager-right">
          <span className="runs-pager-info">
            <span className="runs-pager-total">{totalCount.toLocaleString()} total across all repos</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Status filter options ─────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',             label: 'All statuses'    },
  { value: 'in_progress',     label: 'Running'         },
  { value: 'queued',          label: 'Queued'          },
  { value: 'success',         label: 'Success'         },
  { value: 'failure',         label: 'Failed'          },
  { value: 'cancelled',       label: 'Cancelled'       },
  { value: 'timed_out',       label: 'Timed out'       },
  { value: 'action_required', label: 'Action required' },
  { value: 'skipped',         label: 'Skipped'         },
];

// ── WorkflowRuns ──────────────────────────────────────────────────────────────

export default function WorkflowRuns() {
  const repos = useGitHubStore(s => s.repos);
  const token = useGitHubStore(s => s.token);

  const loadPage        = useRunsStore(s => s.loadPage);
  const fetchState      = useRunsStore(s => s.fetchState);
  const fetchError      = useRunsStore(s => s.fetchError);
  const lastFetched     = useRunsStore(s => s.lastFetched);
  const allRuns         = useRunsStore(s => s.runs);
  const page            = useRunsStore(s => s.page);
  const pageSize        = useRunsStore(s => s.pageSize);
  const totalCount      = useRunsStore(s => s.totalCount);
  const search          = useRunsStore(s => s.search);
  const statusFilter    = useRunsStore(s => s.statusFilter);
  const repoFilter      = useRunsStore(s => s.repoFilter);
  const setSearch       = useRunsStore(s => s.setSearch);
  const setStatusFilter = useRunsStore(s => s.setStatusFilter);
  const setRepoFilter   = useRunsStore(s => s.setRepoFilter);
  const clearRuns       = useRunsStore(s => s.clearRuns);
  const getFilteredRuns = useRunsStore(s => s.getFilteredRuns);
  const getTotalPages   = useRunsStore(s => s.totalPages);

  const connectedRepos = [...repos.entries()]
    .filter(([, r]) => r.status === 'ok')
    .map(([key]) => key);

  const reposCacheKey = connectedRepos.join(',');
  const isLoading     = fetchState === 'loading';
  const totalPages    = getTotalPages();

  // Fetch on mount / when connected repos change — always starts at page 1
  useEffect(() => {
    if (connectedRepos.length > 0) loadPage(connectedRepos, token, 1, pageSize);
    else clearRuns();
  }, [reposCacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 s while active runs exist on the current page
  const hasActive = allRuns.some(r => r.status === 'in_progress' || r.status === 'queued');
  useEffect(() => {
    if (!hasActive || connectedRepos.length === 0) return;
    const id = setInterval(
      () => loadPage(connectedRepos, token, page, pageSize),
      30_000,
    );
    return () => clearInterval(id);
  }, [hasActive, reposCacheKey, token, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh  = () => loadPage(connectedRepos, token, 1, pageSize);
  const handlePrev     = () => loadPage(connectedRepos, token, Math.max(1, page - 1), pageSize);
  const handleNext     = () => loadPage(connectedRepos, token, Math.min(totalPages, page + 1), pageSize);
  const handlePageSize = (size: PageSize) => loadPage(connectedRepos, token, 1, size);

  const filteredRuns = getFilteredRuns();

  return (
    <div className="section">
      <span className="badge badge-coral">Runs</span>
      <h2 className="section-title">Workflow runs</h2>

      {/* Toolbar */}
      <div className="runs-toolbar">
        <input
          type="text"
          className="runs-search"
          placeholder="Search by name, branch, actor, SHA…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="runs-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as RunStatus | RunConclusionFilter | 'all')}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="runs-filter-select"
          value={repoFilter}
          onChange={e => setRepoFilter(e.target.value)}
        >
          <option value="all">All repos</option>
          {connectedRepos.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={handleRefresh}
          disabled={isLoading || connectedRepos.length === 0}
        >
          {isLoading
            ? <><span className="loader" style={{ width: 11, height: 11, borderWidth: 1.5 }} /> Refreshing…</>
            : 'Refresh'}
        </button>
        {lastFetched && !isLoading && (
          <span className="runs-last-fetched">
            Updated {timeSince(lastFetched.toISOString())}
          </span>
        )}
      </div>

      {/* Error */}
      {fetchState === 'error' && (
        <div className="result-box error" style={{ marginTop: 10 }}>
          {fetchError}
        </div>
      )}

      {/* Empty states */}
      {connectedRepos.length === 0 && (
        <div className="runs-empty">Connect to a repository to view workflow runs.</div>
      )}
      {connectedRepos.length > 0 && !isLoading && fetchState !== 'error' && allRuns.length === 0 && (
        <div className="runs-empty">No workflow runs found.</div>
      )}
      {connectedRepos.length > 0 && !isLoading && filteredRuns.length === 0 && allRuns.length > 0 && (
        <div className="runs-empty">No runs match the current filters.</div>
      )}

      {/* Table */}
      {filteredRuns.length > 0 && (
        <div className="runs-table-wrap">
          <table className="runs-table">
            <thead>
            <tr>
              <th className="runs-th">Status</th>
              <th className="runs-th">Name / title</th>
              <th className="runs-th">Repo</th>
              <th className="runs-th">Branch</th>
              <th className="runs-th">SHA</th>
              <th className="runs-th">Actor</th>
              <th className="runs-th">Age</th>
            </tr>
            </thead>
            <tbody>
            {filteredRuns.map(r => (
              <RunRow key={`${r.repoKey}-${r.id}`} run={r} />
            ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pager — shown whenever we have data or are loading */}
      {(allRuns.length > 0 || isLoading) && connectedRepos.length > 0 && (
        <Pager
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          loading={isLoading}
          showPageNav={connectedRepos.length === 1}
          onPrev={handlePrev}
          onNext={handleNext}
          onPageSize={handlePageSize}
        />
      )}

      {/* Live indicator */}
      {hasActive && (
        <div className="runs-footer">
          <span className="runs-live-badge">● Live — refreshing every 30s</span>
        </div>
      )}
    </div>
  );
}
