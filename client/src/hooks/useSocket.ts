import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message, Ticket } from '../lib/api';

interface UseSocketOptions {
    onNewMessage?: (data: { ticketId: string; message: Message }) => void;
    onNewTicket?: (data: { ticket: Ticket }) => void;
}

export function useSocket({ onNewMessage, onNewTicket }: UseSocketOptions) {
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const socket = io('/', {
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
        });

        socketRef.current = socket;
    }, []);

    useEffect(() => {
        connect();
        return () => {
            socketRef.current?.disconnect();
        };
    }, [connect]);

    // Listen for new messages
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !onNewMessage) return;

        socket.on('message:new', onNewMessage);
        return () => {
            socket.off('message:new', onNewMessage);
        };
    }, [onNewMessage]);

    // Listen for new tickets
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !onNewTicket) return;

        socket.on('ticket:new', onNewTicket);
        return () => {
            socket.off('ticket:new', onNewTicket);
        };
    }, [onNewTicket]);

    return socketRef;
}
