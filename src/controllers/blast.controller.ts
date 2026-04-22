import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as blastService from "../services/blast.service";

export async function listCampaigns(_req: Request, res: Response): Promise<void> {
    try {
        const campaigns = await blastService.listCampaigns();
        res.json(campaigns);
    } catch {
        res.status(500).json({ error: "Gagal mengambil daftar campaign" });
    }
}

export async function getCampaign(req: Request, res: Response): Promise<void> {
    try {
        const campaign = await blastService.getCampaignById(req.params.id as string);
        if (!campaign) {
            res.status(404).json({ error: "Campaign tidak ditemukan" });
            return;
        }
        res.json(campaign);
    } catch {
        res.status(500).json({ error: "Gagal mengambil campaign" });
    }
}

export async function createCampaign(req: AuthRequest, res: Response): Promise<void> {
    const { name, templateName, languageCode, components, contactIds, excelRecipients } = req.body as {
        name: string;
        templateName: string;
        languageCode?: string;
        components?: unknown[];
        contactIds?: string[];
        excelRecipients?: { phoneNumber: string; contactName: string; components?: unknown[] }[];
    };

    const hasContacts = Array.isArray(contactIds) && contactIds.length > 0;
    const hasExcel = Array.isArray(excelRecipients) && excelRecipients.length > 0;

    if (!name?.trim() || !templateName?.trim() || (!hasContacts && !hasExcel)) {
        res.status(400).json({ error: "name, templateName, dan minimal satu sumber penerima wajib diisi" });
        return;
    }

    try {
        const campaign = await blastService.createCampaign({
            name: name.trim(),
            templateName: templateName.trim(),
            languageCode,
            components,
            contactIds: hasContacts ? contactIds : undefined,
            excelRecipients: hasExcel ? excelRecipients : undefined,
        });
        res.status(201).json(campaign);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal membuat campaign";
        res.status(500).json({ error: msg });
    }
}

export async function startCampaign(req: AuthRequest, res: Response): Promise<void> {
    try {
        await blastService.startCampaign(req.params.id as string);
        res.json({ success: true, message: "Campaign dimulai" });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal memulai campaign";
        res.status(400).json({ error: msg });
    }
}

export async function cancelCampaign(req: AuthRequest, res: Response): Promise<void> {
    try {
        const campaign = await blastService.cancelCampaign(req.params.id as string);
        res.json(campaign);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal membatalkan campaign";
        res.status(400).json({ error: msg });
    }
}

export async function deleteCampaign(req: AuthRequest, res: Response): Promise<void> {
    try {
        await blastService.deleteCampaign(req.params.id as string);
        res.json({ success: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menghapus campaign";
        res.status(400).json({ error: msg });
    }
}
