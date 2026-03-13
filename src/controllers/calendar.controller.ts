import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

// GET /api/calendar — Public, no auth required
export async function getEvents(_req: Request, res: Response): Promise<void> {
    try {
        const events = await prisma.calendarEvent.findMany({
            orderBy: { startDate: "asc" },
            select: {
                id: true,
                title: true,
                description: true,
                startDate: true,
                endDate: true,
                allDay: true,
                color: true,
                location: true,
                createdAt: true,
                createdBy: {
                    select: { name: true },
                },
            },
        });
        res.json(events);
    } catch (err) {
        console.error("getEvents error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// POST /api/calendar — Admin only
export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
        const title = req.body.title as string | undefined;
        const description = req.body.description as string | undefined;
        const startDate = req.body.startDate as string | undefined;
        const endDate = req.body.endDate as string | undefined;
        const allDay = req.body.allDay as boolean | undefined;
        const color = req.body.color as string | undefined;
        const location = req.body.location as string | undefined;

        if (!title || !startDate) {
            res.status(400).json({ message: "title dan startDate wajib diisi" });
            return;
        }

        const event = await prisma.calendarEvent.create({
            data: {
                title,
                description: description ?? null,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                allDay: allDay ?? false,
                color: color ?? null,
                location: location ?? null,
                createdById: req.user!.userId,
            },
        });

        res.status(201).json(event);
    } catch (err) {
        console.error("createEvent error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// PUT /api/calendar/:id — Admin only
export async function updateEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = String(req.params.id);
        const title = req.body.title as string | undefined;
        const description = req.body.description as string | undefined;
        const startDate = req.body.startDate as string | undefined;
        const endDate = req.body.endDate as string | undefined;
        const allDay = req.body.allDay as boolean | undefined;
        const color = req.body.color as string | undefined;
        const location = req.body.location as string | undefined;

        const existing = await prisma.calendarEvent.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "Event tidak ditemukan" });
            return;
        }

        const event = await prisma.calendarEvent.update({
            where: { id },
            data: {
                title: title ?? existing.title,
                description: description !== undefined ? description : existing.description,
                startDate: startDate ? new Date(startDate) : existing.startDate,
                endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
                allDay: allDay !== undefined ? allDay : existing.allDay,
                color: color !== undefined ? color : existing.color,
                location: location !== undefined ? location : existing.location,
            },
        });

        res.json(event);
    } catch (err) {
        console.error("updateEvent error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// DELETE /api/calendar/:id — Admin only
export async function deleteEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
        const id = String(req.params.id);

        const existing = await prisma.calendarEvent.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "Event tidak ditemukan" });
            return;
        }

        await prisma.calendarEvent.delete({ where: { id } });
        res.status(204).send();
    } catch (err) {
        console.error("deleteEvent error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}
