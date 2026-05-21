import { OrderProvider } from './store/OrderContext';
import RoleSwitcher from './components/RoleSwitcher';
import OrderButtons from './components/OrderButtons';
import BotManager from './components/BotManager';
import PendingArea from './components/PendingArea';
import CompleteArea from './components/CompleteArea';
import ActivityLog from './components/ActivityLog';
import './styles/App.css';

export default function App() {
  return (
    <OrderProvider>
      <AppContent />
    </OrderProvider>
  );
}

function AppContent() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>McDonald's <span>订单追踪系统</span></h1>
        <RoleSwitcher />
      </header>
      <div className="main-layout">
        <div className="control-panel">
          <OrderButtons />
          <BotManager />
        </div>
        <PendingArea />
        <CompleteArea />
      </div>
      <ActivityLog />
    </div>
  );
}
