import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:channelId', requireAuth, async (req: Request, res: Response) => {
    try {
        const messages = await query(
            `SELECT m.*, u.username AS sender_name FROM messages m 
             LEFT JOIN users u ON u.id = m.sender_id 
             WHERE m.chat_id = $1 AND m.is_deleted = FALSE 
             ORDER BY m.created_at ASC`,
            [req.params.channelId]
        );
        res.json(messages.rows.map(m => ({ ...m, text: m.encrypted_content || null })));
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
    const { channelId, senderId, text } = req.body;
    if (!channelId || !senderId || !text) {
        return res.status(400).json({ error: 'channelId, senderId, text required' });
    }

    try {
        const messageRes = await query(
            'INSERT INTO messages (chat_id, sender_id, encrypted_content, is_deleted, created_at, updated_at) VALUES ($1,$2,$3,FALSE,NOW(),NOW()) RETURNING *',
            [channelId, senderId, text]
        );
        res.status(201).json(messageRes.rows[0]);
    } catch (err) {
        console.error('Create message error:', err);
        res.status(500).json({ error: 'Failed to create message' });
    }
});

export default router;
