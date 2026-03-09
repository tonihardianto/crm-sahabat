import prisma from "../lib/prisma";

/**
 * Ambil semua tiket, sorted by pesan terbaru.
 */
export async function getActiveTickets() {
    return prisma.ticket.findMany({
        where: { status: { not: "ARCHIVED" } },
        include: {
            contact: {
                include: { client: true },
            },
            assignedAgent: {
                select: { id: true, name: true },
            },
            claimedBy: {
                select: { id: true, name: true },
            },
            messages: {
                orderBy: { timestamp: "desc" },
                take: 1, // Hanya ambil pesan terakhir untuk preview
            },
            _count: {
                select: {
                    messages: {
                        where: { isRead: false, direction: "INBOUND" },
                    },
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });
}

/**
 * Ambil detail tiket beserta semua messages.
 */
export async function getTicketById(ticketId: string) {
    return prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
            contact: {
                include: { client: true },
            },
            assignedAgent: {
                select: { id: true, name: true },
            },
            claimedBy: {
                select: { id: true, name: true },
            },
            messages: {
                orderBy: { timestamp: "asc" },
                include: {
                    sentBy: { select: { id: true, name: true } },
                    replyTo: {
                        select: {
                            id: true,
                            body: true,
                            direction: true,
                            type: true,
                            sentBy: { select: { name: true } },
                        },
                    },
                },
            },
        },
    });
}

/**
 * Update status, category, atau priority tiket.
 */
export async function updateTicket(
    ticketId: string,
    data: {
        status?: "NEW" | "OPEN" | "PENDING" | "RESOLVED";
        category?: "BUG" | "FEATURE_REQUEST" | "SERVICE";
        priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    }
) {
    const updateData: Record<string, unknown> = { ...data };

    // Set resolvedAt jika status berubah ke RESOLVED
    if (data.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
    }

    return prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
            contact: {
                include: { client: true },
            },
            assignedAgent: {
                select: { id: true, name: true },
            },
        },
    });
}

/**
 * Claim tiket oleh agent.
 */
export async function claimTicket(ticketId: string, agentId: string) {
    return prisma.ticket.update({
        where: { id: ticketId },
        data: {
            claimedById: agentId,
            claimedAt: new Date(),
            assignedAgentId: agentId,
            status: "OPEN",
        },
        include: {
            contact: {
                include: { client: true },
            },
            claimedBy: {
                select: { id: true, name: true },
            },
        },
    });
}

/**
 * Buat tiket outbound (agen memulai percakapan terlebih dahulu).
 */
export async function createOutboundTicket(data: {
    contactId: string;
    agentId: string;
    subject?: string;
    category?: "BUG" | "FEATURE_REQUEST" | "SERVICE";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
    // Auto-generate ticket number
    const count = await prisma.ticket.count();
    const ticketNumber = `TKT-${String(count + 1).padStart(5, "0")}`;

    return prisma.ticket.create({
        data: {
            ticketNumber,
            contactId: data.contactId,
            status: "OPEN",
            category: data.category ?? "SERVICE",
            priority: data.priority ?? "MEDIUM",
            subject: data.subject ?? null,
            assignedAgentId: data.agentId,
            claimedById: data.agentId,
            claimedAt: new Date(),
        },
        include: {
            contact: {
                include: { client: true },
            },
            assignedAgent: { select: { id: true, name: true } },
            claimedBy: { select: { id: true, name: true } },
            messages: {
                orderBy: { timestamp: "asc" },
                include: { sentBy: { select: { id: true, name: true } } },
            },
        },
    });
}

/**
 * Archive tiket (ubah status ke ARCHIVED).
 */
export async function archiveTicket(ticketId: string) {
    return prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "ARCHIVED" },
    });
}

/**
 * Hapus tiket beserta semua messages-nya.
 */
export async function deleteTicket(ticketId: string) {
    await prisma.message.deleteMany({ where: { ticketId } });
    return prisma.ticket.delete({ where: { id: ticketId } });
}

/**
 * Ambil semua tiket yang di-archive.
 */
export async function getArchivedTickets() {
    return prisma.ticket.findMany({
        where: { status: "ARCHIVED" },
        include: {
            contact: { include: { client: true } },
            assignedAgent: { select: { id: true, name: true } },
            claimedBy: { select: { id: true, name: true } },
            messages: { orderBy: { timestamp: "desc" }, take: 1 },
            _count: { select: { messages: { where: { isRead: false, direction: "INBOUND" } } } },
        },
        orderBy: { updatedAt: "desc" },
    });
}

/**
 * Restore tiket dari arsip (ubah status kembali ke RESOLVED).
 */
export async function restoreTicket(ticketId: string) {
    return prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "RESOLVED" },
    });
}

