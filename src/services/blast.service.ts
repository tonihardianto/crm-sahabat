import prisma from "../lib/prisma";
import { sendTemplateMessage } from "../lib/whatsapp";
import { generateTicketNumber } from "../utils/generateTicketNumber";
import { emitNewTicket, emitNewMessage } from "../lib/socket";

/** Delay antar pengiriman untuk menghindari rate-limit Meta (~3 pesan/detik) */
const THROTTLE_MS = 350;

export async function listCampaigns() {
    return prisma.blastCampaign.findMany({
        include: { _count: { select: { recipients: true } } },
        orderBy: { createdAt: "desc" },
    });
}

export async function getCampaignById(id: string) {
    return prisma.blastCampaign.findUnique({
        where: { id },
        include: {
            recipients: { orderBy: { createdAt: "asc" } },
        },
    });
}

export async function createCampaign(data: {
    name: string;
    templateName: string;
    languageCode?: string;
    components?: unknown[];
    contactIds?: string[];
    excelRecipients?: { phoneNumber: string; contactName: string; components?: unknown[] }[];
}) {
    const seenPhones = new Set<string>();
    const recipients: { phoneNumber: string; contactName: string; components?: string }[] = [];

    // Dari kontak DB
    if (data.contactIds?.length) {
        const contacts = await prisma.contact.findMany({
            where: { id: { in: data.contactIds } },
            select: { id: true, name: true, phoneNumber: true, waId: true },
        });
        for (const c of contacts) {
            const phone = c.waId || c.phoneNumber;
            if (!seenPhones.has(phone)) {
                seenPhones.add(phone);
                recipients.push({ phoneNumber: phone, contactName: c.name });
            }
        }
    }

    // Dari import Excel
    if (data.excelRecipients?.length) {
        for (const r of data.excelRecipients) {
            const phone = r.phoneNumber.trim();
            if (!phone || seenPhones.has(phone)) continue;
            seenPhones.add(phone);
            recipients.push({
                phoneNumber: phone,
                contactName: r.contactName,
                components: r.components?.length ? JSON.stringify(r.components) : undefined,
            });
        }
    }

    if (recipients.length === 0) {
        throw new Error("Tidak ada kontak valid yang dipilih");
    }

    return prisma.blastCampaign.create({
        data: {
            name: data.name,
            templateName: data.templateName,
            languageCode: data.languageCode ?? "id",
            components: data.components?.length ? JSON.stringify(data.components) : null,
            totalRecipients: recipients.length,
            recipients: { create: recipients },
        },
        include: { recipients: true },
    });
}

