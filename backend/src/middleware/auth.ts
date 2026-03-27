import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'secure-enterprise-secret';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; username: string; role: string; iat?: number; exp?: number };
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET) as any;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

export function sanitizeUser(user: any) {
    const { password, password_hash, ...publicUser } = user;
    return publicUser;
}

export function getJwtSecret(): string {
    return JWT_SECRET;
}
