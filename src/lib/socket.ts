import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer;

export function initSocket(server: HTTPServer): SocketIOServer {
    io = new SocketIOServer(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`[Socket.io] Agent connected: ${socket.id}`);

        // Each authenticated user joins their personal room for targeted notifications
        socket.on("user:join", (userId: string) => {
            if (typeof userId === "string" && userId.trim()) {
                socket.join(`user:${userId}`);
                console.log(`[Socket.io] User ${userId} joined personal room`);
            }
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.io] Agent disconnected: ${socket.id}`);
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
}

/**
 * Emit event: ticket di-handover ke agen lain (hanya ke agen tujuan)
 */
export function emitHandover(payload: Record<string, unknown>): void {
    const toAgentId = payload.toAgentId as string | undefined;
    if (toAgentId) {
        getIO().to(`user:${toAgentId}`).emit("ticket:handover", payload);
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
}

/**
 * Emit event: status pesan diperbarui (delivered / read)
 */
export function emitMessageStatus(ticketId: string, wamid: string, status: "delivered" | "read"): void {
    getIO().emit("message:status", { ticketId, wamid, status });
}
