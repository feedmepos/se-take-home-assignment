import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import 'antd/dist/reset.css';

createRoot(document.getElementById('root')).render(
    <App />
)
