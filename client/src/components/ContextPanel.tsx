import { ExternalLink, ChevronDown, X } from 'lucide-react';
import type { Ticket } from '@/lib/api';
import { updateTicket } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContextPanelProps {
    ticket: Ticket | null;
    onTicketUpdated: () => void;
    onClose?: () => void;
}

function clickupStatusColor(status: string | null): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'DONE') return 'bg-emerald-500/15 text-emerald-400';
    if (s === 'IN PROGRESS' || s === 'IN_PROGRESS') return 'bg-blue-500/15 text-blue-400';
    if (s === 'REVIEW' || s === 'IN REVIEW') return 'bg-amber-500/15 text-amber-400';
    if (s === 'BLOCKED') return 'bg-red-500/15 text-red-400';
    return 'bg-muted text-muted-foreground'; // BACKLOG, TO DO, dll
}


export function ContextPanel({ ticket, onTicketUpdated, onClose }: ContextPanelProps) {
    if (!ticket) {
        return (
            <aside className="w-[320px] min-w-[280px] border-l border-border bg-background flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a ticket to view details</p>
            </aside>
        );
    }

    const handleUpdate = async (field: 'status' | 'category' | 'priority', value: string) => {
        try {
            await updateTicket(ticket.id, { [field]: value });
            onTicketUpdated();
        } catch (err) {
            console.error(`Failed to update ${field}:`, err);
        }
    };

    return (
        <aside className="w-[320px] min-w-[280px] border-l border-border bg-background flex flex-col">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Ticket Detail</span>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Sembunyikan panel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <ScrollArea className="flex-1 overflow-y-auto">
                {/* Ticket & Client Detail */}
                <div className="p-3 border-b border-border">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Nama RS</span>
                            <span className="text-xs font-medium text-foreground">{ticket.contact.client.name}</span>
                        </div>
                        {/* <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Customer ID</span>
                            <span className="text-xs font-mono text-foreground/80">{ticket.contact.client.customerId}</span>
                        </div> */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Contact</span>
                            <span className="text-xs text-foreground/80">{ticket.contact.name}</span>
                        </div>
                        {ticket.contact.position && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Jabatan</span>
                                <span className="text-xs text-foreground/80">{ticket.contact.position}</span>
                            </div>
                        )}
                        {ticket.contact.client.address && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Alamat</span>
                                <span className="text-xs text-foreground/80 text-right max-w-[60%]">{ticket.contact.client.address}</span>
                            </div>
                        )}

                        <div className="space-y-2.5 pt-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Ticket</span>
                                <span className="text-xs font-mono text-foreground/80">{ticket.ticketNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Status</span>
                                <div className="relative">
                                    <select value={ticket.status} onChange={(e) => handleUpdate('status', e.target.value)}
                                        className="appearance-none text-xs bg-card border border-border rounded-md pl-2 pr-6 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring/30 cursor-pointer">
                                        <option value="NEW">New</option>
                                        <option value="OPEN">Open</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="RESOLVED">Resolved</option>
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Priority</span>
                                <div className="relative">
                                    <select value={ticket.priority} onChange={(e) => handleUpdate('priority', e.target.value)}
                                        className="appearance-none text-xs bg-card border border-border rounded-md pl-2 pr-6 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring/30 cursor-pointer">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Category</span>
                                <div className="relative">
                                    <select value={ticket.category} onChange={(e) => handleUpdate('category', e.target.value)}
                                        className="appearance-none text-xs bg-card border border-border rounded-md pl-2 pr-6 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring/30 cursor-pointer">
                                        <option value="BUG">Bug</option>
                                        <option value="FEATURE_REQUEST">Feature Request</option>
                                        <option value="SERVICE">Service</option>
                                    </select>
                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Assigned</span>
                                <span className="text-xs text-foreground/80">{ticket.assignedAgent?.name || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Created</span>
                                <span className="text-xs text-foreground/80">
                                    {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>


                    </div>
                </div>

                {/* ClickUp Task Section */}
                <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                        <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-semibold text-foreground">ClickUp Task</span>
                    </div>
                    {ticket.clickupTaskId ? (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Task ID</span>
                                <span className="text-xs font-mono text-foreground/80">#{ticket.clickupTaskId}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Status</span>
                                <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                    clickupStatusColor(ticket.clickupStatus)
                                }`}>
                                    {ticket.clickupStatus ?? 'BACKLOG'}
                                </span>
                            </div>
                            {ticket.clickupTags && (() => {
                                try {
                                    const tags: string[] = JSON.parse(ticket.clickupTags);
                                    if (tags.length === 0) return null;
                                    return (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">Tags</span>
                                            <div className="flex flex-wrap gap-1">
                                                {tags.map((tag) => (
                                                    <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                } catch {
                                    return null;
                                }
                            })()}
                            {ticket.clickupTaskUrl && (
                                <a
                                    href={ticket.clickupTaskUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Open in ClickUp
                                </a>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">Belum ada task ClickUp untuk tiket ini.</p>
                    )}
                </div>

            </ScrollArea>
        </aside>
    );
}
