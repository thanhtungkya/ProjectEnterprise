import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const chatsRes = await query('SELECT * FROM chats WHERE is_deleted = FALSE ORDER BY created_at DESC');
        res.json(chatsRes.rows);
    } catch (err) {
        console.error('Get chats error:', err);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
    const { name, type, projectId, departmentId } = req.body;
    if (!type) return res.status(400).json({ error: 'Chat type required' });

    try {
        const chatRes = await query(
            'INSERT INTO chats (name, type, project_id, department_id, is_deleted, created_at, updated_at) VALUES ($1,$2,$3,$4,FALSE,NOW(),NOW()) RETURNING *',
            [name || null, type, projectId || null, departmentId || null]
        );
        res.status(201).json(chatRes.rows[0]);
    } catch (err) {
        console.error('Create chat error:', err);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

export default router;
