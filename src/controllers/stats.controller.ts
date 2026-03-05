import { Request, Response } from "express";
import * as statsService from "../services/stats.service";

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
        const stats = await statsService.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error("[Stats] Error fetching stats:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
}
