import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TicketList } from '@/components/TicketList';
import { ChatWindow } from '@/components/ChatWindow';
import { ContextPanel } from '@/components/ContextPanel';
import { fetchArchivedTickets, fetchTicketById, restoreTicket as apiRestoreTicket, deleteTicket as apiDeleteTicket } from '@/lib/api';
import type { Ticket } from '@/lib/api';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function ArchivePage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [showContextPanel, setShowContextPanel] = useState(true);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [searchParams, setSearchParams] = useSearchParams();

    const loadTickets = useCallback(async () => {
        try {
            const data = await fetchArchivedTickets();
            setTickets(data);
        } catch (err) {
            console.error('Failed to load archived tickets:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTicketDetail = useCallback(async (ticketId: string) => {
        try {
            const data = await fetchTicketById(ticketId);
            setActiveTicket(data);
            setSearchParams({ id: ticketId }, { replace: true });
        } catch (err) {
            console.error('Failed to load ticket detail:', err);
        }
    }, [setSearchParams]);

    const handleSelectTicket = useCallback((t: Ticket) => {
        loadTicketDetail(t.id);
        setMobileView('chat');
    }, [loadTicketDetail]);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    // Restore active ticket from URL on mount
    useEffect(() => {
        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            loadTicketDetail(idFromUrl);
            if (isMobile) setMobileView('chat');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const removeTicketFromState = (ticketId: string) => {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (activeTicket?.id === ticketId) {
            setActiveTicket(null);
            setSearchParams({}, { replace: true });
            if (isMobile) setMobileView('list');
        }
    };

    const handleRestoreTicket = async (ticketId: string) => {
        try {
            await apiRestoreTicket(ticketId);
            removeTicketFromState(ticketId);
        } catch (err) {
            console.error('Failed to restore ticket:', err);
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!confirm('Hapus tiket ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            await apiDeleteTicket(ticketId);
            removeTicketFromState(ticketId);
        } catch (err) {
            console.error('Failed to delete ticket:', err);
        }
    };

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Memuat arsip...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* TicketList */}
            <div className={`${isMobile ? (mobileView === 'list' ? 'flex w-full' : 'hidden') : 'flex'} flex-col`}>
                <TicketList
                    tickets={tickets}
                    activeTicketId={activeTicket?.id || null}
                    onSelectTicket={handleSelectTicket}
                    onRestoreTicket={handleRestoreTicket}
                    onDeleteTicket={handleDeleteTicket}
                />
            </div>

            {/* ChatWindow + ContextPanel */}
            <div className={`${isMobile ? (mobileView === 'chat' ? 'flex w-full' : 'hidden') : 'flex flex-1'} overflow-hidden`}>
                <ChatWindow
                    ticket={activeTicket}
                    onClaimTicket={() => {}}
                    onMessageSent={() => activeTicket && loadTicketDetail(activeTicket.id)}
                    onBack={isMobile ? () => setMobileView('list') : undefined}
                    showContextPanel={showContextPanel}
                    onToggleContextPanel={() => setShowContextPanel(p => !p)}
                    onRestoreTicket={handleRestoreTicket}
                    onDeleteTicket={handleDeleteTicket}
                />
                {!isMobile && showContextPanel && (
                    <ContextPanel
                        ticket={activeTicket}
                        onTicketUpdated={() => activeTicket && loadTicketDetail(activeTicket.id)}
                        onClose={() => setShowContextPanel(false)}
                    />
                )}
            </div>
        </div>
    );
}
