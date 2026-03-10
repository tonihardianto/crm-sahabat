import { Request, Response } from "express";
import * as clientService from "../services/client.service";

export async function listClients(_req: Request, res: Response): Promise<void> {
    try {
        const clients = await clientService.listClients();
        res.json(clients);
    } catch (error) {
        console.error("[Client] Error listing clients:", error);
        res.status(500).json({ error: "Failed to fetch clients" });
    }
}

export async function getClient(req: Request, res: Response): Promise<void> {
    try {
        const client = await clientService.getClientById(req.params.id as string);
        if (!client) {
            res.status(404).json({ error: "Client not found" });
            return;
        }
        res.json(client);
    } catch (error) {
        console.error("[Client] Error fetching client:", error);
        res.status(500).json({ error: "Failed to fetch client" });
    }
}

export async function createClient(req: Request, res: Response): Promise<void> {
    try {
        const { name, address, phone, picId, slaTier, status } = req.body;
        if (!name) {
            res.status(400).json({ error: "name is required" });
            return;
        }
        const client = await clientService.createClient({ name, address, phone, picId: picId || undefined, slaTier, status });
        res.status(201).json(client);
    } catch (error) {
        console.error("[Client] Error creating client:", error);
        res.status(500).json({ error: "Failed to create client" });
    }
}

export async function updateClient(req: Request, res: Response): Promise<void> {
    try {
        const client = await clientService.updateClient(req.params.id as string, req.body);
        res.json(client);
    } catch (error) {
        console.error("[Client] Error updating client:", error);
        res.status(500).json({ error: "Failed to update client" });
    }
}

export async function deleteClient(req: Request, res: Response): Promise<void> {
    try {
        await clientService.deleteClient(req.params.id as string);
        res.json({ success: true });
    } catch (error) {
        console.error("[Client] Error deleting client:", error);
        res.status(500).json({ error: "Failed to delete client" });
    }
}
