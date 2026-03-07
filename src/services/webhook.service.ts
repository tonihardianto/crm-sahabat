import prisma from "../lib/prisma";
import { emitNewMessage, emitNewTicket } from "../lib/socket";
import { generateTicketNumber } from "../utils/generateTicketNumber";
import { markAsRead, getMediaUrl, downloadMedia } from "../lib/whatsapp";
import fs from "fs";
import path from "path";

// ============================================================
// Types — WhatsApp Cloud API Webhook Payload
// ============================================================

interface WAContact {
    profile: { name: string };
    wa_id: string;
}

interface WAMessage {
    from: string;
    id: string; // wamid
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: { id: string; mime_type: string; caption?: string };
    video?: { id: string; mime_type: string; caption?: string };
    document?: { id: string; mime_type: string; filename?: string; caption?: string };
    audio?: { id: string; mime_type: string };
}

interface WAValue {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: WAContact[];
    messages?: WAMessage[];
}

interface WAChange {
    value: WAValue;
    field: string;
}

export interface WAWebhookPayload {
    object: string;
    entry: Array<{
        id: string;
        changes: WAChange[];
    }>;
}

// ============================================================
// Service Functions
// ============================================================

/**
 * Cari Contact berdasarkan wa_id.
 * Jika tidak ditemukan, buat kontak baru dengan Client "Unknown Client".
 */
async function findOrCreateContact(waId: string, profileName: string) {
    // Cari kontak yang sudah ada
    let contact = await prisma.contact.findUnique({
        where: { waId },
        include: { client: true },
    });

    if (contact) {
        return contact;
    }

    // Cari atau buat "Unknown Client" sebagai placeholder
    let unknownClient = await prisma.client.findFirst({
        where: { customerId: "UNKNOWN" },
    });

    if (!unknownClient) {
        unknownClient = await prisma.client.create({
            data: {
                name: "Unknown Client",
                customerId: "UNKNOWN",
            },
        });
    }

    // Gunakan upsert untuk menghindari race condition jika pesan datang bersamaan
    contact = await prisma.contact.upsert({
        where: { waId },
        update: {},
        create: {
            waId,
            phoneNumber: waId,
            name: profileName || "Unknown",
            clientId: unknownClient.id,
        },
        include: { client: true },
    });

    console.log(`[Webhook] New contact created: ${contact.name} (${waId})`);
    return contact;
}

/**
 * Cari Ticket aktif (status != RESOLVED) untuk kontak.
 * Jika tidak ada, buat tiket baru dengan status NEW dan kategori SERVICE.
 */
async function findOrCreateTicket(contactId: string) {
    // Cari tiket aktif (bukan RESOLVED)
    let ticket = await prisma.ticket.findFirst({
        where: {
            contactId,
            status: { not: "RESOLVED" },
        },
        orderBy: { createdAt: "desc" },
    });

    if (ticket) {
        // Jika status NEW, ubah ke OPEN karena ada pesan masuk
        if (ticket.status === "NEW") {
            ticket = await prisma.ticket.update({
                where: { id: ticket.id },
                data: { status: "OPEN" },
            });
        }
        return { ticket, isNew: false };
    }

    // Buat tiket baru
    const ticketNumber = await generateTicketNumber();

    ticket = await prisma.ticket.create({
        data: {
            ticketNumber,
            contactId,
            category: "SERVICE",
            status: "NEW",
            priority: "MEDIUM",
        },
    });

    console.log(`[Webhook] New ticket created: ${ticket.ticketNumber}`);
    return { ticket, isNew: true };
}

/**
 * Simpan pesan ke tabel Message dengan deduplication via wamid.
 */
