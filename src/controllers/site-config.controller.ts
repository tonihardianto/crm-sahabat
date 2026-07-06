import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

// GET /api/site-config — Public
export async function getSiteConfig(_req: Request, res: Response): Promise<void> {
    try {
        let config = await prisma.siteConfig.findUnique({ where: { id: "default" } });
        if (!config) {
            config = await prisma.siteConfig.create({ data: { id: "default", theme: "amber" } });
        }
        res.json(config);
    } catch (err) {
        console.error("getSiteConfig error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// PUT /api/site-config — Admin only
export async function updateSiteConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
        const theme = req.body.theme as string | undefined;
        if (!theme) {
            res.status(400).json({ message: "theme is required" });
            return;
        }

        const config = await prisma.siteConfig.upsert({
            where: { id: "default" },
            update: { theme },
            create: { id: "default", theme },
        });

        res.json(config);
    } catch (err) {
        console.error("updateSiteConfig error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}
