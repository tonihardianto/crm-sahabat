import { Request, Response } from "express";
import path from "path";
import * as messageService from "../services/message.service";

export async function markMessagesRead(req: Request, res: Response): Promise<void> {
    try {
        const ticketId = req.params.id as string;
        await messageService.markInboundMessagesRead(ticketId);
        res.json({ ok: true });
    } catch (error) {
        console.error("[Message] Error marking as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
}

export async function sendMediaMessage(req: Request, res: Response): Promise<void> {
    try {
        const ticketId = req.params.id as string;
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const mime = file.mimetype;
        let type: "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";
        if (mime.startsWith("image/")) type = "IMAGE";
        else if (mime.startsWith("audio/")) type = "AUDIO";
        else if (mime.startsWith("video/")) type = "VIDEO";
        else type = "DOCUMENT";

        const baseUrl = process.env.APP_URL || "https://crm.sahabatmedia.co.id";
        const mediaUrl = `${baseUrl}/uploads/${file.filename}`;
        const caption = (req.body.caption as string) || "";
        const sentById = (req.body.sentById as string) || undefined;

        const message = await messageService.createMediaMessage(ticketId, {
            type,
            mediaUrl,
            body: caption || path.basename(file.originalname),
            filename: file.originalname,
            sentById,
        });

        res.status(201).json(message);
    } catch (error) {
        console.error("[Message] Error sending media:", error);
        res.status(500).json({ error: "Failed to send media message" });
    }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
    try {
        const ticketId = req.params.id as string;
        const { body, direction, sentById } = req.body;

        if (!body || !direction) {
            res.status(400).json({ error: "body and direction are required" });
            return;
        }

        if (!["OUTBOUND", "INTERNAL"].includes(direction)) {
            res.status(400).json({ error: "direction must be OUTBOUND or INTERNAL" });
            return;
        }

        const message = await messageService.createMessage(ticketId, {
            body,
            direction,
            sentById,
        });

        res.status(201).json(message);
    } catch (error) {
        console.error("[Message] Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
}
