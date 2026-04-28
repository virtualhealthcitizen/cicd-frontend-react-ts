import type { RepoKey } from '../index';

// ── GitHub API shapes ─────────────────────────────────────────────────────────

export type RunStatus     = 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
export type RunConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'neutral' | 'stale' | null;

/** RunConclusion without null — safe to use as a select value or filter key */
export type RunConclusionFilter = NonNullable<RunConclusion>;

export interface WorkflowRun {
  id:           number;
  name:         string | null;
  /** The workflow filename, e.g. "ci.yml" */
  path:         string;
  display_title: string;
  status:       RunStatus;
  conclusion:   RunConclusion;
  html_url:     string;
  run_number:   number;
  created_at:   string;
  updated_at:   string;
  head_branch:  string | null;
  head_sha:     string;
  event:        string;
  actor: {
    login:      string;
    avatar_url: string;
  };
}

// ── Enriched run (includes which repo it came from) ───────────────────────────

export interface EnrichedRun extends WorkflowRun {
  repoKey: RepoKey;
}

// ── Store shape ───────────────────────────────────────────────────────────────

export type FetchState = 'idle' | 'loading' | 'error';

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

export interface RunsState {
  runs:        EnrichedRun[];
  fetchState:  FetchState;
  fetchError:  string;
  lastFetched: Date | null;

  // Pagination
  page:        number;
  pageSize:    PageSize;
  totalCount:  number;

  // Filter state
  search:       string;
  statusFilter: RunStatus | RunConclusionFilter | 'all';
  repoFilter:   RepoKey | 'all';

  // Actions
  fetchRuns:       (repoKeys: RepoKey[], token: string, page?: number, pageSize?: PageSize) => Promise<void>;
  loadPage:        (repoKeys: RepoKey[], token: string, page: number, pageSize: PageSize) => Promise<void>;
  setPage:         (page: number) => void;
  setPageSize:     (size: PageSize) => void;
  setSearch:       (q: string) => void;
  setStatusFilter: (f: RunStatus | RunConclusionFilter | 'all') => void;
  setRepoFilter:   (r: RepoKey | 'all') => void;
  clearRuns:       () => void;
  getFilteredRuns: () => EnrichedRun[];
  totalPages:      () => number;
}