async function saveMessage(ticketId: string, waMessage: WAMessage) {
    // Deduplication: cek apakah wamid sudah ada
    const existing = await prisma.message.findUnique({
        where: { wamid: waMessage.id },
    });

    if (existing) {
        console.log(`[Webhook] Duplicate message ignored: ${waMessage.id}`);
        return null;
    }

    // Tentukan tipe pesan dan body
    const type = mapMessageType(waMessage.type);
    const body = extractMessageBody(waMessage);

    // Download media jika bukan TEXT
    let mediaUrl: string | undefined;
    if (type !== "TEXT") {
        const mediaId =
            waMessage.image?.id ||
            waMessage.video?.id ||
            waMessage.document?.id ||
            waMessage.audio?.id;

        if (mediaId) {
            try {
                const { url, mime_type } = await getMediaUrl(mediaId);
                const { buffer, contentType } = await downloadMedia(url);

                // Tentukan ekstensi dari mime type
                const ext = (contentType || mime_type).split("/")[1]?.split(";")[0] || "bin";
                const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

                // Pastikan folder uploads ada
                const uploadsDir = path.join(process.cwd(), "uploads");
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

                fs.writeFileSync(path.join(uploadsDir, filename), buffer);

                const appUrl = process.env.APP_URL || "https://crm.sahabatmedia.co.id";
                mediaUrl = `${appUrl}/uploads/${filename}`;
                console.log(`[Webhook] Media saved: ${mediaUrl}`);
            } catch (err) {
                console.error(`[Webhook] Failed to download media ${mediaId}:`, err);
            }
        }
    }

    const message = await prisma.message.create({
        data: {
            ticketId,
            direction: "INBOUND",
            type,
            body,
            mediaUrl: mediaUrl || null,
            wamid: waMessage.id,
            timestamp: new Date(parseInt(waMessage.timestamp) * 1000),
        },
    });

    return message;
}

/**
 * Map tipe pesan WhatsApp ke enum MessageType di Prisma.
 */
function mapMessageType(waType: string): "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" {
    const typeMap: Record<string, "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO"> = {
        text: "TEXT",
        image: "IMAGE",
        video: "VIDEO",
        document: "DOCUMENT",
        audio: "AUDIO",
    };
    return typeMap[waType] || "TEXT";
}

/**
 * Extract body/konten dari pesan berdasarkan tipenya.
 */
function extractMessageBody(waMessage: WAMessage): string {
    switch (waMessage.type) {
        case "text":
            return waMessage.text?.body || "";
        case "image":
            return waMessage.image?.caption || "[Image]";
        case "video":
            return waMessage.video?.caption || "[Video]";
        case "document":
            return waMessage.document?.filename || "[Document]";
        case "audio":
            return "[Audio]";
        default:
            return `[${waMessage.type}]`;
    }
}

/**
 * Orchestrator utama: process pesan masuk dari WhatsApp webhook.
 * 1. Find/create contact
 * 2. Find/create ticket
 * 3. Save message
 * 4. Emit Socket.io events
 */
export async function processIncomingMessage(payload: WAWebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
        for (const change of entry.changes) {
            if (change.field !== "messages") continue;

            const value = change.value;
            if (!value.messages || !value.contacts) continue;

            for (const waMessage of value.messages) {
                try {
                    // 1) Cari profil kontak dari payload
                    const waContact = value.contacts.find((c) => c.wa_id === waMessage.from);
                    const profileName = waContact?.profile?.name || "Unknown";

                    // 2) Find or create contact
                    const contact = await findOrCreateContact(waMessage.from, profileName);

                    // 3) Find or create ticket
                    const { ticket, isNew: isNewTicket } = await findOrCreateTicket(contact.id);

                    // 4) Save message (with deduplication)
                    const message = await saveMessage(ticket.id, waMessage);

                    if (!message) continue; // Duplicate, skip emit

                    // 5) Emit Socket.io events
                    if (isNewTicket) {
                        emitNewTicket({
                            ...ticket,
                            contact: {
                                id: contact.id,
                                name: contact.name,
                                phoneNumber: contact.phoneNumber,
                                client: { id: contact.client.id, name: contact.client.name },
                            },
                        });
                    }

                    emitNewMessage(ticket.id, message, { name: contact.name });

                    console.log(
                        `[Webhook] Message processed: ${waMessage.id} → Ticket ${ticket.ticketNumber}`
                    );

                    // 6) Mark message as read (centang biru) — fire and forget
                    markAsRead(waMessage.id).catch((err) =>
                        console.error("[Webhook] Failed to mark as read:", err)
                    );
                } catch (error) {
                    console.error(`[Webhook] Error processing message ${waMessage.id}:`, error);
                }
            }
        }
    }
}
