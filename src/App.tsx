import './App.css';
import Nav             from './components/Nav';
import AuthSection     from './components/AuthSection';
import WorkflowList    from './components/WorkflowList';
import TriggerConfig   from './components/TriggerConfig';
import WorkflowInputs  from './components/WorkflowInputs';
import DispatchSection from './components/DispatchSection';

export default function App() {
  return (
    <div className="app">
      <Nav />
      <AuthSection />
      <WorkflowList />
      <div className="two-col">
        <TriggerConfig />
        <WorkflowInputs />
      </div>
      <DispatchSection />
    </div>
  );
}
