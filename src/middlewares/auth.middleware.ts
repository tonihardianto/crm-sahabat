import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = req.cookies?.token;
    if (!token) {
        res.status(401).json({ message: "Unauthorized: no session" });
        return;
    }
    try {
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ message: "Unauthorized: invalid or expired token" });
    }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    requireAuth(req, res, () => {
        if (req.user?.role !== "ADMIN") {
            res.status(403).json({ message: "Forbidden: admin only" });
            return;
        }
        next();
    });
}
