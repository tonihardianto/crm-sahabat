import { Request, Response } from "express";
import * as templateService from "../services/template.service";
import { submitMetaTemplate, deleteMetaTemplate } from "../lib/whatsapp";
import { TemplateStatus } from "@prisma/client";

export async function listTemplates(_req: Request, res: Response): Promise<void> {
    try {
        const templates = await templateService.listTemplates();
        res.json(templates);
    } catch (error) {
        console.error("[Template] Error listing templates:", error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
    try {
        const { name, bodyText, headerText, footerText, buttons, category, language, bodySamples, headerSample } = req.body;
        if (!name || !bodyText) {
            res.status(400).json({ error: "name and bodyText are required" });
            return;
        }

        // Submit ke Meta untuk approval
        let metaId: string | undefined;
        let status: TemplateStatus = 'PENDING';
        let metaError: string | undefined;
        try {
            const metaResult = await submitMetaTemplate({
                name, bodyText, headerText, footerText,
                category: category || 'UTILITY',
                language: language || 'id',
                buttons: buttons || [],
                bodySamples: bodySamples || [],
                headerSample: headerSample || '',
            });
            metaId = metaResult.id;
            status = (metaResult.status === 'APPROVED' ? 'APPROVED' :
                      metaResult.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as TemplateStatus;
        } catch (err) {
            console.error("[Template] Meta submission failed:", err);
            metaError = err instanceof Error ? err.message : String(err);
        }

        const template = await templateService.createTemplate({
            name, bodyText, headerText, footerText, buttons, category, language, metaId, status,
        });
        res.status(201).json({ ...template, metaError });
    } catch (error) {
        console.error("[Template] Error creating template:", error);
        res.status(500).json({ error: "Failed to create template" });
    }
}

export async function updateTemplate(req: Request, res: Response): Promise<void> {
    try {
        const existing = await templateService.getTemplate(req.params.id as string);
        if (!existing) {
            res.status(404).json({ error: "Template not found" });
            return;
        }

        const { name, bodyText, headerText, footerText, buttons, category, language, bodySamples, headerSample } = req.body;

        // Hapus template lama dari Meta (jika ada metaId/name), lalu submit ulang
        let metaId: string | undefined = existing.metaId ?? undefined;
        let status: TemplateStatus = 'PENDING';
        let metaError: string | undefined;
        try {
            // Hapus dari Meta dulu
            await deleteMetaTemplate(existing.name);
        } catch (err) {
            console.warn("[Template] Could not delete old Meta template (may not exist):", err);
        }
        try {
            const metaResult = await submitMetaTemplate({
                name: name ?? existing.name,
                bodyText: bodyText ?? existing.bodyText,
                headerText: headerText ?? existing.headerText,
                footerText: footerText ?? existing.footerText,
                category: category ?? existing.category,
                language: language ?? existing.language,
                buttons: buttons ?? (existing.buttons as object[] | undefined) ?? [],
                bodySamples: bodySamples || [],
                headerSample: headerSample || '',
            });
            metaId = metaResult.id;
            status = (metaResult.status === 'APPROVED' ? 'APPROVED' :
                      metaResult.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as TemplateStatus;
        } catch (err) {
            console.error("[Template] Meta re-submission failed:", err);
            metaError = err instanceof Error ? err.message : String(err);
            status = existing.status as TemplateStatus;
        }

        const template = await templateService.updateTemplate(req.params.id as string, {
            ...req.body,
            metaId,
            status,
        });
        res.json({ ...template, metaError });
    } catch (error) {
        console.error("[Template] Error updating template:", error);
        res.status(500).json({ error: "Failed to update template" });
    }
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
        const existing = await templateService.getTemplate(req.params.id as string);
        if (!existing) {
            res.status(404).json({ error: "Template not found" });
            return;
        }

        // Hapus dari Meta
        try {
            await deleteMetaTemplate(existing.name);
        } catch (err) {
            console.warn("[Template] Could not delete from Meta (may not exist):", err);
        }

        await templateService.deleteTemplate(req.params.id as string);
        res.json({ success: true });
    } catch (error) {
        console.error("[Template] Error deleting template:", error);
        res.status(500).json({ error: "Failed to delete template" });
    }
}

export async function syncTemplates(_req: Request, res: Response): Promise<void> {
    try {
        const result = await templateService.syncTemplatesFromMeta();
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[Template] Error syncing templates from Meta:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Failed to sync templates" });
    }
}
