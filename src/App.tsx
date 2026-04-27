import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">

      {/* Nav */}
      <div className="nav">
        <div>
          <h1>React + TypeScript template</h1>
          <p className="subtitle">WOW THIS IS A TEMPLATE</p>
        </div>
      </div>

      {/* Placeholder content — replace with your real sections */}
      <div className="section">
        <span className="badge badge-blue">Getting started</span>
        <h2 className="section-title">Welcome</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Edit <code style={{ fontFamily: 'var(--font-mono)' }}>src/App.tsx</code> to begin
          building your interface. The theme tokens from <code style={{ fontFamily: 'var(--font-mono)' }}>index.css</code> and
          component classes from <code style={{ fontFamily: 'var(--font-mono)' }}>App.css</code> are
          already active.
        </p>

        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCount(c => c + 1)}
          >
            Count is {count}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setCount(0)}
          >
            Reset
          </button>
        </div>

        <div className={`result-box${count > 0 ? ' success' : ''}`} style={{ marginTop: '12px' }}>
          {count === 0
            ? 'Click the button above to test state and styles.'
            : `Counter value: ${count}`}
        </div>
      </div>

      <div className="two-col">
        <div className="section">
          <span className="badge badge-teal">Styles</span>
          <h2 className="section-title">Theme tokens</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            All CSS custom properties are defined in{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>index.css</code> and
            automatically switch between light and dark mode via{' '}
            <code style={{ fontFamily: 'var(--font-mono)' }}>prefers-color-scheme</code>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            <span className="badge badge-blue">Blue</span>
            <span className="badge badge-teal">Teal</span>
            <span className="badge badge-amber">Amber</span>
            <span className="badge badge-green">Green</span>
            <span className="badge badge-purple">Purple</span>
            <span className="badge badge-coral">Coral</span>
          </div>
        </div>

        <div className="section">
          <span className="badge badge-amber">Components</span>
          <h2 className="section-title">Available classes</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Component classes from <code style={{ fontFamily: 'var(--font-mono)' }}>App.css</code>:
          </p>
          <div className="row" style={{ marginTop: 0 }}>
            <button type="button" className="btn">Default</button>
            <button type="button" className="btn btn-primary">Primary</button>
            <button type="button" className="btn btn-success">Success</button>
            <button type="button" className="btn btn-danger">Danger</button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default App
