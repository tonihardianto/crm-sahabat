import { Request, Response } from "express";
import * as templateService from "../services/template.service";
import { submitMetaTemplate } from "../lib/whatsapp";
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
        const { name, bodyText, headerText, footerText, buttons, category, language } = req.body;
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
        const template = await templateService.updateTemplate(req.params.id as string, req.body);
        res.json(template);
    } catch (error) {
        console.error("[Template] Error updating template:", error);
        res.status(500).json({ error: "Failed to update template" });
    }
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
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
