import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as clickupService from "../services/clickup.service";
import prisma from "../lib/prisma";
import { emitNewMessage, emitTicketUpdate } from "../lib/socket";

/**
 * POST /api/clickup/tasks
 * Create a ClickUp task from an internal note.
 * Body: { messageId, description }
 */
export async function createTaskHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { messageId, description = '' } = req.body;

        if (!messageId) {
            res.status(400).json({ message: "messageId is required" });
            return;
        }

        // Get agent's ClickUp credentials
        const settings = await prisma.userSettings.findUnique({ where: { userId } });
        if (!settings?.clickupToken || !settings?.clickupListId) {
            res.status(400).json({ message: "Kamu belum mengatur ClickUp Token dan List ID di Settings" });
            return;
        }

        // Get the internal note
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: { ticket: { include: { contact: { include: { client: true } } } } },
        });

        if (!message || message.direction !== "INTERNAL") {
            res.status(404).json({ message: "Internal note tidak ditemukan" });
            return;
        }

        const ticket = message.ticket;

        // Build description with CRM context
        const crmLink = `${process.env.APP_URL || "https://crm.sahabatmedia.co.id"}/tickets`;
        const fullDescription = `${description}\n\n---\n**Tiket CRM:** ${ticket.ticketNumber}\n**Kontak:** ${ticket.contact.name} (${ticket.contact.client.name})\n**Link:** ${crmLink}`;

        // Create task in ClickUp
        const task = await clickupService.createClickUpTask(
            settings.clickupToken,
            settings.clickupListId,
            message.body,
            fullDescription
        );

        // Link task to ticket
        await clickupService.linkTaskToTicket(ticket.id, task.id, task.url, task.status.status);

        // Create system note in ticket
        const note = await prisma.message.create({
            data: {
                ticketId: ticket.id,
                direction: "INTERNAL",
                type: "TEXT",
                body: `Task ClickUp dibuat: "${message.body}"`,
                isSystemNote: true,
                timestamp: new Date(),
                sentById: userId,
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        emitNewMessage(ticket.id, note as unknown as Record<string, unknown>);

        res.json({ taskId: task.id, taskUrl: task.url, status: task.status.status });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create ClickUp task";
        console.error("[ClickUp] createTask error:", err);
        res.status(500).json({ message: msg });
    }
}

/**
 * POST /api/clickup/webhook
 * Receive ClickUp status change events (public — no auth).
 */
export async function webhookHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const result = await clickupService.handleClickUpWebhook(req.body);

        if (result) {
            // Emit socket update so UI reflects the new clickupStatus / ticket status
            const ticket = await prisma.ticket.findUnique({
                where: { id: result.ticketId },
                include: {
                    contact: { include: { client: true } },
                    assignedAgent: { select: { id: true, name: true } },
                    claimedBy: { select: { id: true, name: true } },
                    messages: { orderBy: { timestamp: "desc" }, take: 1 },
                    _count: { select: { messages: { where: { isRead: false, direction: "INBOUND" } } } },
                },
            });
            if (ticket) emitTicketUpdate(ticket as unknown as Record<string, unknown>);

            // If resolved, also broadcast the system note so it appears in chat live
            if (result.resolved && result.note) {
                emitNewMessage(result.ticketId, result.note as unknown as Record<string, unknown>);
            }
        }

        res.json({ ok: true });
    } catch (err) {
        console.error("[ClickUp] webhook error:", err);
        res.status(500).json({ message: "Webhook processing failed" });
    }
}

/**
 * POST /api/clickup/verify-token
 * Verify ClickUp token is valid and return user info.
 */
export async function verifyTokenHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { token } = req.body;
        if (!token) { res.status(400).json({ message: "token required" }); return; }
        const user = await clickupService.getClickUpUser(token);
        res.json({ valid: true, user });
    } catch {
        res.status(400).json({ valid: false, message: "Token ClickUp tidak valid" });
    }
}
