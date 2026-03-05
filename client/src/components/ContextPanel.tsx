import { Building2, Tag, ExternalLink, ChevronDown } from 'lucide-react';
import type { Ticket } from '@/lib/api';
import { updateTicket } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContextPanelProps {
    ticket: Ticket | null;
    onTicketUpdated: () => void;
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

export function ContextPanel({ ticket, onTicketUpdated }: ContextPanelProps) {
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
            <ScrollArea className="flex-1 overflow-y-auto">
                {/* Client Detail */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-foreground">Client Detail</h3>
                    </div>

                    <div className="space-y-3">
                        <Card className="py-2 px-3 gap-0">
                            <CardContent className="p-0">
                                <p className="text-xs text-muted-foreground mb-0.5">Nama RS</p>
                                <p className="text-sm font-medium text-foreground">{ticket.contact.client.name}</p>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-2">
                            <Card className="py-2 px-3 gap-0">
                                <CardContent className="p-0">
                                    <p className="text-xs text-muted-foreground mb-0.5">Customer ID</p>
                                    <p className="text-sm font-mono text-foreground/80">{ticket.contact.client.customerId}</p>
                                </CardContent>
                            </Card>
                            <Card className="py-2 px-3 gap-0">
                                <CardContent className="p-0">
                                    <p className="text-xs text-muted-foreground mb-0.5">Contact</p>
                                    <p className="text-sm text-foreground/80 truncate">{ticket.contact.name}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {ticket.contact.position && (
                            <Card className="py-2 px-3 gap-0">
                                <CardContent className="p-0">
                                    <p className="text-xs text-muted-foreground mb-0.5">Jabatan</p>
                                    <p className="text-sm text-foreground/80">{ticket.contact.position}</p>
                                </CardContent>
                            </Card>
                        )}

                        {ticket.contact.client.address && (
                            <Card className="py-2 px-3 gap-0">
                                <CardContent className="p-0">
                                    <p className="text-xs text-muted-foreground mb-0.5">Alamat</p>
                                    <p className="text-sm text-foreground/80">{ticket.contact.client.address}</p>
                                </CardContent>
                            </Card>
                        )}

                        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors cursor-pointer">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open in ClickUp
                        </button>
                    </div>
                </div>

                {/* Ticket Info */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-foreground">Ticket Info</h3>
                    </div>

                    <div className="space-y-3 mb-4">
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
