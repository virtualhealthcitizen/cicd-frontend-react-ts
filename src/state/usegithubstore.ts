import { create } from 'zustand';

import { isWorkflowError, } from '../index';
import type {
  Repo,
  RepoKey,
  Workflow,
  WorkflowGroup,
  WorkflowParam,
  DispatchPayload,
  DispatchMode,
  RefType,
  RunResult,
  RunStatus,
  SelectedItem,
  SelectionId,
} from '../index';


// ── GitHub API helpers ────────────────────────────────────────────────────────

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization:          `Bearer ${token}`,
    Accept:                 'application/vnd.github+json',
    'Content-Type':         'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function fetchAllWorkflowsForRepo(
  owner: string,
  repo:  string,
  token: string,
): Promise<Workflow[]> {
  const all: Workflow[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows?per_page=100&page=${page}`,
      { headers: githubHeaders(token) },
    );

    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(d.message ?? `HTTP ${res.status}`);
    }

    const d = await res.json() as { workflows?: Workflow[] };
    const batch = (d.workflows ?? []).map(w => ({
      id:    w.id,
      name:  w.name,
      path:  w.path,
      file:  w.path.split('/').pop() ?? w.path,
      state: w.state,
    }));

    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return all;
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface GitHubState {
  // Auth
  token:       string;
  tokenVisible: boolean;
  repos:       Map<RepoKey, Repo>;

  // Workflows
  repoWfs:     Map<RepoKey, WorkflowGroup>;
  selectedIds: Set<SelectionId>;

  // Trigger config
  gitRef:      string;
  refType:     RefType;
  dispatchMode: DispatchMode;

  // Workflow inputs
  params:      WorkflowParam[];
  nextParamId: number;

  // Run results
  runResults:  RunResult[];
  isDispatching: boolean;

  // Auth actions
  setToken:            (token: string) => void;
  toggleTokenVisible:  () => void;
  addRepo:             (raw: string) => string | null; // returns error string or null
  removeRepo:          (key: RepoKey) => void;
  connectAll:          () => Promise<{ errors: string[] }>;
  clearAuth:           () => void;

  // Workflow actions
  fetchAllWorkflows:   () => Promise<void>;
  clearWorkflows:      () => void;
  toggleWorkflow:      (repoKey: RepoKey, wfId: number) => void;
  selectAll:           () => void;
  deselectAll:         () => void;
  getSelectedItems:    () => SelectedItem[];

  // Config actions
  setGitRef:           (ref: string) => void;
  setRefType:          (type: RefType) => void;
  setDispatchMode:     (mode: DispatchMode) => void;

  // Param actions
  addParam:            () => void;
  removeParam:         (id: string) => void;
  updateParam:         (id: string, field: 'key' | 'value', value: string) => void;
  clearParams:         () => void;
  buildPayload:        () => DispatchPayload;

  // Dispatch actions
  triggerWorkflows:    () => Promise<void>;
  clearRunResults:     () => void;
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useGitHubStore = create<GitHubState>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────────
  token:         '',
  tokenVisible:  false,
  repos:         new Map(),
  repoWfs:       new Map(),
  selectedIds:   new Set(),
  gitRef:        'main',
  refType:       'branch',
  dispatchMode:  'sequential',
  params:        [],
  nextParamId:   0,
  runResults:    [],
  isDispatching: false,

  // ── Auth ────────────────────────────────────────────────────────────────────

  setToken: (token: any) => {
    const repos = new Map(get().repos);
    let changed = false;
    for (const [key, r] of repos) {
      if (r.status === 'ok' || r.status === 'error') {
        repos.set(key, { ...r, status: 'pending' as const });
        changed = true;
      }
    }
    set({ token, ...(changed ? { repos } : {}) });
  },

  toggleTokenVisible: () => set(s => ({ tokenVisible: !s.tokenVisible })),

  addRepo: (raw: any) => {
    const slug  = raw.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
    const parts = slug.split('/').filter(Boolean);

    if (parts.length < 2) return 'Use owner/repo format';

    const [owner, repo] = parts;
    const key: RepoKey  = `${owner}/${repo}`;

    if (get().repos.has(key)) return `${key} already added`;

    const repos = new Map(get().repos);
    repos.set(key, { owner, repo, status: 'pending', fullName: key, error: null });
    set({ repos });
    return null;
  },

  removeRepo: (key: any) => {
    const repos     = new Map(get().repos);
    const repoWfs   = new Map(get().repoWfs);
    const selected  = new Set(get().selectedIds);

    repos.delete(key);
    repoWfs.delete(key);
    for (const sid of selected) {
      if (sid.startsWith(`${key}::`)) selected.delete(sid);
    }

    set({ repos, repoWfs, selectedIds: selected });
  },

  connectAll: async () => {
    const { token, repos: currentRepos } = get();
    const errors: string[] = [];
    const repos = new Map(currentRepos);

    await Promise.all([...repos.keys()].map(async (key) => {
      const r = repos.get(key)!;
      try {
        const res  = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`,
          { headers: githubHeaders(token) },
        );
        const data = await res.json() as { full_name?: string; message?: string };

        if (res.ok) {
          repos.set(key, { ...r, status: 'ok', fullName: data.full_name ?? key });
        } else {
          const msg = data.message ?? `HTTP ${res.status}`;
          repos.set(key, { ...r, status: 'error', error: msg });
          errors.push(`${key}: ${msg}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        repos.set(key, { ...r, status: 'error', error: msg });
        errors.push(`${key}: ${msg}`);
      }
      // Update map reactively after each repo resolves
      set({ repos: new Map(repos) });
    }));

    set({ repos });
    return { errors };
  },

  clearAuth: () => {
    set({
      token:       '',
      repos:       new Map(),
      repoWfs:     new Map(),
      selectedIds: new Set(),
      runResults:  [],
    });
  },

  // ── Workflows ───────────────────────────────────────────────────────────────

  fetchAllWorkflows: async () => {
    const { repos, token } = get();
    const connected = ([...repos.entries()] as [RepoKey, Repo][]).filter(
      ([, r]) => r.status === 'ok',
    );
    if (connected.length === 0) return;

    const repoWfs = new Map<RepoKey, WorkflowGroup>();
    set({ repoWfs, selectedIds: new Set() });

    await Promise.all(connected.map(async ([key, r]) => {
      try {
        const wfs = await fetchAllWorkflowsForRepo(r.owner, r.repo, token);
        repoWfs.set(key, wfs);
      } catch (e) {
        repoWfs.set(key, { error: e instanceof Error ? e.message : String(e) });
      }
      set({ repoWfs: new Map(repoWfs) });
    }));
  },

  clearWorkflows: () => {
    set({ repoWfs: new Map(), selectedIds: new Set() });
  },

  toggleWorkflow: (repoKey: any, wfId: any) => {
    const selected = new Set(get().selectedIds);
    const sid: SelectionId = `${repoKey}::${wfId}`;
    if (selected.has(sid)) selected.delete(sid); else selected.add(sid);
    set({ selectedIds: selected });
  },

  selectAll: () => {
    const selected = new Set(get().selectedIds);
    for (const [key, wfs] of get().repoWfs) {
      if (Array.isArray(wfs)) {
        wfs.forEach(w => selected.add(`${key}::${w.id}`));
      }
    }
    set({ selectedIds: selected });
  },

  deselectAll: () => set({ selectedIds: new Set() }),

  getSelectedItems: () => {
    const { selectedIds, repoWfs } = get();
    const out: SelectedItem[] = [];

    for (const sid of selectedIds) {
      const sepIdx  = sid.lastIndexOf('::');
      const repoKey = sid.slice(0, sepIdx);
      const wfId    = parseInt(sid.slice(sepIdx + 2), 10);
      const group   = repoWfs.get(repoKey);

      if (!group || isWorkflowError(group)) continue;

      const wf = group.find((w: any) => w.id === wfId);
      if (wf) out.push({ repoKey, wf });
    }

    return out;
  },

  // ── Config ──────────────────────────────────────────────────────────────────

  setGitRef:       (gitRef: any)       => set({ gitRef }),
  setRefType:      (refType: any)      => set({ refType }),
  setDispatchMode: (dispatchMode: any) => set({ dispatchMode }),

  // ── Params ──────────────────────────────────────────────────────────────────

  addParam: () => {
    const id = `p${get().nextParamId}`;
    set((s: any) => ({
      params:      [...s.params, { id, key: '', value: '' }],
      nextParamId: s.nextParamId + 1,
    }));
  },

  removeParam: (id: any) => set((s: any) => ({ params: s.params.filter((p: any) => p.id !== id) })),

  updateParam: (id: any, field: any, value: any) =>
    set((s: any) => ({
      params: s.params.map((p: any) => p.id === id ? { ...p, [field]: value } : p),
    })),

  clearParams: () => set({ params: [] }),

  buildPayload: () => {
    const { gitRef, params } = get();
    const inputs: Record<string, string> = {};
    params.filter((p: any) => p.key.trim()).forEach((p: any) => { inputs[p.key.trim()] = p.value; });
    const payload: DispatchPayload = { ref: gitRef || 'main' };
    if (Object.keys(inputs).length) payload.inputs = inputs;
    return payload;
  },

  // ── Dispatch ────────────────────────────────────────────────────────────────

  triggerWorkflows: async () => {
    const { repos, token, dispatchMode, buildPayload, getSelectedItems } = get();
    const items = getSelectedItems();
    if (items.length === 0) return;

    const payload = buildPayload();

    type RunItem = SelectedItem & { runId: string };
    const runItems: RunItem[] = items.map((item: any, i: number) => ({ ...item, runId: `ri${i}` }));

    const initialResults: RunResult[] = runItems.map(({ repoKey, wf, runId }) => ({
      runId,
      repoKey,
      wf,
      status:  'queued' as RunStatus,
      message: 'Queued',
    }));

    set({ runResults: initialResults, isDispatching: true });

    const updateResult = (runId: string, status: RunStatus, message: string) => {
      set((s: any) => ({
        runResults: s.runResults.map((r: any) =>
          r.runId === runId ? { ...r, status, message } : r,
        ),
      }));
    };

    const dispatch = async ({ repoKey, wf, runId }: RunItem) => {
      const r = repos.get(repoKey);
      if (!r) { updateResult(runId, 'error', 'Repository not found'); return; }

      const url = `https://api.github.com/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/actions/workflows/${encodeURIComponent(wf.file)}/dispatches`;

      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: githubHeaders(token),
          body:    JSON.stringify(payload),
        });

        if (res.status === 204) {
          updateResult(runId, 'dispatched', 'Dispatched');
        } else {
          const err = await res.json().catch(() => ({})) as { message?: string };
          updateResult(runId, 'error', `Error ${res.status}${err.message ? `: ${err.message}` : ''}`);
        }
      } catch (e) {
        updateResult(runId, 'error', 'Network error');
      }
    };

    if (dispatchMode === 'sequential') {
      for (const item of runItems) await dispatch(item);
    } else {
      await Promise.all(runItems.map(dispatch));
    }

    set({ isDispatching: false });
  },

  clearRunResults: () => set({ runResults: [] }),
}));
