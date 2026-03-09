import { Request, Response } from "express";
import path from "path";
import * as messageService from "../services/message.service";
import { emitEditMessage } from "../lib/socket";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { editTextMessage } from "../lib/whatsapp";

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
        const { body, direction, sentById, replyToId } = req.body;

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
            replyToId,
        });

        res.status(201).json(message);
    } catch (error) {
        console.error("[Message] Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
}

/**
 * PATCH /api/tickets/:id/messages/:msgId
 * Edit isi pesan OUTBOUND atau INTERNAL (TEXT only).
 */
export async function editMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id: ticketId, msgId } = req.params as { id: string; msgId: string };
        const { body } = req.body as { body: string };

        if (!body?.trim()) {
            res.status(400).json({ error: "body is required" });
            return;
        }

        const existing = await prisma.message.findUnique({ where: { id: msgId } });
        if (!existing) { res.status(404).json({ error: "Message not found" }); return; }
        if (existing.ticketId !== ticketId) { res.status(400).json({ error: "Message does not belong to this ticket" }); return; }
        if (!["OUTBOUND", "INTERNAL"].includes(existing.direction)) {
            res.status(400).json({ error: "Only OUTBOUND or INTERNAL messages can be edited" });
            return;
        }
        if (existing.type !== "TEXT") {
            res.status(400).json({ error: "Only TEXT messages can be edited" });
            return;
        }

        const updated = await prisma.message.update({
            where: { id: msgId },
            data: { body: body.trim(), isEdited: true, editedAt: new Date() },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        // Jika OUTBOUND dan ada wamid, edit juga di sisi pelanggan via WhatsApp API
        if (existing.direction === "OUTBOUND" && existing.wamid) {
            const ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { contact: { select: { waId: true, phoneNumber: true } } },
            });
            const to = ticket?.contact?.waId || ticket?.contact?.phoneNumber;
            if (to) {
                try {
                    await editTextMessage(to, existing.wamid, body.trim());
                } catch (err) {
                    console.error("[Message] WhatsApp edit failed (DB updated anyway):", err);
                }
            }
        }

        emitEditMessage(ticketId, updated as unknown as Record<string, unknown>);
        res.json(updated);
    } catch (error) {
        console.error("[Message] Error editing message:", error);
        res.status(500).json({ error: "Failed to edit message" });
    }
}
