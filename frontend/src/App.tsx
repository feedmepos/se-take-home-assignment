import { useOrderManager } from './hooks/useOrderManager';
import { ControlPanel } from './components/ControlPanel';
import { PendingArea } from './components/PendingArea';
import { CompleteArea } from './components/CompleteArea';
import { BotArea } from './components/BotArea';
import './index.css';

function App() {
  const { state, addOrder, addBot, removeBot } = useOrderManager();

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">McDonald's Order Controller</h1>
        <p className="app-subtitle">Automated Cooking Bot System</p>
      </header>

      <main>
        <ControlPanel 
          onAddOrder={addOrder} 
          onAddBot={addBot} 
          onRemoveBot={removeBot} 
        />
        
        <div className="dashboard">
          <PendingArea orders={state.orders} />
          <BotArea bots={state.bots} />
          <CompleteArea orders={state.orders} />
        </div>
      </main>
    </>
  );
}

export default App;
