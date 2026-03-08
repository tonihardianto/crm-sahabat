import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Ticket, Agent } from '@/lib/api';
import { fetchAgents, assignTicket } from '@/lib/api';
import { UserCheck } from 'lucide-react';

interface AssignDialogProps {
    ticket: Ticket;
    open: boolean;
    onClose: () => void;
    onSuccess: (updatedTicket: Ticket) => void;
}

export function AssignDialog({ ticket, open, onClose, onSuccess }: AssignDialogProps) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [agentId, setAgentId] = useState<string>(ticket.assignedAgentId ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        fetchAgents()
            .then(setAgents)
            .catch(() => setError('Gagal memuat daftar agen.'));
        setAgentId(ticket.assignedAgentId ?? '');
    }, [open, ticket.assignedAgentId]);

    async function handleConfirm() {
        if (!agentId) return;
        setLoading(true);
        setError(null);
        try {
            const updated = await assignTicket(ticket.id, agentId);
            onSuccess(updated);
            onClose();
        } catch {
            setError('Assign gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }

    function handleClose() {
        if (loading) return;
        setError(null);
        onClose();
    }

    const selectedAgent = agents.find((a) => a.id === agentId);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Assign Tiket
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                        Pilih agen yang akan menangani tiket{' '}
                        <span className="font-semibold text-foreground">{ticket.ticketNumber}</span>.
                    </p>

                    {ticket.assignedAgent && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted/50 border border-border">
                            <UserCheck className="w-3.5 h-3.5" />
                            Saat ini assigned ke:{' '}
                            <span className="font-medium text-foreground">{ticket.assignedAgent.name}</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Assign ke</label>
                        <Select value={agentId} onValueChange={setAgentId}>
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
                        {selectedAgent && (
                            <p className="text-xs text-muted-foreground">{selectedAgent.email}</p>
                        )}
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={loading}>Batal</Button>
                    <Button onClick={handleConfirm} disabled={!agentId || loading}>
                        {loading ? 'Memproses...' : 'Konfirmasi Assign'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
