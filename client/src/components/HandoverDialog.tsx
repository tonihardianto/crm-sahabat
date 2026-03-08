import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Ticket, Agent } from '@/lib/api';
import { fetchAgents, handoverTicket } from '@/lib/api';
import { ArrowRight } from 'lucide-react';

interface HandoverDialogProps {
    ticket: Ticket;
    open: boolean;
    onClose: () => void;
    onSuccess: (updatedTicket: Ticket) => void;
}

export function HandoverDialog({ ticket, open, onClose, onSuccess }: HandoverDialogProps) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [toAgentId, setToAgentId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        fetchAgents()
            .then((data) => {
                // Exclude current claimer from the list
                setAgents(data.filter((a) => a.id !== ticket.claimedById));
            })
            .catch(() => setError('Gagal memuat daftar agen.'));
    }, [open, ticket.claimedById]);

    async function handleConfirm() {
        if (!toAgentId) return;
        setLoading(true);
        setError(null);
        try {
            const updated = await handoverTicket(ticket.id, toAgentId);
            onSuccess(updated);
            onClose();
        } catch {
            setError('Handover gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        if (loading) return;
        setToAgentId('');
        setError(null);
        onClose();
    }

    const fromName = ticket.claimedBy?.name ?? 'Unclaimed';
    const toName = agents.find((a) => a.id === toAgentId)?.name;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Handover Tiket</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                        Tiket <span className="font-semibold text-foreground">{ticket.ticketNumber}</span> akan diserahkan ke agen lain.
                    </p>

                    {/* From → To visualizer */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <span className="text-sm font-medium text-foreground">{fromName}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-primary">{toName ?? '—'}</span>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Serahkan ke</label>
                        <Select value={toAgentId} onValueChange={setToAgentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih agen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                        {agent.name}
                                        <span className="ml-2 text-xs text-muted-foreground">{agent.role}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={loading}>Batal</Button>
                    <Button onClick={handleConfirm} disabled={!toAgentId || loading}>
                        {loading ? 'Memproses...' : 'Konfirmasi Handover'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
