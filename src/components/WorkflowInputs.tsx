import { useGitHubStore } from '../state/usegithubstore';

export default function WorkflowInputs() {
  const params       = useGitHubStore(s => s.params);
  const addParam     = useGitHubStore(s => s.addParam);
  const removeParam  = useGitHubStore(s => s.removeParam);
  const updateParam  = useGitHubStore(s => s.updateParam);
  const clearParams  = useGitHubStore(s => s.clearParams);

  return (
    <div className="section">
      <span className="badge badge-purple">Inputs</span>
      <h2 className="section-title">Workflow inputs</h2>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        Key/value pairs sent as{' '}
        <code style={{ fontFamily: 'var(--font-mono)' }}>inputs</code>{' '}
        in the dispatch payload.
      </p>

      <div className="params-list">
        {params.map(p => (
          <div className="param-row" key={p.id}>
            <input
              className="param-key"
              type="text"
              placeholder="key"
              value={p.key}
              onChange={e => updateParam(p.id, 'key', e.target.value)}
            />
            <input
              className="param-val"
              type="text"
              placeholder="value"
              value={p.value}
              onChange={e => updateParam(p.id, 'value', e.target.value)}
            />
            <button
              type="button"
              className="param-remove"
              title="Remove"
              onClick={() => removeParam(p.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: '8px' }}>
        <button type="button" className="btn" onClick={addParam}>
          + Add input
        </button>
        <button type="button" className="btn" onClick={clearParams}>
          Clear all
        </button>
      </div>
    </div>
  );
}
