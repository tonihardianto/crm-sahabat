import prisma from "../lib/prisma";
import { emitNewMessage } from "../lib/socket";
import { sendTextMessage } from "../lib/whatsapp";

/**
 * Kirim pesan outbound (ke WA) atau internal note.
 *
 * Jika direction = OUTBOUND:
 *  1. Cari nomor WA kontak dari ticket → contact → waId
 *  2. Kirim pesan via WhatsApp Cloud API
 *  3. Simpan ke DB (termasuk wamid)
 *
 * Jika direction = INTERNAL:
 *  - Hanya simpan ke DB (tidak dikirim ke WA)
 */
export async function createMessage(
    ticketId: string,
    data: {
        body: string;
        direction: "OUTBOUND" | "INTERNAL";
        sentById?: string;
    }
) {
    let wamid: string | undefined;

    // --- Kirim ke WhatsApp jika OUTBOUND ---
    if (data.direction === "OUTBOUND") {
        // Ambil nomor WA kontak dari ticket
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                contact: { select: { waId: true, phoneNumber: true } },
            },
        });

        if (!ticket || !ticket.contact) {
            throw new Error("Ticket or contact not found");
        }

        const recipientPhone = ticket.contact.waId || ticket.contact.phoneNumber;

        try {
            const result = await sendTextMessage(recipientPhone, data.body);
            wamid = result.wamid;
        } catch (error) {
            console.error("[Message] Failed to send via WhatsApp:", error);
            // Tetap simpan pesan ke DB meskipun gagal kirim —
            // agent bisa lihat bahwa pesan gagal terkirim
        }
    }

    // --- Simpan ke database ---
    const message = await prisma.message.create({
        data: {
            ticketId,
            direction: data.direction,
            type: "TEXT",
            body: data.body,
            sentById: data.sentById,
            wamid: wamid || undefined,
            timestamp: new Date(),
        },
        include: {
            sentBy: {
                select: { id: true, name: true },
            },
        },
    });

    // Update ticket updatedAt
    await prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
    });

    // Emit real-time event
    emitNewMessage(ticketId, message);

    return message;
}
