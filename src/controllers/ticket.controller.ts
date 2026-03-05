import { Request, Response } from "express";
import * as ticketService from "../services/ticket.service";
import { sendTemplateMessage } from "../lib/whatsapp";
import { emitNewTicket, emitNewMessage } from "../lib/socket";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../lib/prisma";

export async function listTickets(_req: Request, res: Response): Promise<void> {
    try {
        const tickets = await ticketService.getActiveTickets();
        res.json(tickets);
    } catch (error) {
        console.error("[Ticket] Error listing tickets:", error);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
}

export async function getTicket(req: Request, res: Response): Promise<void> {
    try {
        const ticket = await ticketService.getTicketById(req.params.id as string);
        if (!ticket) {
            res.status(404).json({ error: "Ticket not found" });
            return;
        }
        res.json(ticket);
    } catch (error) {
        console.error("[Ticket] Error fetching ticket:", error);
        res.status(500).json({ error: "Failed to fetch ticket" });
    }
}

export async function updateTicket(req: Request, res: Response): Promise<void> {
    try {
        const { status, category, priority } = req.body;
        const ticket = await ticketService.updateTicket(req.params.id as string, {
            status,
            category,
            priority,
        });
        res.json(ticket);
    } catch (error) {
        console.error("[Ticket] Error updating ticket:", error);
        res.status(500).json({ error: "Failed to update ticket" });
    }
}

export async function claimTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        // Use authenticated user's ID if available, fallback to body/database
        let agentId = req.user?.userId || req.body.agentId;

        if (agentId) {
            const agentExists = await prisma.user.findUnique({ where: { id: agentId } });
            if (!agentExists) agentId = null;
        }

        if (!agentId) {
            const defaultAgent = await prisma.user.findFirst({ where: { isActive: true } });
            if (!defaultAgent) {
                res.status(400).json({ error: "No active agents available" });
                return;
            }
            agentId = defaultAgent.id;
        }

        const ticket = await ticketService.claimTicket(req.params.id as string, agentId);
        res.json(ticket);
    } catch (error) {
        console.error("[Ticket] Error claiming ticket:", error);
        res.status(500).json({ error: "Failed to claim ticket" });
    }
}

/**
 * POST /api/tickets/initiate
 * Agen memulai percakapan ke kontak menggunakan template message.
 */
export async function initiateTicket(req: AuthRequest, res: Response): Promise<void> {
    const {
        contactId,
        templateName,
        languageCode = "id",
        components = [],
        subject,
        category,
        priority,
    } = req.body;

    if (!contactId || !templateName) {
        res.status(400).json({ message: "contactId and templateName are required" });
        return;
    }

    const agentId = req.user?.userId;
    if (!agentId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { id: true, phoneNumber: true, waId: true },
    });
    if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
    }

    const toPhone = contact.waId || contact.phoneNumber;

    try {
        const { wamid } = await sendTemplateMessage(toPhone, templateName, languageCode, components);

        const ticket = await ticketService.createOutboundTicket({
            contactId,
            agentId,
            subject: subject || `Percakapan dengan ${templateName}`,
            category,
            priority,
        });

        const message = await prisma.message.create({
            data: {
                ticketId: ticket.id,
                direction: "OUTBOUND",
                type: "TEMPLATE",
                body: `[Template: ${templateName}]`,
                wamid,
                sentById: agentId,
                timestamp: new Date(),
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        emitNewTicket(ticket as unknown as Record<string, unknown>);
        emitNewMessage(ticket.id, message as unknown as Record<string, unknown>);

        res.status(201).json({ ticket, message });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to initiate conversation";
        console.error("[Ticket] initiateTicket error:", err);
        res.status(500).json({ message: msg });
    }
}
