import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendTemplateMessage } from "../lib/whatsapp";

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
                eventTeams: {
                    select: {
                        team: {
                            select: { id: true, name: true, department: true },
                        },
                    },
                },
            },
        });

        // Flatten: { eventTeams: [{ team: { ... } }] } → { teams: [{ ... }] }
        const result = events.map(({ eventTeams, ...rest }) => ({
            ...rest,
            teams: eventTeams.map(et => et.team),
        }));

        res.json(result);
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
        const teamIds = req.body.teamIds as string[] | undefined;
        const sendInvitation = req.body.sendInvitation as boolean | undefined;

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
                eventTeams: teamIds && teamIds.length > 0
                    ? { create: teamIds.map(teamId => ({ teamId })) }
                    : undefined,
            },
        });

        // Send WhatsApp invitations
        let invitationResult: { sent: number; failed: number; errors: string[] } | undefined;
        if (sendInvitation && teamIds && teamIds.length > 0) {
            const teams = await prisma.team.findMany({
                where: { id: { in: teamIds }, phone: { not: null }, status: "ACTIVE" },
                select: { id: true, name: true, phone: true },
            });

            // Format dates in WIB (Asia/Jakarta)
            const TZ = "Asia/Jakarta";
            const fmtDate = (d: Date) =>
                d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
            const tzParts = (d: Date) => {
                const parts = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).formatToParts(d);
                const h = parts.find(p => p.type === "hour")?.value ?? "00";
                const m = parts.find(p => p.type === "minute")?.value ?? "00";
                return `${h}:${m}`;
            };

            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : null;

            let formattedDate: string;
            if (allDay && end && end.toDateString() !== start.toDateString()) {
                // Multi-day all-day: "Kamis, 9 Juli 2026 - Sabtu, 11 Juli 2026, Seharian penuh"
                formattedDate = `${fmtDate(start)} - ${fmtDate(end)}, Seharian penuh`;
            } else if (allDay) {
                // Single-day all-day
                formattedDate = `${fmtDate(start)}, Seharian penuh`;
            } else {
                // Timed event
                const endStr = end ? ` - ${tzParts(end)}` : "";
                formattedDate = `${fmtDate(start)}, ${tzParts(start)}${endStr}`;
            }
            const place = location || "Online";

            const components = [{
                type: "body",
                parameters: [
                    { type: "text", text: "{{1}}" },
                    { type: "text", text: "{{2}}" },
                    { type: "text", text: "{{3}}" },
                    { type: "text", text: "{{4}}" },
                ],
            }];

            let sent = 0, failed = 0;
            const errors: string[] = [];

            for (const team of teams) {
                if (!team.phone) { failed++; continue; }
                try {
                    // Build per-team components with actual values
                    const teamComponents = [{
                        type: "body",
                        parameters: [
                            { type: "text", text: team.name },
                            { type: "text", text: title },
                            { type: "text", text: formattedDate },
                            { type: "text", text: place },
                        ],
                    }];
                    await sendTemplateMessage(team.phone, "event_invitation", "id", teamComponents);
                    sent++;
                } catch (err: any) {
                    failed++;
                    errors.push(`${team.name}: ${err.message}`);
                    console.error(`[Calendar] Failed to send invitation to ${team.name}:`, err.message);
                }
            }

            invitationResult = { sent, failed, errors };
        }

        res.status(201).json({ event, invitation: invitationResult });
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
        const teamIds = req.body.teamIds as string[] | undefined;

        const existing = await prisma.calendarEvent.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "Event tidak ditemukan" });
            return;
        }

        // Sync teams: delete all existing, create new if provided
        const data: Record<string, unknown> = {
            title: title ?? existing.title,
            description: description !== undefined ? description : existing.description,
            startDate: startDate ? new Date(startDate) : existing.startDate,
            endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
            allDay: allDay !== undefined ? allDay : existing.allDay,
            color: color !== undefined ? color : existing.color,
            location: location !== undefined ? location : existing.location,
        };

        if (teamIds !== undefined) {
            await prisma.calendarEventTeam.deleteMany({ where: { eventId: id } });
            if (teamIds.length > 0) {
                await prisma.calendarEventTeam.createMany({
                    data: teamIds.map(teamId => ({ eventId: id, teamId })),
                });
            }
        }

        const event = await prisma.calendarEvent.update({
            where: { id },
            data: data as any,
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
