import { Request, Response } from "express";
import * as contactService from "../services/contact.service";

export async function listContacts(_req: Request, res: Response): Promise<void> {
    try {
        const contacts = await contactService.listContacts();
        res.json(contacts);
    } catch (error) {
        console.error("[Contact] Error listing contacts:", error);
        res.status(500).json({ error: "Failed to fetch contacts" });
    }
}

export async function createContact(req: Request, res: Response): Promise<void> {
    try {
        const { name, phoneNumber, clientId, waId, position } = req.body;
        if (!name || !phoneNumber || !clientId) {
            res.status(400).json({ error: "name, phoneNumber, and clientId are required" });
            return;
        }
        const contact = await contactService.createContact({ name, phoneNumber, clientId, waId, position });
        res.status(201).json(contact);
    } catch (error) {
        console.error("[Contact] Error creating contact:", error);
        res.status(500).json({ error: "Failed to create contact" });
    }
}

export async function updateContact(req: Request, res: Response): Promise<void> {
    try {
        const contact = await contactService.updateContact(req.params.id as string, req.body);
        res.json(contact);
    } catch (error) {
        console.error("[Contact] Error updating contact:", error);
        res.status(500).json({ error: "Failed to update contact" });
    }
}

export async function deleteContact(req: Request, res: Response): Promise<void> {
    try {
        await contactService.deleteContact(req.params.id as string);
        res.json({ success: true });
    } catch (error) {
        console.error("[Contact] Error deleting contact:", error);
        res.status(500).json({ error: "Failed to delete contact" });
    }
}
