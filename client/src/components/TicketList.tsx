import { Search, MessageSquarePlus, MoreHorizontal, Archive, Trash2, CheckSquare, Square, X, UserCheck, CheckCheck, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { Ticket, Agent } from '@/lib/api';
import { fetchAgents } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatsBar } from './StatsBar';
import { NewConversationDialog } from './NewConversationDialog';
import { useAuth } from '@/context/AuthContext';

interface TicketListProps {
    tickets: Ticket[];
    activeTicketId: string | null;
    onSelectTicket: (ticket: Ticket) => void;
    onNewTicket?: (ticket: Ticket) => void;
    onArchiveTicket?: (ticketId: string) => void;
    onDeleteTicket?: (ticketId: string) => void;
    onRestoreTicket?: (ticketId: string) => void;
    onBulkArchive?: (ticketIds: string[]) => Promise<void>;
    onBulkResolve?: (ticketIds: string[]) => Promise<void>;
    onBulkAssign?: (ticketIds: string[], agentId: string) => Promise<void>;
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Baru';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    }
    if (diffDay < 7) return `${diffDay}h`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const avatarColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-rose-500', 'bg-indigo-500',
];

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

const statusDot: Record<string, string> = {
    NEW: 'bg-blue-400',
    OPEN: 'bg-emerald-400',
    PENDING: 'bg-yellow-400',
    RESOLVED: 'bg-gray-400',
};

