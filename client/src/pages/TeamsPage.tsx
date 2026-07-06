import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Team {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
}

interface TeamForm {
    name: string;
    email: string;
    phone: string;
    department: string;
    status: 'ACTIVE' | 'INACTIVE';
}

const emptyForm: TeamForm = { name: '', email: '', phone: '', department: '', status: 'ACTIVE' };
const PAGE_SIZE = 10;

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Team | null>(null);
    const [form, setForm] = useState<TeamForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const loadTeams = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teams?page=${p}&limit=${PAGE_SIZE}`, { credentials: 'include' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setTeams(data.teams);
            setTotal(data.total);
            setTotalPages(data.totalPages);
            setPage(data.page);
        } catch {
            toast.error('Gagal memuat data tim');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTeams(1); }, [loadTeams]);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
    const openEdit = (t: Team) => {
        setEditing(t);
        setForm({
            name: t.name,
            email: t.email ?? '',
            phone: t.phone ?? '',
            department: t.department ?? '',
            status: t.status,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Nama tim wajib diisi'); return; }
        setSaving(true);
        try {
            const res = await fetch(editing ? `/api/teams/${editing.id}` : '/api/teams', {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email || null,
                    phone: form.phone || null,
                    department: form.department || null,
                    status: form.status,
                }),
            });
            if (!res.ok) throw new Error();
            toast.success(editing ? 'Tim berhasil diperbarui' : 'Tim berhasil ditambahkan');
            setDialogOpen(false);
            loadTeams(page);
        } catch {
            toast.error('Gagal menyimpan tim');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (t: Team) => {
        try {
            await fetch(`/api/teams/${t.id}`, { method: 'DELETE', credentials: 'include' });
            toast.success('Tim berhasil dihapus');
        } catch {
            toast.error('Gagal menghapus tim');
        }
        setDeleteTarget(null);
        // Go to previous page if we deleted the last item on this page
        const newPage = teams.length === 1 && page > 1 ? page - 1 : page;
        loadTeams(newPage);
    };

    const filtered = teams.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.department && t.department.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-4 md:px-8 py-4 md:py-6 border-b border-border bg-card/50 shrink-0 flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Manajemen Tim</h3>
                        <p className="text-xs text-muted-foreground">Kelola tim untuk penjadwalan dan kalender</p>
                    </div>
                </div>
                <Button onClick={openCreate} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Tambah Tim
                </Button>
            </div>

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-4 md:px-8 py-4 md:py-6">
                    {/* Search */}
                    <div className="mb-4">
                        <Input
                            placeholder="Cari nama tim atau departemen..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                                {total} Tim Terdaftar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Tim</TableHead>
                                            <TableHead>Departemen</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Telepon</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Terdaftar</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                                                    {search ? 'Tidak ada tim yang cocok dengan pencarian.' : 'Belum ada tim terdaftar.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtered.map(t => (
                                                <TableRow key={t.id}>
                                                    <TableCell>
                                                        <span className="font-medium text-sm">{t.name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {t.department || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {t.email || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {t.phone || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {t.status === 'ACTIVE'
                                                            ? <span className="flex items-center gap-1 text-success text-xs"><CheckCircle2 className="w-3 h-3" /> Aktif</span>
                                                            : <span className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="w-3 h-3" /> Nonaktif</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDate(t.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={() => setDeleteTarget(t)}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <span className="text-muted-foreground">
                                Halaman {page} dari {totalPages}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadTeams(page - 1)}
                                    disabled={page <= 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Sebelumnya
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadTeams(page + 1)}
                                    disabled={page >= totalPages}
                                >
                                    Berikutnya
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Tim' : 'Tambah Tim Baru'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Nama Tim *</label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Tim Support RS A" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Departemen</label>
                            <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Contoh: IT Support" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Email</label>
                            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="tim@example.com" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Telepon</label>
                            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+62..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as 'ACTIVE' | 'INACTIVE' }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                                    <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Tim'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Tim?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        Yakin ingin menghapus tim <strong className="text-foreground">{deleteTarget?.name}</strong>? Tindakan ini tidak bisa dibatalkan.
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
