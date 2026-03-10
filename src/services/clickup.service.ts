import prisma from "../lib/prisma";

const CLICKUP_API = "https://api.clickup.com/api/v2";

interface ClickUpTask {
    id: string;
    url: string;
    status: { status: string };
}

/**
 * Create a task in ClickUp list.
 */
export async function createClickUpTask(
    token: string,
    listId: string,
    name: string,
    description: string,
    priority?: number,
    tags?: string[]
): Promise<ClickUpTask> {
    const body: Record<string, unknown> = { name, description, status: "BACKLOG" };
    if (priority) body.priority = priority;
    if (tags && tags.length > 0) body.tags = tags.map((t) => ({ name: t.trim() }));

    const res = await fetch(`${CLICKUP_API}/list/${listId}/task`, {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`ClickUp API error: ${res.status} — ${err}`);
    }

    return res.json() as Promise<ClickUpTask>;
}

/**
 * Update a task's status in ClickUp.
 */
export async function updateClickUpTaskStatus(
    token: string,
    taskId: string,
    status: string
): Promise<void> {
    const res = await fetch(`${CLICKUP_API}/task/${taskId}`, {
        method: "PUT",
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`ClickUp API error: ${res.status} — ${err}`);
    }
}

/**
 * Get current ClickUp user info (to verify token).
 */
export async function getClickUpUser(token: string): Promise<{ id: number; username: string; email: string }> {
    const res = await fetch(`${CLICKUP_API}/user`, {
        headers: { Authorization: token },
    });
    if (!res.ok) throw new Error("Invalid ClickUp token");
    const data = await res.json() as { user: { id: number; username: string; email: string } };
    return data.user;
}

/**
 * Get space ID from a list ID.
 */
export async function getSpaceIdFromList(token: string, listId: string): Promise<string> {
    const res = await fetch(`${CLICKUP_API}/list/${listId}`, {
        headers: { Authorization: token },
    });
    if (!res.ok) throw new Error("Failed to fetch list info");
    const data = await res.json() as { space: { id: string } };
    return data.space.id;
}

/**
 * Get all tags from a ClickUp space.
 */
export async function getSpaceTags(token: string, spaceId: string): Promise<{ name: string; tag_fg: string; tag_bg: string }[]> {
    const res = await fetch(`${CLICKUP_API}/space/${spaceId}/tag`, {
        headers: { Authorization: token },
    });
    if (!res.ok) throw new Error("Failed to fetch ClickUp tags");
    const data = await res.json() as { tags: { name: string; tag_fg: string; tag_bg: string }[] };
    return data.tags;
}

/**
 * Link a ClickUp task to a CRM ticket.
 */
export async function linkTaskToTicket(
    ticketId: string,
    taskId: string,
    taskUrl: string,
    taskStatus: string
) {
    return prisma.ticket.update({
        where: { id: ticketId },
        data: {
            clickupTaskId: taskId,
            clickupTaskUrl: taskUrl,
            clickupStatus: taskStatus,
        },
    });
}

/**
 * Handle incoming ClickUp webhook event.
 * When status changes to DONE, resolve the CRM ticket.
 */
export async function handleClickUpWebhook(payload: {
    task_id: string;
    history_items?: Array<{ field: string; after?: { status: string } }>;
}) {
    const { task_id, history_items } = payload;

    // Find status change event
    const statusChange = history_items?.find((h) => h.field === "status");
    if (!statusChange?.after) return null;

    const newStatus = statusChange.after.status.toUpperCase();

    // Find ticket linked to this task
    const ticket = await prisma.ticket.findFirst({
        where: { clickupTaskId: task_id },
    });

    if (!ticket) return null;

    // Always update clickupStatus on the ticket
    await prisma.ticket.update({
        where: { id: ticket.id },
        data: { clickupStatus: statusChange.after.status },
    });

    // If DONE (case-insensitive) → resolve ticket
    if (newStatus === "DONE") {
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date(),
                clickupStatus: statusChange.after.status,
            },
        });

        // Create system note
        const note = await prisma.message.create({
            data: {
                ticketId: ticket.id,
                direction: "INTERNAL",
                type: "TEXT",
                body: "Tiket otomatis di-resolve karena task ClickUp berstatus DONE.",
                isSystemNote: true,
                timestamp: new Date(),
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });

        return { ticketId: ticket.id, resolved: true, note };
    }

    return { ticketId: ticket.id, resolved: false, newStatus };
}
