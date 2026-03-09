import { Request, Response } from "express";
import * as ticketService from "../services/ticket.service";
import { sendTemplateMessage } from "../lib/whatsapp";
import { emitNewTicket, emitNewMessage, emitHandover, emitAssign } from "../lib/socket";
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

export async function handoverTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        const fromAgentId = req.user?.userId;
        const { toAgentId } = req.body;
        const ticketId = req.params.id as string;

        if (!toAgentId) {
            res.status(400).json({ error: "toAgentId is required" });
            return;
        }

        const [ticket, fromAgent, toAgent] = await Promise.all([
            prisma.ticket.findUnique({ where: { id: ticketId }, include: { contact: { include: { client: true } }, claimedBy: true } }),
            fromAgentId ? prisma.user.findUnique({ where: { id: fromAgentId } }) : null,
            prisma.user.findUnique({ where: { id: toAgentId } }),
        ]);

        if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
        if (!toAgent) { res.status(404).json({ error: "Target agent not found" }); return; }

        // Update claimedById ke agen tujuan
        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: { claimedById: toAgentId, claimedAt: new Date() },
            include: {
                contact: { include: { client: true } },
                claimedBy: { select: { id: true, name: true } },
                assignedAgent: { select: { id: true, name: true } },
                messages: { include: { sentBy: { select: { id: true, name: true } } }, orderBy: { timestamp: 'asc' } },
            },
        });

        // Buat internal note otomatis
        const noteBody = `Ticket diserahkan dari ${fromAgent?.name ?? 'Agen'} ke ${toAgent.name}`;
        const note = await prisma.message.create({
            data: {
                ticketId,
                direction: "INTERNAL",
                type: "TEXT",
                body: noteBody,
                sentById: fromAgentId || null,
                isSystemNote: true,
                timestamp: new Date(),
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        // Emit socket events
        emitNewMessage(ticketId, note as unknown as Record<string, unknown>);
        emitHandover({
            ticketId,
            ticketNumber: ticket.ticketNumber,
            contactName: ticket.contact.name,
            fromAgent: fromAgent?.name ?? 'Agen',
            toAgentId,
            toAgentName: toAgent.name,
        });

        res.json(updated);
    } catch (error) {
        console.error("[Ticket] Error handover ticket:", error);
        res.status(500).json({ error: "Failed to handover ticket" });
    }
}

/**
 * POST /api/tickets/:id/assign
 * Admin meng-assign tiket ke agen tertentu.
 */
export async function assignTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        const adminId = req.user?.userId;
        const { agentId } = req.body;
        const ticketId = req.params.id as string;

        if (!agentId) {
            res.status(400).json({ error: "agentId is required" });
            return;
        }

        const [ticket, agent, admin] = await Promise.all([
            prisma.ticket.findUnique({ where: { id: ticketId }, include: { contact: { include: { client: true } } } }),
            prisma.user.findUnique({ where: { id: agentId } }),
            adminId ? prisma.user.findUnique({ where: { id: adminId } }) : null,
        ]);

        if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
        if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: { assignedAgentId: agentId },
            include: {
                contact: { include: { client: true } },
                claimedBy: { select: { id: true, name: true } },
                assignedAgent: { select: { id: true, name: true } },
                messages: { include: { sentBy: { select: { id: true, name: true } } }, orderBy: { timestamp: 'asc' } },
            },
        });

        // Buat internal note otomatis
        const noteBody = `Tiket di-assign ke ${agent.name} oleh ${admin?.name ?? 'Admin'}`;
        const note = await prisma.message.create({
            data: {
                ticketId,
                direction: "INTERNAL",
                type: "TEXT",
                body: noteBody,
                sentById: adminId || null,
                isSystemNote: true,
                timestamp: new Date(),
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        emitNewMessage(ticketId, note as unknown as Record<string, unknown>);
        emitAssign({
            ticketId,
            ticketNumber: ticket.ticketNumber,
            contactName: ticket.contact.name,
            agentId,
            agentName: agent.name,
            assignedBy: admin?.name ?? 'Admin',
        });

        res.json(updated);
    } catch (error) {
        console.error("[Ticket] Error assigning ticket:", error);
        res.status(500).json({ error: "Failed to assign ticket" });
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

/**
 * GET /api/tickets/archived
 * Ambil semua tiket yang di-archive.
 */
export async function listArchivedTickets(_req: Request, res: Response): Promise<void> {
    try {
        const tickets = await ticketService.getArchivedTickets();
        res.json(tickets);
    } catch (error) {
        console.error("[Ticket] Error listing archived tickets:", error);
        res.status(500).json({ error: "Failed to fetch archived tickets" });
    }
}

/**
 * PATCH /api/tickets/:id/restore
 * Kembalikan tiket dari arsip ke status RESOLVED.
 */
export async function restoreTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        const ticketId = req.params.id as string;
        const ticket = await ticketService.restoreTicket(ticketId);
        res.json(ticket);
    } catch (error) {
        console.error("[Ticket] Error restoring ticket:", error);
        res.status(500).json({ error: "Failed to restore ticket" });
    }
}

/**
 * PATCH /api/tickets/:id/archive
 * Archive tiket (mengubah status ke ARCHIVED).
 */
export async function archiveTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        const ticketId = req.params.id as string;
        const ticket = await ticketService.archiveTicket(ticketId);
        res.json(ticket);
    } catch (error) {
        console.error("[Ticket] Error archiving ticket:", error);
        res.status(500).json({ error: "Failed to archive ticket" });
    }
}

/**
 * DELETE /api/tickets/:id
 * Hapus tiket permanen (admin only).
 */
export async function deleteTicket(req: AuthRequest, res: Response): Promise<void> {
    try {
        const ticketId = req.params.id as string;
        await ticketService.deleteTicket(ticketId);
        res.json({ success: true });
    } catch (error) {
        console.error("[Ticket] Error deleting ticket:", error);
        res.status(500).json({ error: "Failed to delete ticket" });
    }
}

/**
 * POST /api/tickets/:id/send-template
 * Kirim template message ke percakapan yang sudah ada (saat 24h window tertutup).
 */
export async function sendTemplateToTicket(req: AuthRequest, res: Response): Promise<void> {
    const ticketId = req.params.id as string;
    const { templateName, languageCode = "id", components = [], resolvedBody } = req.body as {
        templateName: string; languageCode?: string; components?: unknown[]; resolvedBody?: string;
    };
    const agentId = req.user?.userId;

    if (!templateName) {
        res.status(400).json({ message: "templateName is required" });
        return;
    }
    if (!agentId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { contact: { select: { phoneNumber: true, waId: true } } },
        }) as ({ contact: { phoneNumber: string; waId: string | null } } & { id: string }) | null;
        if (!ticket) {
            res.status(404).json({ message: "Ticket not found" });
            return;
        }

        const toPhone = ticket.contact.waId || ticket.contact.phoneNumber;
        const { wamid } = await sendTemplateMessage(toPhone, templateName, languageCode as string, components as never[]);

        const message = await prisma.message.create({
            data: {
                ticketId,
                direction: "OUTBOUND",
                type: "TEMPLATE",
                body: resolvedBody || `[Template: ${templateName}]`,
                wamid,
                sentById: agentId,
                timestamp: new Date(),
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        emitNewMessage(ticketId, message as unknown as Record<string, unknown>);
        res.json({ message });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send template";
        console.error("[Ticket] sendTemplateToTicket error:", err);
        res.status(500).json({ message: msg });
    }
}
