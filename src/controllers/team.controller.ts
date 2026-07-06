import { Request, Response } from "express";
import * as teamService from "../services/team.service";

export async function listTeams(_req: Request, res: Response): Promise<void> {
    try {
        const teams = await teamService.listTeams();
        res.json(teams);
    } catch (error) {
        console.error("[Team] Error listing teams:", error);
        res.status(500).json({ error: "Failed to fetch teams" });
    }
}

export async function getTeam(req: Request, res: Response): Promise<void> {
    try {
        const team = await teamService.getTeamById(req.params.id as string);
        if (!team) {
            res.status(404).json({ error: "Team not found" });
            return;
        }
        res.json(team);
    } catch (error) {
        console.error("[Team] Error fetching team:", error);
        res.status(500).json({ error: "Failed to fetch team" });
    }
}

export async function createTeam(req: Request, res: Response): Promise<void> {
    try {
        const { name, email, phone, department, status } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: "name is required" });
            return;
        }
        const team = await teamService.createTeam({
            name: name.trim(),
            email: email || undefined,
            phone: phone || undefined,
            department: department || undefined,
            status: status || undefined,
        });
        res.status(201).json(team);
    } catch (error) {
        console.error("[Team] Error creating team:", error);
        res.status(500).json({ error: "Failed to create team" });
    }
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
    try {
        const { name, email, phone, department, status } = req.body;
        const team = await teamService.updateTeam(req.params.id as string, {
            name: name?.trim(),
            email,
            phone,
            department,
            status,
        });
        res.json(team);
    } catch (error) {
        console.error("[Team] Error updating team:", error);
        res.status(500).json({ error: "Failed to update team" });
    }
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
    try {
        await teamService.deleteTeam(req.params.id as string);
        res.json({ success: true });
    } catch (error) {
        console.error("[Team] Error deleting team:", error);
        res.status(500).json({ error: "Failed to delete team" });
    }
}
