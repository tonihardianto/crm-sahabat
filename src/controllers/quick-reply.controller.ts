import { Request, Response } from "express";
import * as qrService from "../services/quick-reply.service";

export async function list(_req: Request, res: Response): Promise<void> {
    try {
        res.json(await qrService.listQuickReplies());
    } catch (err) {
        console.error("[QuickReply] list error:", err);
        res.status(500).json({ message: "Gagal mengambil quick replies" });
    }
}

export async function create(req: Request, res: Response): Promise<void> {
    try {
        const { shortcut, title, body } = req.body;
        if (!shortcut || !title || !body) {
            res.status(400).json({ message: "shortcut, title, dan body wajib diisi" });
            return;
        }
        const sanitizedShortcut = String(shortcut).toLowerCase().replace(/\s+/g, "-");
        res.status(201).json(await qrService.createQuickReply({ shortcut: sanitizedShortcut, title, body }));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unique constraint")) {
            res.status(409).json({ message: "Shortcut sudah digunakan" });
            return;
        }
        console.error("[QuickReply] create error:", err);
        res.status(500).json({ message: "Gagal membuat quick reply" });
    }
}

export async function update(req: Request, res: Response): Promise<void> {
    try {
        const { shortcut, title, body } = req.body;
        const data: Partial<{ shortcut: string; title: string; body: string }> = {};
        if (shortcut !== undefined) data.shortcut = String(shortcut).toLowerCase().replace(/\s+/g, "-");
        if (title !== undefined) data.title = title;
        if (body !== undefined) data.body = body;
        res.json(await qrService.updateQuickReply(req.params.id as string, data));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unique constraint")) {
            res.status(409).json({ message: "Shortcut sudah digunakan" });
            return;
        }
        console.error("[QuickReply] update error:", err);
        res.status(500).json({ message: "Gagal mengupdate quick reply" });
    }
}

export async function remove(req: Request, res: Response): Promise<void> {
    try {
        await qrService.deleteQuickReply(req.params.id as string);
        res.json({ message: "Dihapus" });
    } catch (err) {
        console.error("[QuickReply] delete error:", err);
        res.status(500).json({ message: "Gagal menghapus quick reply" });
    }
}
