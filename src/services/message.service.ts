import prisma from "../lib/prisma";
import { emitNewMessage } from "../lib/socket";
import { sendTextMessage, sendMediaMessage } from "../lib/whatsapp";

export async function markInboundMessagesRead(ticketId: string): Promise<void> {
    await prisma.message.updateMany({
        where: { ticketId, isRead: false, direction: "INBOUND" },
        data: { isRead: true },
    });
}

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

/**
 * Kirim pesan media (image/document/audio/video) outbound ke WA
 */
export async function createMediaMessage(
    ticketId: string,
    data: {
        type: "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";
        mediaUrl: string;
        body: string; // caption atau nama file
        filename?: string;
        sentById?: string;
    }
) {
    let wamid: string | undefined;

    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { contact: { select: { waId: true, phoneNumber: true } } },
    });

    if (!ticket || !ticket.contact) throw new Error("Ticket or contact not found");

    const recipientPhone = ticket.contact.waId || ticket.contact.phoneNumber;
    const waType = data.type.toLowerCase() as "image" | "document" | "audio" | "video";

    try {
        const result = await sendMediaMessage(
            recipientPhone,
            waType,
            data.mediaUrl,
            data.body || undefined,
            data.filename
        );
        wamid = result.wamid;
    } catch (error) {
        console.error("[Message] Failed to send media via WhatsApp:", error);
    }

    const message = await prisma.message.create({
        data: {
            ticketId,
            direction: "OUTBOUND",
            type: data.type,
            body: data.body,
            mediaUrl: data.mediaUrl,
            sentById: data.sentById,
            wamid: wamid || undefined,
            timestamp: new Date(),
        },
        include: { sentBy: { select: { id: true, name: true } } },
    });

    await prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
    emitNewMessage(ticketId, message);
    return message;
}
