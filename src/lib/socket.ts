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
 * Emit event: ticket di-handover ke agen lain
 */
export function emitHandover(payload: Record<string, unknown>): void {
    getIO().emit("ticket:handover", payload);
}

/**
 * Emit event: ticket di-assign ke agen oleh admin
 */
export function emitAssign(payload: Record<string, unknown>): void {
    getIO().emit("ticket:assign", payload);
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
