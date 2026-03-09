import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as userService from "../services/user.service";

export async function listAgentsHandler(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const agents = await userService.listAgents();
        res.json(agents);
    } catch {
        res.status(500).json({ message: "Failed to fetch agents" });
    }
}

export async function listUsersHandler(req: AuthRequest, res: Response): Promise<void> {
    try {
        const users = await userService.listUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
}

export async function createUserHandler(req: AuthRequest, res: Response): Promise<void> {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ message: "name, email, and password are required" });
        return;
    }
    try {
        const user = await userService.createUser({ name, email, password, role });
        res.status(201).json(user);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create user";
        res.status(400).json({ message });
    }
}

export async function updateUserHandler(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    try {
        const user = await userService.updateUser(id, req.body);
        res.json(user);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update user";
        res.status(400).json({ message });
    }
}

export async function deleteUserHandler(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    // Prevent self-deletion
    if (id === req.user?.userId) {
        res.status(400).json({ message: "Cannot delete your own account" });
        return;
    }
    try {
        await userService.deleteUser(id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: "Failed to delete user" });
    }
}
