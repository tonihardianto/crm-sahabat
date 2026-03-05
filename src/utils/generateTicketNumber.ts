import prisma from "../lib/prisma";

/**
 * Generate nomor tiket sequential: TKT-00001, TKT-00002, dst.
 * Mengambil tiket terakhir lalu increment nomornya.
 */
export async function generateTicketNumber(): Promise<string> {
    const lastTicket = await prisma.ticket.findFirst({
        orderBy: { createdAt: "desc" },
        select: { ticketNumber: true },
    });

    let nextNumber = 1;

    if (lastTicket?.ticketNumber) {
        const match = lastTicket.ticketNumber.match(/TKT-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `TKT-${nextNumber.toString().padStart(5, "0")}`;
}
