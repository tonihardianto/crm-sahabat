import { Search, Ticket as TicketIcon, MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import type { Ticket } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    NEW: "default",
    OPEN: "secondary",
    PENDING: "outline",
    RESOLVED: "secondary",
};

const priorityVariant: Record<string, "default" | "destructive"> = {
    URGENT: "destructive",
    HIGH: "destructive",
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
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <TicketIcon className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-foreground">Tickets</h2>
                        <Badge variant="outline" className="text-xs">{tickets.length}</Badge>
                    </div>
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
                        placeholder="Search tickets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Stats */}
            <StatsBar />

            {/* Ticket List */}
            <ScrollArea className="flex-1">
                {filtered.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                        {search ? 'No tickets found' : 'No active tickets'}
                    </div>
                ) : (
                    filtered.map((ticket) => {
                        const lastMsg = ticket.messages[0];
                        const isActive = ticket.id === activeTicketId;

                        return (
                            <button
                                key={ticket.id}
                                onClick={() => onSelectTicket(ticket)}
                                className={`w-full text-left p-4 border-b border-border/50 transition-all duration-150 hover:bg-accent cursor-pointer ${isActive
                                    ? 'bg-accent border-l-2 border-l-blue-500'
                                    : 'border-l-2 border-l-transparent'
                                    }`}
                            >
                                {/* Top row: ticket number + time */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {lastMsg ? formatTime(lastMsg.timestamp) : formatTime(ticket.createdAt)}
                                    </span>
                                </div>

                                {/* Contact name */}
                                <p className="text-sm font-medium text-foreground truncate mb-1">
                                    {ticket.contact.name}
                                </p>

                                {/* Last message preview */}
                                <p className="text-xs text-muted-foreground truncate mb-2">
                                    {lastMsg?.body || 'No messages yet'}
                                </p>

                                {/* Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant={statusVariant[ticket.status] || "secondary"} className="text-[10px]">
                                        {ticket.status}
                                    </Badge>
                                    {(ticket.priority === 'URGENT' || ticket.priority === 'HIGH') && (
                                        <Badge variant={priorityVariant[ticket.priority] || "default"} className="text-[10px]">
                                            {ticket.priority}
                                        </Badge>
                                    )}
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[120px]">
                                        {ticket.contact.client.name}
                                    </span>
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
