import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import * as pushService from "../services/push.service";

let io: SocketIOServer;

// Track online users: userId -> Set of socketIds (handles multiple tabs)
const onlineUsers = new Map<string, Set<string>>();

function broadcastOnlineCount(): void {
    io.emit("users:online", { count: onlineUsers.size });
}

export function initSocket(server: HTTPServer): SocketIOServer {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`[Socket.io] Agent connected: ${socket.id}`);
        let joinedUserId: string | null = null;

        // Each authenticated user joins their personal room for targeted notifications
        socket.on("user:join", (userId: string) => {
            if (typeof userId === "string" && userId.trim()) {
                socket.join(`user:${userId}`);
                joinedUserId = userId;
                if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
                onlineUsers.get(userId)!.add(socket.id);
                broadcastOnlineCount();
                console.log(`[Socket.io] User ${userId} joined personal room (online: ${onlineUsers.size})`);
            }
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.io] Agent disconnected: ${socket.id}`);
            if (joinedUserId) {
                const sockets = onlineUsers.get(joinedUserId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) onlineUsers.delete(joinedUserId);
                }
                broadcastOnlineCount();
            }
        });
    });

    return io;
}

export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error("Socket.io has not been initialized. Call initSocket first.");
    }
    return io;
}

/**
 * Emit event: pesan baru masuk
 */
export function emitNewMessage(
    ticketId: string,
    message: Record<string, unknown>,
    contact?: { name: string }
): void {
    getIO().emit("message:new", { ticketId, message, contact });

    // Push to all agents who have subscriptions (background, non-blocking)
    const contactName = contact?.name ?? "Kontak";
    const msgType = message.type as string | undefined;
    const body = msgType && msgType !== "TEXT"
        ? `[${msgType}]`
        : ((message.body as string)?.slice(0, 80) ?? "Media diterima");

    pushService.sendPushToAll({
        title: `Pesan baru dari ${contactName}`,
        body,
        tag: `message-${ticketId}`,
        url: "/tickets",
    }).catch(console.error);
}

/**
 * Emit event: ticket di-handover ke agen lain (hanya ke agen tujuan)
 */
export function emitHandover(payload: Record<string, unknown>): void {
    const toAgentId = payload.toAgentId as string | undefined;
    if (toAgentId) {
        getIO().to(`user:${toAgentId}`).emit("ticket:handover", payload);
        pushService.sendPushToUsers([toAgentId], {
            title: "Tiket di-handover ke Anda",
            body: `${payload.ticketNumber} · ${payload.contactName} (dari ${payload.fromAgent})`,
            tag: `handover-${payload.ticketNumber}`,
            url: "/tickets",
        }).catch(console.error);
    } else {
        getIO().emit("ticket:handover", payload);
    }
}

/**
 * Emit event: ticket di-assign ke agen oleh admin (hanya ke agen yang di-assign)
 */
export function emitAssign(payload: Record<string, unknown>): void {
    const agentId = payload.agentId as string | undefined;
    if (agentId) {
        getIO().to(`user:${agentId}`).emit("ticket:assign", payload);
        pushService.sendPushToUsers([agentId], {
            title: "Tiket di-assign ke Anda",
            body: `${payload.ticketNumber} · ${payload.contactName} — oleh ${payload.assignedBy}`,
            tag: `assign-${payload.ticketNumber}`,
            url: "/tickets",
        }).catch(console.error);
    } else {
        getIO().emit("ticket:assign", payload);
    }
}

/**
 * Emit event: pesan diedit
 */
export function emitEditMessage(ticketId: string, message: Record<string, unknown>): void {
    getIO().emit("message:edited", { ticketId, message });
}

/**
 * Emit event: tiket baru dibuat
 */
export function emitNewTicket(ticket: Record<string, unknown>): void {
    getIO().emit("ticket:new", { ticket });

    // Push all agents
    const contactName = (ticket.contact as { name?: string } | undefined)?.name ?? "Kontak";
    pushService.sendPushToAll({
        title: "Tiket baru masuk",
        body: `Dari ${contactName}`,
        tag: `ticket-new-${ticket.id}`,
        url: "/tickets",
    }).catch(console.error);
}

/**
 * Emit event: status pesan diperbarui (delivered / read)
 */
export function emitMessageStatus(ticketId: string, wamid: string, status: "delivered" | "read" | "failed"): void {
    getIO().emit("message:status", { ticketId, wamid, status });
}

/**
 * Emit event: tiket diupdate (status, clickup, dll)
 */
export function emitTicketUpdate(ticket: Record<string, unknown>): void {
    getIO().emit("ticket:updated", { ticket });
}
