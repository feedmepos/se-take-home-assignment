import { Router } from 'express';
import { generateToken } from '../middleware/auth.js';
const router = Router();
// Login endpoint (for demo purposes - in production, verify credentials)
router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Simple demo authentication - in production, verify against database
    if (username && password) {
        const token = generateToken(username, 'user');
        res.json({
            token,
            user: { id: username, role: 'user' }
        });
    }
    else {
        res.status(400).json({ error: 'Username and password required' });
    }
});
export default router;
//# sourceMappingURL=auth.js.map