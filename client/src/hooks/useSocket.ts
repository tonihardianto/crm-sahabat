import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message, Ticket } from '../lib/api';

interface UseSocketOptions {
    onNewMessage?: (data: { ticketId: string; message: Message }) => void;
    onNewTicket?: (data: { ticket: Ticket }) => void;
    onMessageEdited?: (data: { ticketId: string; message: Message }) => void;
    onMessageStatus?: (data: { ticketId: string; wamid: string; status: 'delivered' | 'read' | 'failed' }) => void;
    onTicketUpdated?: (data: { ticket: Ticket }) => void;
}

export function useSocket({ onNewMessage, onNewTicket, onMessageEdited, onMessageStatus, onTicketUpdated }: UseSocketOptions) {
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

    // Listen for edited messages
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !onMessageEdited) return;

        socket.on('message:edited', onMessageEdited);
        return () => {
            socket.off('message:edited', onMessageEdited);
        };
    }, [onMessageEdited]);

    // Listen for message status updates (delivered / read)
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !onMessageStatus) return;

        socket.on('message:status', onMessageStatus);
        return () => {
            socket.off('message:status', onMessageStatus);
        };
    }, [onMessageStatus]);

    // Listen for ticket updates (e.g. ClickUp status sync)
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !onTicketUpdated) return;

        socket.on('ticket:updated', onTicketUpdated);
        return () => {
            socket.off('ticket:updated', onTicketUpdated);
        };
    }, [onTicketUpdated]);

    return socketRef;
}
