import { Request, Response } from "express";
import * as messageService from "../services/message.service";

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
