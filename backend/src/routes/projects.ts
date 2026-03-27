import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const projects = await query('SELECT * FROM projects WHERE is_deleted = FALSE ORDER BY created_at DESC');
        res.json(projects.rows);
    } catch (err) {
        console.error('Get projects error:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
    const { name, description, status, progress } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const projectRes = await query(
            'INSERT INTO projects (name, description, is_deleted, created_at, updated_at) VALUES ($1, $2, FALSE, NOW(), NOW()) RETURNING *',
            [name, description || null]
        );
        const project = projectRes.rows[0];
        res.status(201).json({ ...project, status: status || 'active', progress: typeof progress === 'number' ? progress : 0 });
    } catch (err) {
        console.error('Create project error:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    const { name, description, status, progress } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (name) {
        fields.push(`name = $${fields.length + 1}`);
        values.push(name);
    }
    if (description !== undefined) {
        fields.push(`description = $${fields.length + 1}`);
        values.push(description);
    }
    if (status) {
        fields.push(`status = $${fields.length + 1}`);
        values.push(status);
    }
    if (progress !== undefined) {
        fields.push(`progress = $${fields.length + 1}`);
        values.push(progress);
    }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    try {
        values.push(req.params.id);
        const projectRes = await query(
            `UPDATE projects SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
            values
        );
        if (!projectRes.rows.length) return res.status(404).json({ error: 'Project not found' });
        res.json(projectRes.rows[0]);
    } catch (err) {
        console.error('Update project error:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        await query('UPDATE projects SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        console.error('Delete project error:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
