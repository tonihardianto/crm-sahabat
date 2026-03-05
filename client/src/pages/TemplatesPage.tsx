import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Pencil, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateData {
    id: string;
    name: string;
    bodyText: string;
    headerText: string | null;
    footerText: string | null;
    category: string;
    language: string;
    status: string;
}

const API = '/api/templates';

const categoryVariant: Record<string, "default" | "secondary" | "outline"> = {
    UTILITY: 'default',
    MARKETING: 'secondary',
    AUTHENTICATION: 'outline',
};

const statusColor: Record<string, string> = {
    APPROVED: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    REJECTED: 'text-red-400 border-red-500/30 bg-red-500/10',
    PENDING: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
};

export function TemplatesPage() {
    const [templates, setTemplates] = useState<TemplateData[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<TemplateData | null>(null);
    const [form, setForm] = useState({ name: '', bodyText: '', headerText: '', footerText: '', category: 'UTILITY', language: 'id' });

    const load = async () => {
        try { const res = await fetch(API); setTemplates(await res.json()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', bodyText: '', headerText: '', footerText: '', category: 'UTILITY', language: 'id' });
        setModalOpen(true);
    };

    const openEdit = (t: TemplateData) => {
        setEditing(t);
        setForm({ name: t.name, bodyText: t.bodyText, headerText: t.headerText || '', footerText: t.footerText || '', category: t.category, language: t.language });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await fetch(`${API}/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            } else {
                await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            }
            setModalOpen(false); load();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus template ini?')) return;
        try { await fetch(`${API}/${id}`, { method: 'DELETE' }); load(); }
        catch (err) { console.error(err); }
    };

    const filtered = templates.filter((t) => {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.bodyText.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-8 py-5 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Chat Templates</h1>
                            <p className="text-xs text-muted-foreground">Library pesan siap pakai (HSM / Template Message)</p>
                        </div>
                    </div>
                    <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-500">
                        <Plus className="w-4 h-4" /> Tambah Template
                    </Button>
                </div>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1">
                <div className="px-8 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground text-sm">
                            {search ? 'No templates found' : 'Belum ada template. Klik "Tambah Template" untuk mulai.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((t) => (
                                <Card key={t.id} className="hover:border-border/80 transition-colors group">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={categoryVariant[t.category] || 'outline'} className="text-[10px]">
                                                        {t.category}
                                                    </Badge>
                                                    <Badge variant="outline" className={`text-[10px] ${statusColor[t.status] || ''}`}>
                                                        {t.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(t.bodyText)}>
                                                    <Copy className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(t.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        {t.headerText && <p className="text-xs font-medium text-foreground/80 mb-1">{t.headerText}</p>}
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.bodyText}</p>
                                        {t.footerText && <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{t.footerText}</p>}
                                        <div className="mt-2">
                                            <span className="text-[10px] text-muted-foreground/60">Lang: {t.language}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Dialog Form */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Template' : 'Tambah Template'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Nama Template *</label>
                            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: greeting_awal" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Kategori</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="UTILITY">Utility</option>
                                <option value="MARKETING">Marketing</option>
                                <option value="AUTHENTICATION">Authentication</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Header (opsional)</label>
                            <Input value={form.headerText} onChange={(e) => setForm({ ...form, headerText: e.target.value })} placeholder="Header text" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Body *</label>
                            <Textarea required value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} rows={4}
                                placeholder="Tulis isi template. Gunakan {{1}}, {{2}} untuk placeholder." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Footer (opsional)</label>
                            <Input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} placeholder="Footer text" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-violet-600 hover:bg-violet-500">{editing ? 'Simpan' : 'Tambah'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
