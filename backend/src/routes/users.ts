import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';
import { UserService } from '../services/userService.js';
import { requireAuth, sanitizeUser } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const users = await UserService.getAllUsers();
        const usersWithRoles = await Promise.all(
            users.map(async (u) => {
                const role = await UserService.getUserRole(u.id);
                return sanitizeUser({ ...u, role });
            })
        );
        res.json(usersWithRoles);
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const user = await UserService.getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const role = await UserService.getUserRole(user.id);
        res.json(sanitizeUser({ ...user, role }));
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
    const { username, password, name, role, departmentId } = req.body;
    if (!username || !password || !name || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hashedPassword = await UserService.hashPassword(password);
        const insertUser = await query(
            'INSERT INTO users (username, password_hash, department_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
            [username, hashedPassword, departmentId || null]
        );
        const createdUser = insertUser.rows[0];

        const roleRow = await query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [role]);
        if (roleRow.rows.length) {
            await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
                createdUser.id,
                roleRow.rows[0].id
            ]);
        }

        res.status(201).json(sanitizeUser({ ...createdUser, role }));
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    const { username, password, departmentId, role, is_deleted } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (username) {
        fields.push(`username = $${fields.length + 1}`);
        values.push(username);
    }
    if (departmentId !== undefined) {
        fields.push(`department_id = $${fields.length + 1}`);
        values.push(departmentId);
    }
    if (is_deleted !== undefined) {
        fields.push(`is_deleted = $${fields.length + 1}`);
        values.push(is_deleted);
    }

    try {
        let updatedUser;

        if (password) {
            const hashed = await UserService.hashPassword(password);
            await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, req.params.id]);
        }

        if (fields.length) {
            values.push(req.params.id);
            const upd = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
            const result = await query(upd, values);
            if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
            updatedUser = result.rows[0];
        } else {
            const result = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
            if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
            updatedUser = result.rows[0];
        }

        if (role) {
            const roleRow = await query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [role]);
            if (roleRow.rows.length) {
                await query('DELETE FROM user_roles WHERE user_id = $1', [req.params.id]);
                await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
                    req.params.id,
                    roleRow.rows[0].id
                ]);
            }
        }

        const finalRole = await UserService.getUserRole(req.params.id);
        res.json(sanitizeUser({ ...updatedUser, role: finalRole }));
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        await query('UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
