import prisma from "../lib/prisma";
import { sendTemplateMessage } from "../lib/whatsapp";

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
    contactIds: string[];
}) {
    const contacts = await prisma.contact.findMany({
        where: { id: { in: data.contactIds } },
        select: { id: true, name: true, phoneNumber: true, waId: true },
    });

    // Deduplikasi berdasarkan nomor telepon
    const seenPhones = new Set<string>();
    const recipients: { phoneNumber: string; contactName: string }[] = [];
    for (const c of contacts) {
        const phone = c.waId || c.phoneNumber;
        if (!seenPhones.has(phone)) {
            seenPhones.add(phone);
            recipients.push({ phoneNumber: phone, contactName: c.name });
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
        include: { recipients: { where: { status: "PENDING" } } },
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

async function executeCampaign(campaign: {
    id: string;
    templateName: string;
    languageCode: string | null;
    components: string | null;
    recipients: { id: string; phoneNumber: string }[];
}) {
    const languageCode = campaign.languageCode ?? "id";
    const components: unknown[] = campaign.components ? JSON.parse(campaign.components) : [];

    for (const recipient of campaign.recipients) {
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
