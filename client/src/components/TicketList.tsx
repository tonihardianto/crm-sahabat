import { Search, MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import type { Ticket } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { StatsBar } from './StatsBar';
import { NewConversationDialog } from './NewConversationDialog';

interface TicketListProps {
    tickets: Ticket[];
    activeTicketId: string | null;
    onSelectTicket: (ticket: Ticket) => void;
    onNewTicket?: (ticket: Ticket) => void;
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

export function TicketList({ tickets, activeTicketId, onSelectTicket, onNewTicket }: TicketListProps) {
    const [search, setSearch] = useState('');
    const [showNewDialog, setShowNewDialog] = useState(false);

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
        <aside className="w-[320px] min-w-[280px] flex flex-col border-r border-border bg-background">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-foreground">Pesan</h2>
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

            {/* Ticket List */}
            <ScrollArea className="flex-1">
                {filtered.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                        {search ? 'Tidak ada hasil' : 'Belum ada tiket aktif'}
                    </div>
                ) : (
                    filtered.map((ticket) => {
                        const lastMsg = ticket.messages[0];
                        const isActive = ticket.id === activeTicketId;
                        const unread = ticket._count?.messages ?? 0;
                        const initials = getInitials(ticket.contact.name);
                        const avatarColor = getAvatarColor(ticket.contact.name);
                        const dotColor = statusDot[ticket.status] ?? 'bg-gray-400';

                        return (
                            <button
                                key={ticket.id}
                                onClick={() => onSelectTicket(ticket)}
                                className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors duration-100 hover:bg-accent/60 cursor-pointer ${
                                    isActive ? 'bg-accent' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-semibold ${avatarColor}`}>
                                            {initials}
                                        </div>
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${dotColor}`} />
                                    </div>

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

                                                        {/* Row 2: Last message + Unread badge / Resolved badge */}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs min-w-0 ${unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {lastMsg?.body
                                                    ? lastMsg.body.length > 40
                                                        ? lastMsg.body.slice(0, 40) + '...'
                                                        : lastMsg.body
                                                    : 'Belum ada pesan'}
                                            </p>
                                            { unread > 0 ? (
                                                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center">
                                                    {unread > 99 ? '99+' : unread}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </ScrollArea>

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
