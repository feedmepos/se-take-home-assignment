import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './page/Home';
import './App.css';

/**
 * 应用程序根组件
 * 配置路由系统
 */
function App() {
  return (
    <BrowserRouter basename="/feed-me">
      <div className="app-root">
        <Routes>
          {/* 根路径重定向到 /feed-me */}
          <Route path="/" element={<Home />} />
          
          {/* 兼容旧的完整路径跳转 */}
          <Route path="/feed-me" element={<Navigate to="/" replace />} />
          
          {/* 404 处理 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
