import { Response } from "express";
import { login } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function loginHandler(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "Email and password required" });
        return;
    }
    try {
        const { token, user } = await login(email, password);
        res.cookie("token", token, COOKIE_OPTS);
        res.json({ user });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Login failed";
        res.status(401).json({ message });
    }
}

export function logoutHandler(_req: AuthRequest, res: Response): void {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
}

export function meHandler(req: AuthRequest, res: Response): void {
    res.json({ user: req.user });
}
