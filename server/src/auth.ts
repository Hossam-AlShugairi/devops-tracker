import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devops-tracker-secret-jwt-key-2027';

export function signToken(): string {
  return jwt.sign({ user: 'owner' }, JWT_SECRET, { expiresIn: '30d' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.auth_token;

  if (!token) {
    res.status(401).json({ error: 'غير مصرح بالدخول. يرجى تسجيل الدخول أولاً.' });
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'انتهت صلاحية الجلسة، سجّل دخولك مرة تانية.' });
  }
}
