import prisma from "../lib/prisma";

export async function getDashboardStats() {
    const [
        totalActive,
        totalResolved,
        byStatus,
        byCategory,
        byPriority,
        unassigned,
        totalClients,
        totalContacts,
        totalAgents,
        recentTickets,
    ] = await Promise.all([
        // Total tiket aktif (bukan RESOLVED)
        prisma.ticket.count({
            where: { status: { not: "RESOLVED" } },
        }),

        // Total tiket resolved
        prisma.ticket.count({
            where: { status: "RESOLVED" },
        }),

        // Breakdown per status
        prisma.ticket.groupBy({
            by: ["status"],
            _count: { id: true },
            where: { status: { not: "RESOLVED" } },
        }),

        // Breakdown per kategori
        prisma.ticket.groupBy({
            by: ["category"],
            _count: { id: true },
            where: { status: { not: "RESOLVED" } },
        }),

        // Breakdown per priority
        prisma.ticket.groupBy({
            by: ["priority"],
            _count: { id: true },
            where: { status: { not: "RESOLVED" } },
        }),

        // Tiket belum di-claim
        prisma.ticket.count({
            where: {
                status: { not: "RESOLVED" },
                claimedById: null,
            },
        }),

        // Total clients (RS)
        prisma.client.count(),

        // Total contacts
        prisma.contact.count(),

        // Total agents (users)
        prisma.user.count(),

        // Recent tickets (last 10)
        prisma.ticket.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                contact: {
                    include: { client: true },
                },
                claimedBy: { select: { name: true } },
                assignedAgent: { select: { name: true } },
                _count: { select: { messages: true } },
            },
        }),
    ]);

    // Format status counts into object
    const statusCounts: Record<string, number> = {};
    for (const s of byStatus) {
        statusCounts[s.status] = s._count.id;
    }

    const categoryCounts: Record<string, number> = {};
    for (const c of byCategory) {
        categoryCounts[c.category] = c._count.id;
    }

    const priorityCounts: Record<string, number> = {};
    for (const p of byPriority) {
        priorityCounts[p.priority] = p._count.id;
    }

    return {
        totalActive,
        totalResolved,
        unassigned,
        totalClients,
        totalContacts,
        totalAgents,
        status: statusCounts,
        category: categoryCounts,
        priority: priorityCounts,
        recentTickets,
    };
}
