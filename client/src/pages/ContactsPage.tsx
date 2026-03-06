import { useState, useEffect } from 'react';
import { Users, Plus, Search, Pencil, Trash2, Phone, Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContactData {
    id: string;
    name: string;
    phoneNumber: string;
    waId: string | null;
    position: string | null;
    clientId: string;
    client: { id: string; name: string; customerId: string };
}

interface ClientOption {
    id: string;
    name: string;
    customerId: string;
}

const API_CONTACTS = '/api/contacts';
const API_CLIENTS = '/api/clients';

export function ContactsPage() {
    const [contacts, setContacts] = useState<ContactData[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactData | null>(null);
    const [form, setForm] = useState({ name: '', phoneNumber: '', clientId: '', position: '' });

    const loadContacts = async () => {
        try { const res = await fetch(API_CONTACTS); setContacts(await res.json()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadClients = async () => {
        try { const res = await fetch(API_CLIENTS); setClients(await res.json()); }
        catch (err) { console.error(err); }
    };

    useEffect(() => { loadContacts(); loadClients(); }, []);

    const openCreate = () => {
        setEditingContact(null);
        setForm({ name: '', phoneNumber: '', clientId: clients[0]?.id || '', position: '' });
        setModalOpen(true);
    };

    const openEdit = (c: ContactData) => {
        setEditingContact(c);
        setForm({ name: c.name, phoneNumber: c.phoneNumber, clientId: c.clientId, position: c.position || '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingContact) {
                await fetch(`${API_CONTACTS}/${editingContact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            } else {
                await fetch(API_CONTACTS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, waId: form.phoneNumber }) });
            }
            setModalOpen(false); loadContacts();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus contact ini?')) return;
        try { await fetch(`${API_CONTACTS}/${id}`, { method: 'DELETE' }); loadContacts(); }
        catch (err) { console.error(err); }
    };

    const filtered = contacts.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q) || c.client.name.toLowerCase().includes(q);
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-4 md:px-8 py-4 md:py-5 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Contacts</h1>
                            <p className="text-xs text-muted-foreground">Kelola kontak personil Rumah Sakit</p>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                        <Plus className="w-4 h-4" /> Tambah Contact
                    </Button>
                </div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search by name, phone, or RS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                            {search ? 'No contacts found' : 'Belum ada data contact.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>No. Telepon</TableHead>
                                    <TableHead>Jabatan</TableHead>
                                    <TableHead>Rumah Sakit</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium">{c.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Phone className="w-3 h-3" />{c.phoneNumber}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">{c.position || '—'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-3 h-3 text-blue-400" />
                                                <span className="text-sm">{c.client.name}</span>
                                            </div>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingContact ? 'Edit Contact' : 'Tambah Contact'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Nama *</label>
                            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: Budi Hartono" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">No. Telepon (WA) *</label>
                            <Input required value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="6281234567890" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Rumah Sakit *</label>
                            <div className="relative">
                                <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                    className="w-full appearance-none px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer">
                                    <option value="">Pilih RS...</option>
                                    {clients.map((cl) => <option key={cl.id} value={cl.id}>{cl.name} ({cl.customerId})</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Jabatan</label>
                            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="contoh: Kepala IT" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">{editingContact ? 'Simpan' : 'Tambah'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
