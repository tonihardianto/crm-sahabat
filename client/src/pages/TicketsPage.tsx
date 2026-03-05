import { useState, useEffect, useCallback } from 'react';
import { TicketList } from '@/components/TicketList';
import { ChatWindow } from '@/components/ChatWindow';
import { ContextPanel } from '@/components/ContextPanel';
import { useSocket } from '@/hooks/useSocket';
import { fetchTickets, fetchTicketById, claimTicket as apiClaimTicket } from '@/lib/api';
import type { Ticket } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const loadTickets = useCallback(async () => {
        try {
            const data = await fetchTickets();
            setTickets(data);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTicketDetail = useCallback(async (ticketId: string) => {
        try {
            const data = await fetchTicketById(ticketId);
            setActiveTicket(data);
        } catch (err) {
            console.error('Failed to load ticket detail:', err);
        }
    }, []);

    const handleNewMessage = useCallback(
        (data: { ticketId: string }) => {
            loadTickets();
            if (activeTicket && data.ticketId === activeTicket.id) {
                loadTicketDetail(activeTicket.id);
            }
        },
        [activeTicket, loadTickets, loadTicketDetail]
    );

    // When a new outbound ticket is created via dialog, add it to list and select it
    const handleNewOutboundTicket = useCallback((ticket: Ticket) => {
        setTickets(prev => {
            const exists = prev.find(t => t.id === ticket.id);
            return exists ? prev : [ticket, ...prev];
        });
        loadTicketDetail(ticket.id);
    }, [loadTicketDetail]);

    useSocket({
        onNewMessage: handleNewMessage,
        onNewTicket: loadTickets,
    });

    useEffect(() => { loadTickets(); }, [loadTickets]);

    const handleClaimTicket = async (ticketId: string) => {
        try {
            // Pass actual agent ID from auth context
            await apiClaimTicket(ticketId, user?.userId || '');
            loadTicketDetail(ticketId);
            loadTickets();
        } catch (err) {
            console.error('Failed to claim ticket:', err);
        }
    };

    const handleRefresh = () => {
        if (activeTicket) loadTicketDetail(activeTicket.id);
        loadTickets();
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <TicketList
                tickets={tickets}
                activeTicketId={activeTicket?.id || null}
                onSelectTicket={(t) => loadTicketDetail(t.id)}
                onNewTicket={handleNewOutboundTicket}
            />
            <ChatWindow
                ticket={activeTicket}
                onClaimTicket={handleClaimTicket}
                onMessageSent={handleRefresh}
            />
            <ContextPanel
                ticket={activeTicket}
                onTicketUpdated={handleRefresh}
            />
        </>
    );
}
