import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TicketList } from '@/components/TicketList';
import { ChatWindow } from '@/components/ChatWindow';
import { ContextPanel } from '@/components/ContextPanel';
import { useSocket } from '@/hooks/useSocket';
import { fetchTickets, fetchTicketById, claimTicket as apiClaimTicket, markMessagesRead, archiveTicket as apiArchiveTicket, deleteTicket as apiDeleteTicket, bulkTicketAction } from '@/lib/api';
import type { Ticket } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useNotification } from '@/context/NotificationContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [showContextPanel, setShowContextPanel] = useState(true);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const { user } = useAuth();
    const isMobile = useMediaQuery('(max-width: 767px)');
    const { resetUnread } = useNotification();

    // Reset unread badge whenever the tickets page is visible
    useEffect(() => {
        resetUnread();
    }, [resetUnread]);
    const [searchParams, setSearchParams] = useSearchParams();

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
            setSearchParams({ id: ticketId }, { replace: true });
        } catch (err) {
            console.error('Failed to load ticket detail:', err);
        }
    }, [setSearchParams]);

    const handleSelectTicket = useCallback((t: Ticket) => {
        loadTicketDetail(t.id);
        setMobileView('chat');
        // Mark as read instantly in local state so badge disappears immediately
        setTickets(prev => prev.map(tk =>
            tk.id === t.id ? { ...tk, _count: { messages: 0 } } : tk
        ));
        // Fire-and-forget API call to persist in DB
        markMessagesRead(t.id).catch(console.error);
    }, [loadTicketDetail]);

    const handleNewMessage = useCallback(
        (data: { ticketId: string }) => {
            loadTickets();
            if (activeTicket && data.ticketId === activeTicket.id) {
                loadTicketDetail(activeTicket.id);
            }
        },
        [activeTicket, loadTickets, loadTicketDetail]
    );

    const handleMessageEdited = useCallback(
        (data: { ticketId: string; message: import('@/lib/api').Message }) => {
            setActiveTicket(prev => {
                if (!prev || prev.id !== data.ticketId) return prev;
                return {
                    ...prev,
                    messages: prev.messages.map(m =>
                        m.id === data.message.id ? { ...m, ...data.message } : m
                    ),
                };
            });
        },
        []
    );

    const handleMessageStatus = useCallback(
        (data: { ticketId: string; wamid: string; status: 'delivered' | 'read' | 'failed' }) => {
            setActiveTicket(prev => {
                if (!prev || prev.id !== data.ticketId) return prev;
                return {
                    ...prev,
                    messages: prev.messages.map(m => {
                        if (m.wamid !== data.wamid) return m;
                        if (data.status === 'delivered') return { ...m, deliveredAt: new Date().toISOString() };
                        if (data.status === 'read') return { ...m, readAt: new Date().toISOString() };
                        if (data.status === 'failed') return { ...m, deliveryFailed: true };
                        return m;
                    }),
                };
            });
        },
        []
    );

    // When a new outbound ticket is created via dialog, add it to list and select it
    const handleNewOutboundTicket = useCallback((ticket: Ticket) => {
        setTickets(prev => {
            const exists = prev.find(t => t.id === ticket.id);
            return exists ? prev : [ticket, ...prev];
        });
        loadTicketDetail(ticket.id);
    }, [loadTicketDetail]);

    const handleTicketUpdated = useCallback((data: { ticket: Ticket }) => {
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? { ...t, ...data.ticket } : t));
        setActiveTicket(prev => prev && prev.id === data.ticket.id ? { ...prev, ...data.ticket } : prev);
    }, []);

    useSocket({
        onNewMessage: handleNewMessage,
        onNewTicket: loadTickets,
        onMessageEdited: handleMessageEdited,
        onMessageStatus: handleMessageStatus,
        onTicketUpdated: handleTicketUpdated,
    });

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

    const removeTicketFromState = (ticketId: string) => {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (activeTicket?.id === ticketId) {
            setActiveTicket(null);
            setSearchParams({}, { replace: true });
            if (isMobile) setMobileView('list');
        }
    };

    const handleArchiveTicket = async (ticketId: string) => {
        try {
            await apiArchiveTicket(ticketId);
            removeTicketFromState(ticketId);
        } catch (err) {
            console.error('Failed to archive ticket:', err);
        }
    };

    const handleDeleteTicket = (ticketId: string) => {
        setDeleteTargetId(ticketId);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await apiDeleteTicket(deleteTargetId);
            removeTicketFromState(deleteTargetId);
            toast.success('Tiket berhasil dihapus.');
        } catch (err) {
            console.error('Failed to delete ticket:', err);
            toast.error('Gagal menghapus tiket. Coba lagi.');
        } finally {
            setDeleteTargetId(null);
        }
    };

    const handleBulkArchive = async (ticketIds: string[]) => {
        await bulkTicketAction(ticketIds, 'archive');
        ticketIds.forEach(removeTicketFromState);
        toast.success(`${ticketIds.length} tiket berhasil diarsipkan.`);
    };

    const handleBulkResolve = async (ticketIds: string[]) => {
        await bulkTicketAction(ticketIds, 'resolve');
        ticketIds.forEach(removeTicketFromState);
        toast.success(`${ticketIds.length} tiket berhasil diresolve.`);
    };

    const handleBulkAssign = async (ticketIds: string[], agentId: string) => {
        await bulkTicketAction(ticketIds, 'assign', agentId);
        await loadTickets();
        toast.success(`${ticketIds.length} tiket berhasil di-assign.`);
    };

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading tickets...</p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div className="flex h-full overflow-hidden bg-background">
            {/* TicketList: full width on mobile when in list view, fixed width on desktop */}
            <div className={`${isMobile ? (mobileView === 'list' ? 'flex w-full' : 'hidden') : 'flex'} flex-col border-r border-border`}>
                <TicketList
                    tickets={tickets}
                    activeTicketId={activeTicket?.id || null}
                    onSelectTicket={handleSelectTicket}
                    onNewTicket={handleNewOutboundTicket}
                    onArchiveTicket={handleArchiveTicket}
                    onDeleteTicket={handleDeleteTicket}
                    onBulkArchive={handleBulkArchive}
                    onBulkResolve={handleBulkResolve}
                    onBulkAssign={handleBulkAssign}
                />
            </div>

            {/* ChatWindow + ContextPanel: full width on mobile when in chat view */}
            <div className={`${isMobile ? (mobileView === 'chat' ? 'flex w-full' : 'hidden') : 'flex flex-1'} overflow-hidden mb-2`}>
                <ChatWindow
                    ticket={activeTicket}
                    onClaimTicket={handleClaimTicket}
                    onMessageSent={handleRefresh}
                    onBack={isMobile ? () => setMobileView('list') : undefined}
                    showContextPanel={showContextPanel}
                    onToggleContextPanel={() => setShowContextPanel(p => !p)}
                    onArchiveTicket={handleArchiveTicket}
                    onDeleteTicket={handleDeleteTicket}
                />
                {!isMobile && showContextPanel && (
                    <ContextPanel
                        ticket={activeTicket}
                        onTicketUpdated={handleRefresh}
                        onClose={() => setShowContextPanel(false)}
                    />
                )}
            </div>
        </div>

        <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Tiket Secara Permanen?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Semua pesan dalam tiket ini akan ikut terhapus.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Hapus Permanen
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
