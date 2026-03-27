import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection.js';
import { UserService } from '../services/userService.js';
import { sanitizeUser, getJwtSecret } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = getJwtSecret();

router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await UserService.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
        }

        const passwordMatch = await UserService.comparePasswords(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
        }

        const role = await UserService.getUserRole(user.id);
        const token = jwt.sign(
            { id: user.id, username: user.username, role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({ user: sanitizeUser({ ...user, role }), token });
    } catch (err) {
        console.error('Login error:', err);
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: 'Login failed', detail: message });
    }
});

export default router;
