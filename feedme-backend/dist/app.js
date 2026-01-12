import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orders.js';
import botRoutes from './routes/bots.js';
import authRoutes from './routes/auth.js';
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', botRoutes);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
export default app;
//# sourceMappingURL=app.js.map