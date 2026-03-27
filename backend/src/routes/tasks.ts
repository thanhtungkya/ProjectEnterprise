import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const tasksRes = await query(
            `SELECT t.*, array_agg(ta.user_id) AS assigned_to FROM tasks t 
             LEFT JOIN task_assignments ta ON ta.task_id = t.id 
             WHERE t.is_deleted = FALSE 
             GROUP BY t.id 
             ORDER BY t.created_at DESC`
        );
        const tasks = tasksRes.rows.map(t => ({
            ...t,
            assignedTo: t.assigned_to ? t.assigned_to[0] : null,
            assignee_id: t.assigned_to ? t.assigned_to[0] : null
        }));
        res.json(tasks);
    } catch (err) {
        console.error('Get tasks error:', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
    const { title, description, assignedTo, status, priority, projectId } = req.body;
    if (!title || !projectId) {
        return res.status(400).json({ error: 'Title and projectId are required' });
    }

    try {
        const taskRes = await query(
            'INSERT INTO tasks (project_id, created_by, title, description, status, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW()) RETURNING *',
            [projectId, req.user!.id, title, description || null, status || 'todo']
        );
        const newTask = taskRes.rows[0];

        if (assignedTo) {
            await query('INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
                newTask.id,
                assignedTo
            ]);
        }

        res.status(201).json({ ...newTask, assignedTo, assignee_id: assignedTo });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    const { title, description, status, priority, assignedTo } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (title) {
        fields.push(`title = $${fields.length + 1}`);
        values.push(title);
    }
    if (description !== undefined) {
        fields.push(`description = $${fields.length + 1}`);
        values.push(description);
    }
    if (status) {
        fields.push(`status = $${fields.length + 1}`);
        values.push(status);
    }
    if (priority) {
        fields.push(`priority = $${fields.length + 1}`);
        values.push(priority);
    }

    try {
        let task;
        if (fields.length) {
            values.push(req.params.id);
            const update = await query(
                `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
                values
            );
            if (!update.rows.length) return res.status(404).json({ error: 'Task not found' });
            task = update.rows[0];
        } else {
            const fetch = await query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
            if (!fetch.rows.length) return res.status(404).json({ error: 'Task not found' });
            task = fetch.rows[0];
        }

        if (assignedTo !== undefined) {
            await query('DELETE FROM task_assignments WHERE task_id = $1', [req.params.id]);
            if (assignedTo) {
                await query('INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)', [req.params.id, assignedTo]);
                task.assignedTo = assignedTo;
                task.assignee_id = assignedTo;
            }
        }

        res.json(task);
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        await query('UPDATE tasks SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

export default router;
