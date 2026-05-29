import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './page/Home';
import './App.css';

/**
 * 应用程序根组件
 * 配置路由系统
 */
function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          {/* 根路径重定向到 /feed-me */}
          <Route path="/" element={<Navigate to="/feed-me" replace />} />
          
          {/* 订单管理系统主页 */}
          <Route path="/feed-me" element={<Home />} />
          
          {/* 404 处理 */}
          <Route path="*" element={<Navigate to="/feed-me" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
