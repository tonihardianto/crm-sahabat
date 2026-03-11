import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as settingsService from "../services/settings.service";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

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
        const { sidebarCollapsed, chatBg, outboundBubbleColor, inboundBubbleColor, clickupToken, clickupListId, notifPref } = req.body;

        const settings = await settingsService.upsertSettings(userId, {
            sidebarCollapsed,
            chatBg,
            outboundBubbleColor,
            inboundBubbleColor,
            clickupToken,
            clickupListId,
            notifPref,
        });
        res.json(settings);
    } catch {
        res.status(500).json({ message: "Failed to update settings" });
    }
}

export async function changePasswordHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: "currentPassword and newPassword are required" });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ message: "Password baru minimal 8 karakter" });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            res.status(400).json({ message: "Password saat ini tidak sesuai" });
            return;
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

        res.json({ message: "Password berhasil diubah" });
    } catch {
        res.status(500).json({ message: "Failed to change password" });
    }
}
