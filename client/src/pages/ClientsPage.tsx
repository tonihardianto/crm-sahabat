import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Pencil, Trash2, MapPin, Phone, Hash, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAgents, type Agent } from '@/lib/api';

interface ClientData {
    id: string;
    name: string;
    customerId: string;
    address: string | null;
    phone: string | null;
    picId: string | null;
    pic: { id: string; name: string } | null;
    slaTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    _count: { contacts: number };
}

const SLA_TIER_LABEL: Record<string, string> = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum' };
const SLA_TIER_CLASS: Record<string, string> = {
    BRONZE: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    SILVER: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
    GOLD: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
    PLATINUM: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
};
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', SUSPENDED: 'Suspended' };
const STATUS_CLASS: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
    SUSPENDED: 'bg-red-500/10 text-red-400 border-red-500/25',
};

const API = '/api/clients';

export function ClientsPage() {
    const [clients, setClients] = useState<ClientData[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientData | null>(null);
    const [form, setForm] = useState({ name: '', customerId: '', address: '', phone: '', picId: '', slaTier: 'BRONZE', status: 'ACTIVE' });

    const loadClients = async () => {
        try {
            const res = await fetch(API, { credentials: 'include' });
            setClients(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        loadClients();
        fetchAgents().then(setAgents).catch(console.error);
    }, []);

    const openCreate = () => {
        setEditingClient(null);
        setForm({ name: '', customerId: '', address: '', phone: '', picId: '', slaTier: 'BRONZE', status: 'ACTIVE' });
        setModalOpen(true);
    };

    const openEdit = (c: ClientData) => {
        setEditingClient(c);
        setForm({ name: c.name, customerId: c.customerId, address: c.address || '', phone: c.phone || '', picId: c.picId || '', slaTier: c.slaTier, status: c.status });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { customerId: _cid, ...createFields } = form;
        const payload = editingClient
            ? { ...form, picId: form.picId || null }
            : { ...createFields, picId: form.picId || null };
        try {
            if (editingClient) {
                await fetch(`${API}/${editingClient.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            } else {
                await fetch(API, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            }
            setModalOpen(false);
            loadClients();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus client ini? Semua contact akan dihapus.')) return;
        try { await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' }); loadClients(); }
        catch (err) { console.error(err); }
    };

    const filtered = clients.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.customerId.toLowerCase().includes(q);
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-4 md:px-8 py-4 md:py-5 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Clients</h1>
                            <p className="text-xs text-muted-foreground">Kelola data Rumah Sakit</p>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="w-4 h-4" /> Tambah Client
                    </Button>
                </div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1">
                <div className="px-4 md:px-8 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground text-sm">
                            {search ? 'No clients found' : 'Belum ada data client. Klik "Tambah Client" untuk mulai.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama RS</TableHead>
                                    <TableHead>Customer ID</TableHead>
                                    <TableHead>SLA Tier</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>PIC</TableHead>
                                    <TableHead>Alamat</TableHead>
                                    <TableHead>Telepon</TableHead>
                                    <TableHead className="text-center">Contacts</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className="text-sm font-medium">{c.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="gap-1 font-mono text-xs">
                                                <Hash className="w-3 h-3" />{c.customerId}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${SLA_TIER_CLASS[c.slaTier]}`}>
                                                {SLA_TIER_LABEL[c.slaTier]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${STATUS_CLASS[c.status]}`}>
                                                {STATUS_LABEL[c.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {c.pic ? (
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span>{c.pic.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px] truncate">
                                                {c.address && <MapPin className="w-3 h-3 shrink-0" />}
                                                <span className="truncate">{c.address || '—'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                {c.phone && <Phone className="w-3 h-3" />}
                                                {c.phone || '—'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="text-emerald-400 bg-emerald-500/10">
                                                {c._count.contacts}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Dialog Form */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className='w-xxl'>
                    <DialogHeader>
                        <DialogTitle>{editingClient ? 'Edit Client' : 'Tambah Client'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Nama RS *</label>
                            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: RSUD Medika Utama" />
                        </div>
                        {editingClient && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                                    <Hash className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-mono">{form.customerId}</span>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Alamat</label>
                            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Jl. ..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Telepon</label>
                            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6231..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">SLA Tier</label>
                                <Select value={form.slaTier} onValueChange={(v) => setForm({ ...form, slaTier: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BRONZE">Bronze</SelectItem>
                                        <SelectItem value="SILVER">Silver</SelectItem>
                                        <SelectItem value="GOLD">Gold</SelectItem>
                                        <SelectItem value="PLATINUM">Platinum</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Status</label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">PIC (Agent Penanggung Jawab)</label>
                            <Select value={form.picId} onValueChange={(v) => setForm({ ...form, picId: v === '__none__' ? '' : v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih agent..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">— Tidak ada PIC —</SelectItem>
                                    {agents.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.name}
                                            <span className="ml-2 text-xs text-muted-foreground">{a.role}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                            <Button type="submit">{editingClient ? 'Simpan' : 'Tambah'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