export async function startCampaign(id: string): Promise<void> {
    const campaign = await prisma.blastCampaign.findUnique({
        where: { id },
        include: { recipients: { where: { status: "PENDING" }, select: { id: true, phoneNumber: true, contactName: true, components: true } } },
    });

    if (!campaign) throw new Error("Campaign tidak ditemukan");
    if (campaign.status !== "DRAFT") throw new Error("Campaign harus berstatus DRAFT untuk bisa dimulai");
    if (campaign.recipients.length === 0) throw new Error("Tidak ada penerima pending");

    await prisma.blastCampaign.update({
        where: { id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    // Jalankan pengiriman secara asinkron (fire-and-forget)
    executeCampaign(campaign).catch((err) => {
        console.error("[Blast] Unexpected error in executeCampaign:", err);
    });
}

/**
 * Cari tiket aktif untuk nomor WA tertentu, atau buat tiket baru jika belum ada.
 * Tiket baru langsung di-set RESOLVED agar tidak flood ticket list aktif —
 * akan dibuka kembali secara otomatis oleh webhook jika customer membalas.
 */
async function findOrCreateTicketForBlast(
    phoneNumber: string,
    contactName: string
): Promise<{ ticketId: string; contactId: string; contactName: string; isNew: boolean }> {
    // Cari contact berdasarkan waId atau phoneNumber
    let contact = await prisma.contact.findFirst({
        where: { OR: [{ waId: phoneNumber }, { phoneNumber }] },
        include: { client: true },
    });

    // Jika belum ada, buat contact baru di client "Unknown"
    if (!contact) {
        let unknownClient = await prisma.client.findFirst({ where: { customerId: "UNKNOWN" } });
        if (!unknownClient) {
            unknownClient = await prisma.client.create({
                data: { name: "Unknown", customerId: "UNKNOWN" },
            });
        }
        contact = await prisma.contact.create({
            data: {
                waId: phoneNumber,
                phoneNumber,
                name: contactName || "Unknown",
                clientId: unknownClient.id,
            },
            include: { client: true },
        });
    }

    // Cari tiket aktif (bukan ARCHIVED / RESOLVED)
    const activeTicket = await prisma.ticket.findFirst({
        where: { contactId: contact.id, status: { notIn: ["RESOLVED", "ARCHIVED"] } },
        orderBy: { createdAt: "desc" },
    });

    if (activeTicket) {
        return { ticketId: activeTicket.id, contactId: contact.id, contactName: contact.name, isNew: false };
    }

    // Buat tiket baru, langsung RESOLVED agar tidak flood ticket list
    const MAX_RETRIES = 5;
    let newTicket = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const ticketNumber = await generateTicketNumber();
        try {
            newTicket = await prisma.ticket.create({
                data: {
                    ticketNumber,
                    contactId: contact.id,
                    category: "SERVICE",
                    status: "RESOLVED",
                    priority: "MEDIUM",
                },
                include: {
                    contact: { include: { client: true } },
                    assignedAgent: { select: { id: true, name: true } },
                    claimedBy: { select: { id: true, name: true } },
                    messages: true,
                    _count: { select: { messages: { where: { isRead: false, direction: "INBOUND" } } } },
                },
            });
            break;
        } catch (e: unknown) {
            const isUniqueViolation = e instanceof Error && (e as { code?: string }).code === "P2002";
            if (isUniqueViolation && attempt < MAX_RETRIES - 1) continue;
            throw e;
        }
    }
    if (!newTicket) throw new Error("Gagal membuat tiket untuk blast recipient");

    return { ticketId: newTicket.id, contactId: contact.id, contactName: contact.name, isNew: true };
}

async function executeCampaign(campaign: {
    id: string;
    templateName: string;
    languageCode: string | null;
    components: string | null;
    recipients: { id: string; phoneNumber: string; contactName: string | null; components?: string | null }[];
}) {
    const languageCode = campaign.languageCode ?? "id";
    const campaignComponents: unknown[] = campaign.components ? JSON.parse(campaign.components) : [];

    for (const recipient of campaign.recipients) {
        // Gunakan komponen per-penerima jika ada (dari import Excel), fallback ke campaign
        const components: unknown[] = recipient.components
            ? JSON.parse(recipient.components)
            : campaignComponents;
        // Cek apakah campaign dibatalkan di tengah jalan
        const current = await prisma.blastCampaign.findUnique({
            where: { id: campaign.id },
            select: { status: true },
        });
        if (current?.status === "CANCELLED") break;

        try {
            const { wamid } = await sendTemplateMessage(
                recipient.phoneNumber,
                campaign.templateName,
                languageCode,
                components
            );
            await prisma.blastRecipient.update({
                where: { id: recipient.id },
                data: { status: "SENT", wamid, sentAt: new Date() },
            });
            await prisma.blastCampaign.update({
                where: { id: campaign.id },
                data: { sentCount: { increment: 1 } },
            });

            // Simpan pesan blast ke tiket (buat tiket jika belum ada)
            try {
                const { ticketId, contactName, isNew } = await findOrCreateTicketForBlast(
                    recipient.phoneNumber,
                    recipient.contactName ?? "Unknown"
                );
                const savedMessage = await prisma.message.create({
                    data: {
                        ticketId,
                        direction: "OUTBOUND",
                        type: "TEXT",
                        body: `[Blast: ${campaign.templateName}]`,
                        wamid,
                        timestamp: new Date(),
                        isRead: true,
                    },
                    include: {
                        sentBy: { select: { id: true, name: true } },
                        replyTo: { select: { id: true, body: true, direction: true, type: true, sentBy: { select: { name: true } } } },
                    },
                });
                await prisma.ticket.update({
                    where: { id: ticketId },
                    data: { updatedAt: new Date() },
                });
                if (isNew) {
                    // Emit tiket baru agar muncul di ticket list realtime
                    const fullTicket = await prisma.ticket.findUnique({
                        where: { id: ticketId },
                        include: {
                            contact: { include: { client: true } },
                            assignedAgent: { select: { id: true, name: true } },
                            claimedBy: { select: { id: true, name: true } },
                            messages: { orderBy: { timestamp: "desc" }, take: 1 },
                            _count: { select: { messages: { where: { isRead: false, direction: "INBOUND" } } } },
                        },
                    });
                    if (fullTicket) emitNewTicket(fullTicket as unknown as Record<string, unknown>);
                }
                emitNewMessage(ticketId, savedMessage as unknown as Record<string, unknown>, { name: contactName });
            } catch (ticketErr) {
                // Jangan gagalkan blast hanya karena gagal buat tiket
                console.error(`[Blast] Failed to save message to ticket for ${recipient.phoneNumber}:`, ticketErr);
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            await prisma.blastRecipient.update({
                where: { id: recipient.id },
                data: { status: "FAILED", errorMessage: errMsg },
            });
            await prisma.blastCampaign.update({
                where: { id: campaign.id },
                data: { failedCount: { increment: 1 } },
            });
            console.error(`[Blast] Failed to send to ${recipient.phoneNumber}:`, errMsg);
        }

        // Throttle agar tidak kena rate-limit Meta
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
    }

    // Tandai selesai hanya jika tidak dibatalkan
    const final = await prisma.blastCampaign.findUnique({
        where: { id: campaign.id },
        select: { status: true },
    });
    if (final?.status === "IN_PROGRESS") {
        await prisma.blastCampaign.update({
            where: { id: campaign.id },
            data: { status: "COMPLETED", completedAt: new Date() },
        });
        console.log(`[Blast] Campaign ${campaign.id} completed`);
    }
}

export async function cancelCampaign(id: string) {
    const campaign = await prisma.blastCampaign.findUnique({
        where: { id },
        select: { status: true },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");
    if (campaign.status !== "DRAFT" && campaign.status !== "IN_PROGRESS") {
        throw new Error("Campaign tidak bisa dibatalkan");
    }
    return prisma.blastCampaign.update({
        where: { id },
        data: { status: "CANCELLED" },
    });
}

export async function deleteCampaign(id: string) {
    const campaign = await prisma.blastCampaign.findUnique({
        where: { id },
        select: { status: true },
    });
    if (!campaign) throw new Error("Campaign tidak ditemukan");
    if (campaign.status === "IN_PROGRESS") throw new Error("Tidak bisa menghapus campaign yang sedang berjalan");
    return prisma.blastCampaign.delete({ where: { id } });
}

/** Dipanggil dari webhook service saat pesan blast ter-deliver */
export async function markBlastRecipientDelivered(wamid: string, deliveredAt: Date): Promise<void> {
    try {
        await prisma.blastRecipient.updateMany({
            where: { wamid },
            data: { deliveredAt },
        });
    } catch {
        // wamid mungkin bukan blast recipient — abaikan
    }
}
