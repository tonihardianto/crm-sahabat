import { ExternalLink, ChevronDown, X } from 'lucide-react';
import type { Ticket } from '@/lib/api';
import { updateTicket } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContextPanelProps {
    ticket: Ticket | null;
    onTicketUpdated: () => void;
    onClose?: () => void;
}

const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    NEW: "default",
    OPEN: "secondary",
    PENDING: "outline",
    RESOLVED: "secondary",
};

function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-colors cursor-pointer"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
        </div>
    );
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
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Customer ID</span>
                            <span className="text-xs font-mono text-foreground/80">{ticket.contact.client.customerId}</span>
                        </div>
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
                                <Badge variant={statusMap[ticket.status] || "secondary"}>{ticket.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Priority</span>
                                <Badge variant={ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                                    {ticket.priority}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Category</span>
                                <Badge variant="outline">{ticket.category}</Badge>
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

                        {ticket.clickupTaskUrl ? (
                            <a
                                href={ticket.clickupTaskUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open in ClickUp
                                {ticket.clickupStatus && (
                                    <span className="ml-auto uppercase text-[10px] opacity-70">{ticket.clickupStatus}</span>
                                )}
                            </a>
                        ) : (
                            <div className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-muted/40 border border-border text-muted-foreground cursor-not-allowed opacity-50">
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open in ClickUp
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Update Actions */}
                <div className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Update Ticket</h3>
                    <div className="space-y-3">
                        <SelectField label="Status" value={ticket.status}
                            options={[
                                { value: 'NEW', label: 'New' },
                                { value: 'OPEN', label: 'Open' },
                                { value: 'PENDING', label: 'Pending' },
                                { value: 'RESOLVED', label: 'Resolved' },
                            ]}
                            onChange={(v) => handleUpdate('status', v)}
                        />
                        <SelectField label="Category" value={ticket.category}
                            options={[
                                { value: 'BUG', label: 'Bug' },
                                { value: 'FEATURE_REQUEST', label: 'Feature Request' },
                                { value: 'SERVICE', label: 'Service' },
                            ]}
                            onChange={(v) => handleUpdate('category', v)}
                        />
                        <SelectField label="Priority" value={ticket.priority}
                            options={[
                                { value: 'LOW', label: 'Low' },
                                { value: 'MEDIUM', label: 'Medium' },
                                { value: 'HIGH', label: 'High' },
                                { value: 'URGENT', label: 'Urgent' },
                            ]}
                            onChange={(v) => handleUpdate('priority', v)}
                        />
                    </div>
                </div>
            </ScrollArea>
        </aside>
    );
}
