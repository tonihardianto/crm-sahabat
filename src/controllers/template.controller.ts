import { Request, Response } from "express";
import * as templateService from "../services/template.service";

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
        const { name, bodyText, headerText, footerText, category, language } = req.body;
        if (!name || !bodyText) {
            res.status(400).json({ error: "name and bodyText are required" });
            return;
        }
        const template = await templateService.createTemplate({
            name, bodyText, headerText, footerText, category, language,
        });
        res.status(201).json(template);
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