export function TicketList({ tickets, activeTicketId, onSelectTicket, onNewTicket, onArchiveTicket, onDeleteTicket, onRestoreTicket, onBulkArchive, onBulkResolve, onBulkAssign }: TicketListProps) {
    const [search, setSearch] = useState('');
    const [showNewDialog, setShowNewDialog] = useState(false);
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    // Bulk selection state
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [agents, setAgents] = useState<Agent[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    const enterSelectMode = useCallback(async () => {
        setSelectMode(true);
        setSelected(new Set());
        if (agents.length === 0) {
            try { setAgents(await fetchAgents()); } catch { /* ignore */ }
        }
    }, [agents.length]);

    const exitSelectMode = useCallback(() => {
        setSelectMode(false);
        setSelected(new Set());
    }, []);

    const toggleSelect = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback((filteredIds: string[]) => {
        setSelected(prev => prev.size === filteredIds.length ? new Set() : new Set(filteredIds));
    }, []);

    const handleBulkAction = useCallback(async (action: 'archive' | 'resolve' | 'assign', agentId?: string) => {
        const ids = [...selected];
        if (ids.length === 0) return;
        setBulkLoading(true);
        try {
            if (action === 'archive') await onBulkArchive?.(ids);
            else if (action === 'resolve') await onBulkResolve?.(ids);
            else if (action === 'assign' && agentId) await onBulkAssign?.(ids, agentId);
            exitSelectMode();
        } finally {
            setBulkLoading(false);
        }
    }, [selected, onBulkArchive, onBulkResolve, onBulkAssign, exitSelectMode]);

    const filtered = tickets.filter((t) => {
        const q = search.toLowerCase();
        return (
            t.ticketNumber.toLowerCase().includes(q) ||
            t.contact.name.toLowerCase().includes(q) ||
            t.contact.client.name.toLowerCase().includes(q) ||
            (t.messages[0]?.body || '').toLowerCase().includes(q)
        );
    });

    return (
        <aside className="w-[320px] min-w-[280px] flex flex-col border-none border-border bg-background overflow-y-auto">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-foreground">Pesan</h2>
                    <div className="flex items-center gap-1">
                        {(onBulkArchive || onBulkResolve || onBulkAssign) && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={selectMode ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={selectMode ? exitSelectMode : enterSelectMode}
                                    >
                                        {selectMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">{selectMode ? 'Batal pilih' : 'Pilih banyak'}</TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"
                                    onClick={() => setShowNewDialog(true)}
                                >
                                    <MessageSquarePlus className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Mulai Percakapan Baru</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Cari percakapan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                    />
                </div>
            </div>

            {/* Stats */}
            <StatsBar tickets={tickets} />

            {/* Select-all bar — shown when in select mode */}
            {selectMode && (
                <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-muted/30">
                    <button
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => toggleSelectAll(filtered.map(t => t.id))}
                    >
                        {selected.size === filtered.length && filtered.length > 0
                            ? <CheckCheck className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4" />
                        }
                        {selected.size === filtered.length && filtered.length > 0 ? 'Batal pilih semua' : 'Pilih semua'}
                    </button>
                    {selected.size > 0 && (
                        <span className="ml-auto text-xs font-medium text-primary">{selected.size} dipilih</span>
                    )}
                </div>
            )}

            {/* Ticket List */}
            <ScrollArea className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                        {search ? 'Tidak ada hasil' : 'Belum ada tiket aktif'}
                    </div>
                ) : (
                    filtered.map((ticket) => {
                        const lastMsg = ticket.messages[0];
                        const isActive = ticket.id === activeTicketId;
                        const isSelected = selected.has(ticket.id);
                        const unread = ticket._count?.messages ?? 0;
                        const initials = getInitials(ticket.contact.name);
                        const avatarColor = getAvatarColor(ticket.contact.name);
                        const dotColor = statusDot[ticket.status] ?? 'bg-gray-400';

                        return (
                            <div
                                key={ticket.id}
                                className={`mx-2 text-left px-4 py-2 my-2 border-b border-border/40 transition-colors duration-100 hover:bg-secondary hover:rounded-xl cursor-pointer relative group ${
                                    isSelected ? 'bg-primary/10 rounded-xl border-primary/20' :
                                    isActive ? 'bg-secondary rounded-xl' : ''
                                }`}
                                onClick={selectMode ? () => toggleSelect(ticket.id) : undefined}
                            >
                                <div
                                    onClick={!selectMode ? () => onSelectTicket(ticket) : undefined}
                                    className="flex items-center gap-3 pr-7"
                                >
                                    {/* Avatar or Checkbox */}
                                    {selectMode ? (
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/50 hover:border-primary'
                                        }`}>
                                            {isSelected && (
                                                <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                                                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative shrink-0">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold ${avatarColor}`}>
                                                {initials}
                                            </div>
                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${dotColor}`} />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Row 1: Name + Time */}
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <p className={`text-sm truncate min-w-0 ${unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                                {ticket.contact.name}
                                            </p>
                                            <span className={`text-xs shrink-0 ${unread > 0 ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                                                {lastMsg ? formatTime(lastMsg.timestamp) : formatTime(ticket.updatedAt)}
                                            </span>
                                        </div>
                                        {/* Row 2: Last message + Unread badge */}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs min-w-0 ${unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {lastMsg?.body
                                                    ? lastMsg.body.length > 40
                                                        ? lastMsg.body.slice(0, 40) + '...'
                                                        : lastMsg.body
                                                    : 'Belum ada pesan'}
                                            </p>
                                            {unread > 0 && (
                                                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center">
                                                    {unread > 99 ? '99+' : unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 3-dot context menu — hidden in select mode */}
                                {!selectMode && (onArchiveTicket || onRestoreTicket || onDeleteTicket) && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                {onRestoreTicket && (
                                                    <DropdownMenuItem
                                                        onClick={(e) => { e.stopPropagation(); onRestoreTicket(ticket.id); }}
                                                    >
                                                        <Archive className="w-4 h-4 mr-2" />
                                                        Restore
                                                    </DropdownMenuItem>
                                                )}
                                                {onArchiveTicket && (
                                                    <DropdownMenuItem
                                                        onClick={(e) => { e.stopPropagation(); onArchiveTicket(ticket.id); }}
                                                    >
                                                        <Archive className="w-4 h-4 mr-2" />
                                                        Archive
                                                    </DropdownMenuItem>
                                                )}
                                                {isAdmin && onDeleteTicket && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket.id); }}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Hapus Permanen
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </ScrollArea>

            {/* Bulk action bar — sticky bottom, shown when items are selected */}
            {selectMode && selected.size > 0 && (
                <div className="border-t border-border bg-card px-3 py-2.5 flex items-center gap-2 flex-wrap">
                    {bulkLoading ? (
                        <div className="flex items-center gap-2 w-full justify-center py-1">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Memproses...</span>
                        </div>
                    ) : (
                        <>
                            <span className="text-xs font-semibold text-foreground mr-1">{selected.size} tiket</span>
                            {onBulkArchive && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1.5 px-2.5"
                                    onClick={() => handleBulkAction('archive')}
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                    Archive
                                </Button>
                            )}
                            {onBulkResolve && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1.5 px-2.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                    onClick={() => handleBulkAction('resolve')}
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Resolve
                                </Button>
                            )}
                            {onBulkAssign && agents.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1.5 px-2.5 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                        >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            Assign
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" side="top" className="w-48">
                                        {agents.map(agent => (
                                            <DropdownMenuItem
                                                key={agent.id}
                                                onClick={() => handleBulkAction('assign', agent.id)}
                                            >
                                                {agent.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </>
                    )}
                </div>
            )}

            <NewConversationDialog
                open={showNewDialog}
                onClose={() => setShowNewDialog(false)}
                onSuccess={(ticket) => {
                    setShowNewDialog(false);
                    onNewTicket?.(ticket);
                }}
            />
        </aside>
    );
}
