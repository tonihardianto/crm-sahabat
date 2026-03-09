import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as settingsService from "../services/settings.service";

export async function getSettingsHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const settings = await settingsService.getSettings(userId);
        res.json(settings);
    } catch {
        res.status(500).json({ message: "Failed to fetch settings" });
    }
}

export async function updateSettingsHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { sidebarCollapsed, chatBg, outboundBubbleColor, inboundBubbleColor } = req.body;

        const settings = await settingsService.upsertSettings(userId, {
            sidebarCollapsed,
            chatBg,
            outboundBubbleColor,
            inboundBubbleColor,
        });
        res.json(settings);
    } catch {
        res.status(500).json({ message: "Failed to update settings" });
    }
}
