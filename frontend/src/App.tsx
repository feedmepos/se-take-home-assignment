import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import OrderListPage from './pages/OrderListPage';
import BotListPage from './pages/BotListPage';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  useWebSocket();
  return (
    <div>
      <NavBar />
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Routes>
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/bots" element={<BotListPage />} />
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </main>
    </div>
  );
}
