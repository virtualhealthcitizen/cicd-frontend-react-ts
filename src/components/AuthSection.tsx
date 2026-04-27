import { useRef, useState, useCallback, type KeyboardEvent } from 'react';
import { useGitHubStore } from '../state/usegithubstore';
import type { RepoKey } from '../index';

// ── Repo tag ──────────────────────────────────────────────────────────────────

interface RepoTagProps {
  repoKey: RepoKey;
  status:  'pending' | 'ok' | 'error';
  onRemove: (key: RepoKey) => void;
}

function RepoTag({ repoKey, status, onRemove }: RepoTagProps) {
  const suffix = status === 'ok' ? ' ✓' : status === 'error' ? ' ✕' : '';
  return (
    <span className={`repo-tag status-${status}`}>
      {repoKey}{suffix}
      <button
        type="button"
        className="repo-tag-remove"
        title={`Remove ${repoKey}`}
        onClick={e => { e.stopPropagation(); onRemove(repoKey); }}
      >
        &times;
      </button>
    </span>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────

function Loader() {
  return <span className="loader" aria-label="Loading" />;
}

// ── AuthSection ───────────────────────────────────────────────────────────────

export default function AuthSection() {
  const repos              = useGitHubStore(s => s.repos);
  const token              = useGitHubStore(s => s.token);
  const tokenVisible       = useGitHubStore(s => s.tokenVisible);
  const setToken           = useGitHubStore(s => s.setToken);
  const toggleTokenVisible = useGitHubStore(s => s.toggleTokenVisible);
  const addRepo            = useGitHubStore(s => s.addRepo);
  const removeRepo         = useGitHubStore(s => s.removeRepo);
  const connectAll         = useGitHubStore(s => s.connectAll);
  const clearAuth          = useGitHubStore(s => s.clearAuth);
  const fetchAllWorkflows  = useGitHubStore(s => s.fetchAllWorkflows);

  const [inputVal, setInputVal]   = useState('');
  const [inputError, setInputError] = useState('');
  const [authError, setAuthError]   = useState('');
  const [connecting, setConnecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flash a validation error in the tag input for 1.8 s
  const flashError = useCallback((msg: string) => {
    setInputError(msg);
    setTimeout(() => setInputError(''), 1800);
  }, []);

  const commit = useCallback(() => {
    const raw = inputVal.trim();
    if (!raw) return;
    const err = addRepo(raw);
    if (err) {
      flashError(err);
    } else {
      setInputVal('');
      setAuthError('');
    }
  }, [inputVal, addRepo, flashError]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (inputVal.trim()) { e.preventDefault(); commit(); }
    } else if (e.key === 'Backspace' && inputVal === '') {
      const keys = [...repos.keys()];
      if (keys.length) removeRepo(keys[keys.length - 1]);
    }
  };

  const handleInput = (val: string) => {
    if (val.endsWith(',')) {
      setInputVal(val.slice(0, -1));
      commit();
    } else {
      setInputVal(val);
    }
  };

  const handleConnect = async () => {
    if (repos.size === 0) { setAuthError('Add at least one repository (owner/repo) before connecting.'); return; }
    if (!token)           { setAuthError('A personal access token is required.'); return; }
    setAuthError('');
    setConnecting(true);
    const { errors } = await connectAll();
    setConnecting(false);
    if (errors.length) {
      setAuthError('Some repos failed to connect:\n' + errors.join('\n'));
    } else {
      await fetchAllWorkflows();
    }
  };

  const handleClear = () => {
    clearAuth();
    setInputVal('');
    setAuthError('');
  };

  // Derive status indicator text
  const repoList   = [...repos.values()];
  const okCount    = repoList.filter(r => r.status === 'ok').length;
  const errCount   = repoList.filter(r => r.status === 'error').length;
  let statusText   = 'No repositories added';
  let statusClass  = '';
  if (repos.size > 0) {
    if (connecting) {
      statusText  = '';   // replaced by spinner below
      statusClass = '';
    } else if (okCount === repos.size) {
      statusText  = repos.size === 1
        ? `Connected: ${repoList[0].fullName}`
        : `${okCount} of ${repos.size} repos connected`;
      statusClass = 'ok';
    } else if (errCount > 0) {
      statusText  = `${errCount} repo${errCount > 1 ? 's' : ''} failed`;
      statusClass = 'err';
    } else {
      statusText  = `${repos.size} repo${repos.size > 1 ? 's' : ''} pending connect`;
    }
  }

  return (
    <div className="section" id="section-auth">
      <span className="badge badge-blue">Authentication</span>
      <h2 className="section-title">GitHub credentials</h2>

      {/* Repo tag input */}
      <label>Repositories</label>
      <div
        className="repo-tag-input-wrap"
        onClick={() => inputRef.current?.focus()}
      >
        {[...repos.entries()].map(([key, r]) => (
          <RepoTag
            key={key}
            repoKey={key}
            status={r.status}
            onRemove={removeRepo}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          className="repo-tag-text-input"
          placeholder={inputError || 'owner/repo — press Enter or comma to add'}
          style={inputError ? { color: 'var(--error-fg)' } : undefined}
          value={inputVal}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <p className="repo-hint">Add one or more repositories. They will all use the token below.</p>

      {/* PAT field */}
      <label htmlFor="pat-token">Personal access token (PAT)</label>
      <div className="token-field-wrap">
        <input
          type={tokenVisible ? 'text' : 'password'}
          id="pat-token"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          autoComplete="off"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button
          type="button"
          className="token-visibility-btn"
          onClick={toggleTokenVisible}
        >
          {tokenVisible ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* CORS notice */}
      <div className="cors-notice">
        <strong>Note:</strong> Best served from a local server due to CORS.{' '}
        See the{' '}
        <a href="https://docs.github.com/en/rest/actions/workflows" target="_blank" rel="noreferrer">
          GitHub Actions API docs
        </a>{' '}
        for details.
      </div>

      {/* Actions row */}
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          id="connect-btn"
          disabled={connecting}
          onClick={handleConnect}
        >
          {connecting ? <><Loader /> Connecting…</> : 'Connect'}
        </button>
        <button type="button" className="btn" onClick={handleClear}>
          Clear all
        </button>
        <span className={`status-indicator${statusClass ? ` ${statusClass}` : ''}`}>
          {connecting ? <><Loader /> Connecting…</> : statusText}
        </span>
      </div>

      {/* Error result box */}
      {authError && (
        <div className="result-box error" style={{ marginTop: '10px' }}>
          {authError}
        </div>
      )}
    </div>
  );
}
