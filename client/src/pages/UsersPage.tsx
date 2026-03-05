import { useState, useEffect, useCallback } from 'react';
import { Shield, UserPlus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';

interface CRMUser {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'AGENT';
    isActive: boolean;
    createdAt: string;
    _count: { claimedTickets: number; assignedTickets: number };
}

interface UserForm {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'AGENT';
}

const emptyForm: UserForm = { name: '', email: '', password: '', role: 'AGENT' };

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<CRMUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CRMUser | null>(null);
    const [form, setForm] = useState<UserForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CRMUser | null>(null);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const loadUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/users', { credentials: 'include' });
            setUsers(await res.json());
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setDialogOpen(true); };
    const openEdit = (u: CRMUser) => {
        setEditing(u);
        setForm({ name: u.name, email: u.email, password: '', role: u.role });
        setError('');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.email) { setError('Nama dan email wajib diisi'); return; }
        if (!editing && !form.password) { setError('Password wajib diisi untuk user baru'); return; }
        setSaving(true);
        setError('');
        try {
            const body: Partial<UserForm> = { name: form.name, email: form.email, role: form.role };
            if (form.password) body.password = form.password;

            const res = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const e = await res.json();
                setError(e.message || 'Gagal menyimpan');
                return;
            }
            setDialogOpen(false);
            loadUsers();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (u: CRMUser) => {
        await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'include' });
        setDeleteTarget(null);
        loadUsers();
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-8 py-6 border-b border-border bg-card/50 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Manajemen User</h3>
                        <p className="text-xs text-muted-foreground">Kelola akun agen dan admin CRM</p>
                    </div>
                </div>
                <Button onClick={openCreate} size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" /> Tambah User
                </Button>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="px-8 py-6">
                    {/* Search */}
                    <div className="mb-4">
                        <Input
                            placeholder="Cari nama atau email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                                {filtered.length} User Terdaftar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Tickets</TableHead>
                                            <TableHead>Terdaftar</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-foreground border border-border">
                                                            {u.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-sm">{u.name}</span>
                                                        {u.id === currentUser?.userId && (
                                                            <span className="text-[10px] text-muted-foreground">(Anda)</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={u.role === 'ADMIN'
                                                            ? 'border-violet-500/30 text-violet-400 bg-violet-500/10 text-[10px]'
                                                            : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]'
                                                        }
                                                    >
                                                        {u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {u.isActive
                                                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Aktif</span>
                                                        : <span className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="w-3 h-3" /> Nonaktif</span>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                        {u._count.claimedTickets} claimed · {u._count.assignedTickets} assigned
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatDate(u.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteTarget(u)}
                                                            disabled={u.id === currentUser?.userId}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                                {error}
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Nama Lengkap</label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama user" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Email</label>
                            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@crm.local" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">{editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</label>
                            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Role</label>
                            <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as 'ADMIN' | 'AGENT' }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AGENT">Agent</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus User?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        Yakin ingin menghapus <strong className="text-foreground">{deleteTarget?.name}</strong>? Tindakan ini tidak bisa dibatalkan.
                    </p>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
                        <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
