// ── Repository ────────────────────────────────────────────────────────────────

export type RepoStatus = 'pending' | 'ok' | 'error';

export interface Repo {
  owner:    string;
  repo:     string;
  status:   RepoStatus;
  fullName: string;
  error:    string | null;
}

/** Key format: "owner/repo" */
export type RepoKey = string;

// ── Workflow ──────────────────────────────────────────────────────────────────

export type WorkflowState = 'active' | 'disabled_manually' | 'disabled_inactivity' | string;

export interface Workflow {
  id:    number;
  name:  string;
  path:  string;
  /** Filename only, e.g. "ci.yml" — derived from path */
  file:  string;
  state: WorkflowState;
}

export interface WorkflowGroupError {
  error: string;
}

export type WorkflowGroup = Workflow[] | WorkflowGroupError;

export function isWorkflowError(g: WorkflowGroup): g is WorkflowGroupError {
  return !Array.isArray(g) && 'error' in g;
}

// ── Selected workflow ─────────────────────────────────────────────────────────

/** Composite key used in the selectedIds Set: "owner/repo::wfId" */
export type SelectionId = string;

export interface SelectedItem {
  repoKey: RepoKey;
  wf:      Workflow;
}

// ── Workflow input params ─────────────────────────────────────────────────────

export interface WorkflowParam {
  id:    string;
  key:   string;
  value: string;
}

// ── Dispatch payload ──────────────────────────────────────────────────────────

export interface DispatchPayload {
  ref:     string;
  inputs?: Record<string, string>;
}

export type DispatchMode = 'sequential' | 'parallel';
export type RefType      = 'branch' | 'tag' | 'sha';

// ── Run result ────────────────────────────────────────────────────────────────

export type RunStatus = 'queued' | 'dispatched' | 'error';

export interface RunResult {
  runId:   string;
  repoKey: RepoKey;
  wf:      Workflow;
  status:  RunStatus;
  message: string;
}
