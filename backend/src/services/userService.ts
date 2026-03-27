import bcrypt from 'bcrypt';
import { query } from '../db/connection.js';

export const UserService = {
    async getUserRole(userId: string): Promise<string> {
        const result = await query(
            'SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1 LIMIT 1',
            [userId]
        );
        return result.rows.length ? result.rows[0].name : 'employee';
    },

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    },

    async comparePasswords(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    },

    async getUserById(userId: string) {
        const result = await query(
            'SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE',
            [userId]
        );
        return result.rows[0] || null;
    },

    async getUserByUsername(username: string) {
        const result = await query(
            'SELECT * FROM users WHERE username = $1 AND is_deleted = FALSE',
            [username]
        );
        return result.rows[0] || null;
    },

    async getAllUsers() {
        const result = await query(
            'SELECT * FROM users WHERE is_deleted = FALSE ORDER BY created_at DESC'
        );
        return result.rows;
    }
};
