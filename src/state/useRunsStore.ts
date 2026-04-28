import { create } from 'zustand';
import type {
  RunsState,
  EnrichedRun,
  WorkflowRun,
  // FetchState,
  RunStatus,
  // RunConclusion,
  RunConclusionFilter,
  // PageSize,
} from '../types/runs';
// import type { RepoKey } from '../types/index';

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization:          `Bearer ${token}`,
    Accept:                 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

interface RepoRunsResult {
  runs:       WorkflowRun[];
  totalCount: number;
}

async function fetchRunsForRepo(
  owner:   string,
  repo:    string,
  token:   string,
  page:    number,
  perPage: number,
): Promise<RepoRunsResult> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=${perPage}&page=${page}`,
    { headers: githubHeaders(token) },
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(d.message ?? `HTTP ${res.status}`);
  }
  const d = await res.json() as { workflow_runs: WorkflowRun[]; total_count: number };
  return {
    runs:       d.workflow_runs ?? [],
    totalCount: d.total_count  ?? 0,
  };
}

export const useRunsStore = create<RunsState>((set, get) => ({
  runs:        [],
  fetchState:  'idle',
  fetchError:  '',
  lastFetched: null,

  // Pagination
  page:       1,
  pageSize:   25,
  totalCount: 0,

  // Filters
  search:       '',
  statusFilter: 'all' as RunStatus | RunConclusionFilter | 'all',
  repoFilter:   'all',

  fetchRuns: async (repoKeys, token, page, pageSize) => {
    // Fall back to current store values if not provided
    const resolvedPage     = page     ?? get().page;
    const resolvedPageSize = pageSize ?? get().pageSize;

    if (repoKeys.length === 0) return;
    set({ fetchState: 'loading', fetchError: '', page: resolvedPage, pageSize: resolvedPageSize });

    try {
      const results = await Promise.all(
        repoKeys.map(async key => {
          const [owner, repo] = key.split('/');
          const { runs, totalCount } = await fetchRunsForRepo(
            owner, repo, token, resolvedPage, resolvedPageSize,
          );
          return {
            runs:       runs.map((r): EnrichedRun => ({ ...r, repoKey: key })),
            totalCount,
          };
        }),
      );

      const allRuns = results
        .flatMap(r => r.runs)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        // The API's per_page applies per-repo, so with N repos we receive up to
        // N * pageSize rows. Slice to pageSize so the displayed count matches
        // the dropdown selection. The sort above ensures we keep the newest runs.
        .slice(0, resolvedPageSize);

      // Sum total counts across repos so the pager reflects the full picture
      const totalCount = results.reduce((sum, r) => sum + r.totalCount, 0);

      set({
        runs:        allRuns,
        totalCount,
        fetchState:  'idle',
        lastFetched: new Date(),
      });
    } catch (e) {
      set({
        fetchState: 'error',
        fetchError: e instanceof Error ? e.message : String(e),
      });
    }
  },

  setPage: (page) => set({ page }),

  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  // Atomically update page + pageSize in state, then fetch — avoids stale closure bugs
  // in the component where doFetch captures an old pageSize from its useCallback deps.
  loadPage: async (repoKeys, token, page, pageSize) => {
    set({ page, pageSize });
    await get().fetchRuns(repoKeys, token, page, pageSize);
  },

  setSearch:       (search)       => set({ search }),
  setStatusFilter: (statusFilter: RunStatus | RunConclusionFilter | 'all') => set({ statusFilter }),
  setRepoFilter:   (repoFilter)   => set({ repoFilter }),

  clearRuns: () => set({
    runs:        [],
    fetchState:  'idle',
    fetchError:  '',
    lastFetched: null,
    page:        1,
    totalCount:  0,
  }),

  // Client-side filter applied on top of the current page of server results
  getFilteredRuns: () => {
    const { runs, search, statusFilter, repoFilter } = get();
    const q = search.trim().toLowerCase();

    return runs.filter(r => {
      if (repoFilter !== 'all' && r.repoKey !== repoFilter) return false;

      if (statusFilter !== 'all') {
        const matchesStatus     = r.status    === statusFilter;
        const matchesConclusion = r.conclusion === statusFilter;
        if (!matchesStatus && !matchesConclusion) return false;
      }

      if (q) {
        const haystack = [
          r.name ?? '',
          r.display_title,
          r.head_branch ?? '',
          r.actor?.login ?? '',
          r.head_sha.slice(0, 7),
          r.event,
          r.repoKey,
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  },

  totalPages: () => {
    const { totalCount, pageSize } = get();
    return Math.max(1, Math.ceil(totalCount / pageSize));
  },
}));
