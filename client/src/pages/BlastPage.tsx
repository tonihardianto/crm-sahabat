import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Search, Play, X, Trash2, CheckCircle2, AlertCircle, Clock, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
    fetchBlastCampaigns,
    fetchBlastCampaign,
    createBlastCampaign,
    startBlastCampaign,
    cancelBlastCampaign,
    deleteBlastCampaign,
    type BlastCampaign,
    type BlastRecipient,
} from '@/lib/api';

// ── Types ────────────────────────────────────────────────────

interface Template {
    id: string;
    name: string;
    bodyText: string;
    headerText: string | null;
    language: string;
    status: string;
    category: string;
}

interface Contact {
    id: string;
    name: string;
    phoneNumber: string;
    waId: string | null;
    position: string | null;
    client: { id: string; name: string; customerId: string };
}

// ── Helpers ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT:       { label: 'Draft',       color: 'bg-muted text-muted-foreground' },
    IN_PROGRESS: { label: 'Berjalan',    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    COMPLETED:   { label: 'Selesai',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    CANCELLED:   { label: 'Dibatalkan',  color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    SCHEDULED:   { label: 'Terjadwal',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

const RECIPIENT_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    PENDING:   { label: 'Pending',    icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" /> },
    SENT:      { label: 'Terkirim',   icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> },
    DELIVERED: { label: 'Diterima',   icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
    FAILED:    { label: 'Gagal',      icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" /> },
};

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ProgressBar({ sent, failed, total }: { sent: number; failed: number; total: number }) {
    if (total === 0) return null;
    const sentPct = Math.round((sent / total) * 100);
    const failPct = Math.round((failed / total) * 100);
    return (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${sentPct}%` }} />
            <div className="h-full bg-red-500 transition-all" style={{ width: `${failPct}%` }} />
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────

function detectVars(bodyText: string): number[] {
    const indices = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g)).map(m => parseInt(m[1]));
    return [...new Set(indices)].sort((a, b) => a - b);
}

export function BlastPage() {
    const [campaigns, setCampaigns] = useState<BlastCampaign[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    // Create form state
    const [formName, setFormName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [templateSearch, setTemplateSearch] = useState('');
    const [contactSearch, setContactSearch] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
    const [templateVars, setTemplateVars] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Detail dialog
    const [detailCampaign, setDetailCampaign] = useState<BlastCampaign | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailSearch, setDetailSearch] = useState('');
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        try {
            const data = await fetchBlastCampaigns();
            setCampaigns(data);
        } catch {
            toast.error('Gagal memuat daftar campaign');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh jika ada campaign IN_PROGRESS
    useEffect(() => {
        const hasRunning = campaigns.some(c => c.status === 'IN_PROGRESS');
        if (!hasRunning) return;
        const id = setInterval(() => load(true), 4000);
        return () => clearInterval(id);
    }, [campaigns, load]);

    const openCreate = async () => {
        setFormName('');
        setSelectedTemplate(null);
        setTemplateSearch('');
        setContactSearch('');
        setSelectedContactIds(new Set());
        setFormStep(1);
        setTemplateVars({});
        setCreateOpen(true);

        if (templates.length === 0 || contacts.length === 0) {
            setLoadingResources(true);
            try {
                const [tRes, cRes] = await Promise.all([
                    fetch('/api/templates', { credentials: 'include' }),
                    fetch('/api/contacts', { credentials: 'include' }),
                ]);
                const [tData, cData] = await Promise.all([tRes.json(), cRes.json()]);
                setTemplates((tData as Template[]).filter(t => t.status === 'APPROVED'));
                setContacts(cData as Contact[]);
            } catch {
                toast.error('Gagal memuat template/kontak');
            } finally {
                setLoadingResources(false);
            }
        }
    };

    const openDetail = async (id: string) => {
        setDetailSearch('');
        setDetailOpen(true);
        setLoadingDetail(true);
        try {
            const data = await fetchBlastCampaign(id);
            setDetailCampaign(data);
        } catch {
            toast.error('Gagal memuat detail campaign');
            setDetailOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const refreshDetail = async () => {
        if (!detailCampaign) return;
        try {
            const data = await fetchBlastCampaign(detailCampaign.id);
            setDetailCampaign(data);
            // Also update in list
            setCampaigns(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
        } catch { /* ignore */ }
    };

    const handleSelectTemplate = (t: Template) => {
        setSelectedTemplate(t);
        const vars: Record<number, string> = {};
        detectVars(t.bodyText).forEach(i => { vars[i] = ''; });
        setTemplateVars(vars);
    };

    const handleCreate = async () => {
        if (!formName.trim() || !selectedTemplate || selectedContactIds.size === 0) return;
        setSubmitting(true);
        const paramEntries = Object.entries(templateVars).sort(([a], [b]) => parseInt(a) - parseInt(b));
        const components: unknown[] = paramEntries.length > 0
            ? [{ type: 'body', parameters: paramEntries.map(([, val]) => ({ type: 'text', text: val })) }]
            : [];
        try {
            await createBlastCampaign({
                name: formName.trim(),
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language || 'id',
                components,
                contactIds: Array.from(selectedContactIds),
            });
            toast.success('Campaign berhasil dibuat sebagai Draft');
            setCreateOpen(false);
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membuat campaign');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStart = async (id: string) => {
        try {
            await startBlastCampaign(id);
            toast.success('Campaign dimulai, pesan sedang dikirim...');
            load(true);
            if (detailCampaign?.id === id) refreshDetail();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal memulai campaign');
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await cancelBlastCampaign(id);
            toast.success('Campaign dibatalkan');
            load(true);
            if (detailCampaign?.id === id) refreshDetail();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal membatalkan campaign');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteBlastCampaign(deleteTarget);
            toast.success('Campaign dihapus');
            if (detailCampaign?.id === deleteTarget) setDetailOpen(false);
            load(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gagal menghapus campaign');
        } finally {
            setDeleteTarget(null);
        }
    };

    const toggleContact = (id: string) => {
        setSelectedContactIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const visible = filteredContacts.map(c => c.id);
        setSelectedContactIds(prev => {
            const next = new Set(prev);
            visible.forEach(id => next.add(id));
            return next;
        });
    };

    const clearAll = () => setSelectedContactIds(new Set());

    const templateVarIndices = selectedTemplate ? detectVars(selectedTemplate.bodyText) : [];
    const hasVars = templateVarIndices.length > 0;
    const totalSteps = hasVars ? 3 : 2;

    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.templateName.toLowerCase().includes(search.toLowerCase())
    );

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const filteredContacts = contacts.filter(c => {
        const q = contactSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.phoneNumber.includes(q) ||
            c.client.name.toLowerCase().includes(q)
        );
    });

    const filteredRecipients = (detailCampaign?.recipients ?? []).filter(r => {
        const q = detailSearch.toLowerCase();
        return (
            (r.contactName ?? '').toLowerCase().includes(q) ||
            r.phoneNumber.includes(q)
        );
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-4 md:px-8 py-4 md:py-5 border-b border-border bg-card/50 shrink-0">
                <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Blast Campaign</h1>
                            <p className="text-xs text-muted-foreground">Kirim template pesan massal ke banyak kontak sekaligus</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} className="gap-2">
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <Button size="sm" onClick={openCreate} className="gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Buat Campaign</span>
                            <span className="sm:hidden">Buat</span>
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Campaign', value: campaigns.length, color: 'text-foreground' },
                        { label: 'Berjalan', value: campaigns.filter(c => c.status === 'IN_PROGRESS').length, color: 'text-blue-400' },
                        { label: 'Selesai', value: campaigns.filter(c => c.status === 'COMPLETED').length, color: 'text-emerald-400' },
                        { label: 'Draft', value: campaigns.filter(c => c.status === 'DRAFT').length, color: 'text-muted-foreground' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-card rounded-xl border border-border px-4 py-3">
                            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                            <p className={`text-xl font-bold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="px-4 md:px-8 py-3 border-b border-border shrink-0">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari campaign..." className="pl-8 h-8 text-sm" />
                </div>
            </div>

            {/* Campaign List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 md:p-8 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCampaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Megaphone className="w-10 h-10 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                                {search ? 'Tidak ada campaign yang cocok' : 'Belum ada blast campaign'}
                            </p>
                            {!search && (
                                <Button size="sm" variant="outline" onClick={openCreate} className="gap-2">
                                    <Plus className="w-4 h-4" /> Buat Campaign Pertama
                                </Button>
                            )}
                        </div>
                    ) : (
                        filteredCampaigns.map(campaign => {
                            const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;
                            const total = campaign.totalRecipients;
                            const done = campaign.sentCount + campaign.failedCount;
                            return (
                                <div key={campaign.id}
                                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/40 cursor-pointer transition-colors"
                                    onClick={() => openDetail(campaign.id)}>

                                    {/* Left: name + meta */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-medium text-foreground truncate">{campaign.name}</span>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            {campaign.status === 'IN_PROGRESS' && <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                            <span className="font-mono truncate max-w-[140px]">{campaign.templateName}</span>
                                            <span>·</span>
                                            <span>{total} penerima</span>
                                            {total > 0 && campaign.sentCount > 0 && <span className="text-emerald-400">{campaign.sentCount} terkirim</span>}
                                            {campaign.failedCount > 0 && <span className="text-red-400">{campaign.failedCount} gagal</span>}
                                            {campaign.status === 'IN_PROGRESS' && <span className="text-blue-400">{total - done} pending</span>}
                                        </div>
                                    </div>

                                    {/* Right: actions */}
                                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                        {campaign.status === 'DRAFT' && (
                                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                                onClick={() => handleStart(campaign.id)}>
                                                <Play className="w-3 h-3" /> Kirim
                                            </Button>
                                        )}
                                        {(campaign.status === 'DRAFT' || campaign.status === 'IN_PROGRESS') && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                                onClick={() => handleCancel(campaign.id)}>
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                        {campaign.status !== 'IN_PROGRESS' && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                                onClick={() => setDeleteTarget(campaign.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Create Campaign Dialog ── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-orange-400" />
                            Buat Blast Campaign
                        </DialogTitle>
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {(hasVars ? ['Template & Nama', 'Pilih Kontak', 'Isi Variabel'] : ['Template & Nama', 'Pilih Kontak']).map((label, i) => {
                                const step = i + 1;
                                return (
                                    <div key={step} className="flex items-center gap-1.5">
                                        <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                                            formStep === step ? 'bg-orange-500 text-white' :
                                            formStep > step ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                                        }`}>{formStep > step ? '✓' : step}</div>
                                        <span className={`text-xs ${formStep === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                            {label}
                                        </span>
                                        {step < totalSteps && <ChevronDown className="w-3 h-3 text-muted-foreground rotate-[-90deg]" />}
                                    </div>
                                );
                            })}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {loadingResources ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : formStep === 1 ? (
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1.5">Nama Campaign</label>
                                    <Input
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="Contoh: Maintenance Update Maret 2026"
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1.5">
                                        Template WhatsApp <span className="text-xs text-muted-foreground font-normal">(hanya yang APPROVED)</span>
                                    </label>
                                    <Input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)}
                                        placeholder="Cari template..." className="mb-2" />
                                    <ScrollArea className="h-56 border border-border rounded-lg">
                                        {filteredTemplates.length === 0 ? (
                                            <p className="text-sm text-muted-foreground p-4 text-center">Tidak ada template APPROVED</p>
                                        ) : filteredTemplates.map(t => (
                                            <div key={t.id}
                                                onClick={() => handleSelectTemplate(t)}
                                                className={`p-3 cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                                                    selectedTemplate?.id === t.id ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : 'hover:bg-muted/50'
                                                }`}>
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-sm font-medium text-foreground font-mono">{t.name}</span>
                                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.language}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{t.bodyText}</p>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>

                                {selectedTemplate && (
                                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">Preview Template</p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTemplate.bodyText}</p>
                                        {selectedTemplate.headerText && (
                                            <p className="text-xs text-muted-foreground mt-1">Header: {selectedTemplate.headerText}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : formStep === 2 ? (
                            <div className="p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-foreground">
                                        Pilih Kontak <span className="text-muted-foreground font-normal">({selectedContactIds.size} dipilih)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <button onClick={selectAll} className="text-xs text-blue-400 hover:underline">Pilih semua</button>
                                        <span className="text-muted-foreground">·</span>
                                        <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">Hapus pilihan</button>
                                    </div>
                                </div>
                                <Input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                    placeholder="Cari nama, nomor, atau klien..." />
                                <ScrollArea className="h-72 border border-border rounded-lg">
                                    {filteredContacts.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-4 text-center">Tidak ada kontak</p>
                                    ) : filteredContacts.map(c => (
                                        <div key={c.id}
                                            onClick={() => toggleContact(c.id)}
                                            className={`flex items-center gap-3 p-3 cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                                                selectedContactIds.has(c.id) ? 'bg-orange-500/10' : 'hover:bg-muted/50'
                                            }`}>
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                selectedContactIds.has(c.id) ? 'bg-orange-500 border-orange-500' : 'border-border'
                                            }`}>
                                                {selectedContactIds.has(c.id) && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                                                    {c.position && <span className="text-xs text-muted-foreground truncate">· {c.position}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{c.phoneNumber}</span>
                                                    <span>·</span>
                                                    <span className="truncate">{c.client.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                                    Variabel ini berlaku sama untuk <span className="font-semibold">semua penerima</span>. Pastikan nilainya sesuai sebelum mengirim.
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Isi Variabel</label>
                                    <div className="space-y-2.5">
                                        {templateVarIndices.map(idx => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">{`{{${idx}}}`}</span>
                                                <Input
                                                    value={templateVars[idx] ?? ''}
                                                    onChange={e => setTemplateVars(prev => ({ ...prev, [idx]: e.target.value }))}
                                                    placeholder={`Nilai untuk {{${idx}}}`}
                                                    className="flex-1"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {selectedTemplate && (
                                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-[10px] text-blue-300/70 mb-1.5">Preview pesan:</p>
                                        <p className="text-xs text-foreground whitespace-pre-wrap">
                                            {templateVarIndices.reduce(
                                                (text, idx) => text.replace(new RegExp(`\\{\\{${idx}\\}\\}`, 'g'), templateVars[idx] || `[var ${idx}]`),
                                                selectedTemplate.bodyText
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex-row gap-2 justify-between">
                        <Button variant="outline" onClick={() => formStep === 1 ? setCreateOpen(false) : setFormStep((formStep - 1) as 1 | 2 | 3)}>
                            {formStep === 1 ? 'Batal' : '← Kembali'}
                        </Button>
                        {formStep === 1 ? (
                            <Button
                                disabled={!formName.trim() || !selectedTemplate}
                                onClick={() => setFormStep(2)}>
                                Selanjutnya →
                            </Button>
                        ) : formStep === 2 ? (
                            <Button
                                disabled={selectedContactIds.size === 0 || submitting}
                                onClick={() => hasVars ? setFormStep(3) : handleCreate()}>
                                {hasVars ? 'Selanjutnya →' : (submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Menyimpan...</> : `Simpan Draft (${selectedContactIds.size} kontak)`)}
                            </Button>
                        ) : (
                            <Button
                                disabled={submitting}
                                onClick={handleCreate}>
                                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Menyimpan...</> : `Simpan Draft (${selectedContactIds.size} kontak)`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Detail Campaign Dialog ── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
                    {loadingDetail || !detailCampaign ? (
                        <div className="flex items-center justify-center p-16">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <DialogTitle className="flex items-center gap-2 flex-wrap">
                                            {detailCampaign.name}
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_CONFIG[detailCampaign.status]?.color}`}>
                                                {STATUS_CONFIG[detailCampaign.status]?.label}
                                            </span>
                                            {detailCampaign.status === 'IN_PROGRESS' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                                        </DialogTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Template: <span className="font-mono">{detailCampaign.templateName}</span>
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={refreshDetail}>
                                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-4 mt-3 text-sm">
                                    <span className="text-muted-foreground">{detailCampaign.totalRecipients} penerima</span>
                                    <span className="text-emerald-400">{detailCampaign.sentCount} terkirim</span>
                                    <span className="text-red-400">{detailCampaign.failedCount} gagal</span>
                                    <span className="text-muted-foreground">
                                        {(detailCampaign.recipients?.filter(r => r.status === 'DELIVERED').length ?? 0)} diterima
                                    </span>
                                </div>
                                <ProgressBar
                                    sent={detailCampaign.sentCount}
                                    failed={detailCampaign.failedCount}
                                    total={detailCampaign.totalRecipients}
                                />

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 mt-2">
                                    {detailCampaign.status === 'DRAFT' && (
                                        <Button size="sm" className="gap-1.5 text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleStart(detailCampaign.id)}>
                                            <Play className="w-3 h-3" /> Mulai Kirim
                                        </Button>
                                    )}
                                    {(detailCampaign.status === 'DRAFT' || detailCampaign.status === 'IN_PROGRESS') && (
                                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 text-red-400 border-red-500/30"
                                            onClick={() => handleCancel(detailCampaign.id)}>
                                            <X className="w-3 h-3" /> Batalkan
                                        </Button>
                                    )}
                                    {detailCampaign.status !== 'IN_PROGRESS' && (
                                        <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-red-400"
                                            onClick={() => { setDeleteTarget(detailCampaign.id); setDetailOpen(false); }}>
                                            <Trash2 className="w-3 h-3" /> Hapus
                                        </Button>
                                    )}
                                </div>
                            </DialogHeader>

                            {/* Recipient list */}
                            <div className="px-6 py-3 border-b border-border shrink-0">
                                <Input value={detailSearch} onChange={e => setDetailSearch(e.target.value)}
                                    placeholder="Cari kontak atau nomor..." className="h-8 text-sm" />
                            </div>
                            <ScrollArea className="flex-1 min-h-0">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-background border-b border-border">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-semibold">Kontak</th>
                                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-semibold">Nomor</th>
                                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-semibold">Status</th>
                                            <th className="text-left px-4 py-2 text-xs text-muted-foreground font-semibold">Waktu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecipients.map((r: BlastRecipient) => {
                                            const rCfg = RECIPIENT_STATUS_CONFIG[r.status];
                                            return (
                                                <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                                                    <td className="px-4 py-2.5 text-sm text-foreground">{r.contactName ?? '—'}</td>
                                                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{r.phoneNumber}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            {rCfg?.icon}
                                                            <span className="text-xs">{rCfg?.label ?? r.status}</span>
                                                        </div>
                                                        {r.status === 'FAILED' && r.errorMessage && (
                                                            <p className="text-[10px] text-red-400 mt-0.5 max-w-[160px] truncate" title={r.errorMessage}>{r.errorMessage}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                        {r.deliveredAt ? fmtDate(r.deliveredAt) : r.sentAt ? fmtDate(r.sentAt) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredRecipients.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-8">Tidak ada hasil</p>
                                )}
                            </ScrollArea>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Campaign?</AlertDialogTitle>
                        <AlertDialogDescription>Campaign dan semua data penerima akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
