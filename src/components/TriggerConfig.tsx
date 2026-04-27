import { useGitHubStore } from '../state/usegithubstore';
import type { RefType, DispatchMode } from '../index';

export default function TriggerConfig() {
  const gitRef       = useGitHubStore(s => s.gitRef);
  const refType      = useGitHubStore(s => s.refType);
  const dispatchMode = useGitHubStore(s => s.dispatchMode);
  const setGitRef    = useGitHubStore(s => s.setGitRef);
  const setRefType   = useGitHubStore(s => s.setRefType);
  const setDispatchMode = useGitHubStore(s => s.setDispatchMode);

  return (
    <div className="section">
      <span className="badge badge-amber">Trigger config</span>
      <h2 className="section-title">Ref &amp; options</h2>

      <label htmlFor="git-ref">Branch / tag / SHA</label>
      <div className="ref-row">
        <input
          type="text"
          id="git-ref"
          placeholder="main"
          value={gitRef}
          onChange={e => setGitRef(e.target.value)}
        />
        <select
          id="ref-type"
          value={refType}
          onChange={e => setRefType(e.target.value as RefType)}
        >
          <option value="branch">Branch</option>
          <option value="tag">Tag</option>
          <option value="sha">SHA</option>
        </select>
      </div>

      <label htmlFor="run-mode">Dispatch mode</label>
      <select
        id="run-mode"
        value={dispatchMode}
        onChange={e => setDispatchMode(e.target.value as DispatchMode)}
      >
        <option value="sequential">Sequential</option>
        <option value="parallel">Parallel</option>
      </select>
    </div>
  );
}
