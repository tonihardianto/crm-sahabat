import { useState, useEffect, useCallback } from 'react';
import { MessageSquarePlus, Search, ChevronRight, Send, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Ticket } from '@/lib/api';

interface Contact {
    id: string;
    name: string;
    phoneNumber: string;
    waId: string | null;
    position: string | null;
    client: { id: string; name: string };
}

interface Template {
    id: string;
    name: string;
    bodyText: string;
    headerText: string | null;
    footerText: string | null;
    language: string;
    category: string;
    status: string;
}

interface NewConversationDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (ticket: Ticket) => void;
}

// Parse {{1}}, {{2}}, ... placeholders from template body
function extractVariables(body: string): string[] {
    const matches = body.match(/{{\d+}}/g) || [];
    return [...new Set(matches)].sort();
}

function resolveTemplate(body: string, vars: Record<string, string>): string {
    return body.replace(/{{\d+}}/g, (match) => vars[match] || match);
}

export function NewConversationDialog({ open, onClose, onSuccess }: NewConversationDialogProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [contactSearch, setContactSearch] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [subject, setSubject] = useState('');
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedContact(null);
            setSelectedTemplate(null);
            setVariables({});
            setSubject('');
            setContactSearch('');
            setError('');
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        fetch('/api/contacts', { credentials: 'include' })
            .then(r => r.json())
            .then(setContacts)
            .catch(() => { });
        fetch('/api/templates', { credentials: 'include' })
            .then(r => r.json())
            .then((data: Template[]) => setTemplates(data.filter(t => t.status === 'APPROVED')))
            .catch(() => { });
    }, [open]);

    const filteredContacts = contacts.filter(c => {
        const q = contactSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.client.name.toLowerCase().includes(q) ||
            c.phoneNumber.includes(q)
        );
    });

    const handleSelectContact = (c: Contact) => {
        setSelectedContact(c);
        setStep(2);
    };

    const handleSelectTemplate = useCallback((t: Template) => {
        setSelectedTemplate(t);
        // Reset variable inputs
        const vars = extractVariables(t.bodyText);
        const initVars: Record<string, string> = {};
        vars.forEach(v => { initVars[v] = ''; });
        setVariables(initVars);
    }, []);

    const handleSend = async () => {
        if (!selectedContact || !selectedTemplate) return;
        setError('');
        setSending(true);

        // Build components array for WhatsApp API
        const vars = extractVariables(selectedTemplate.bodyText);
        const parameters = vars.map(v => ({ type: 'text', text: variables[v] || '' }));
        const components = parameters.length > 0
            ? [{ type: 'body', parameters }]
            : [];

        try {
            const res = await fetch('/api/tickets/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    contactId: selectedContact.id,
                    templateName: selectedTemplate.name,
                    languageCode: selectedTemplate.language,
                    components,
                    subject: subject || `Outbound: ${selectedTemplate.name}`,
                    priority,
                    category: 'SERVICE',
                }),
            });
            if (!res.ok) {
                const e = await res.json();
                setError(e.message || 'Gagal mengirim pesan');
                return;
            }
            const { ticket } = await res.json();
            onSuccess(ticket);
            onClose();
        } catch {
            setError('Gagal terhubung ke server');
        } finally {
            setSending(false);
        }
    };

    const previewBody = selectedTemplate
        ? resolveTemplate(selectedTemplate.bodyText, variables)
        : '';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquarePlus className="w-5 h-5 text-blue-400" />
                        Mulai Percakapan Baru
                    </DialogTitle>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span className={step === 1 ? 'text-foreground font-semibold' : ''}>1. Pilih Kontak</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className={step === 2 ? 'text-foreground font-semibold' : ''}>2. Pilih Template</span>
                </div>

                {/* Step 1: Contact selection */}
                {step === 1 && (
                    <div className="flex flex-col gap-3 min-h-0 flex-1">
                        <div className="relative shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama kontak atau nama RS..."
                                value={contactSearch}
                                onChange={e => setContactSearch(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                        <ScrollArea className="flex-1 max-h-[360px]">
                            <div className="space-y-1 pr-2">
                                {filteredContacts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Kontak tidak ditemukan</p>
                                ) : filteredContacts.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleSelectContact(c)}
                                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-start gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 mt-0.5">
                                            {c.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium truncate">{c.name}</span>
                                                {c.position && (
                                                    <span className="text-[10px] text-muted-foreground shrink-0">{c.position}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                <span className="truncate">{c.client.name}</span>
                                                <span>·</span>
                                                <Phone className="w-3 h-3 shrink-0" />
                                                <span className="font-mono">{c.phoneNumber}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Step 2: Template + variables */}
                {step === 2 && selectedContact && (
                    <ScrollArea className="flex-1 max-h-[420px]">
                        <div className="space-y-4 pr-2">
                            {/* Selected contact info */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">
                                    {selectedContact.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">{selectedContact.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">{selectedContact.client.name}</span>
                                </div>
                                <button onClick={() => setStep(1)} className="text-xs text-blue-400 hover:underline shrink-0">
                                    Ganti
                                </button>
                            </div>

                            {/* Template selector */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Template *</label>
                                {templates.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic py-2">
                                        Tidak ada template APPROVED. Buat dan approve template terlebih dahulu.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {templates.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => handleSelectTemplate(t)}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${selectedTemplate?.id === t.id
                                                    ? 'border-blue-500/50 bg-blue-500/10'
                                                    : 'border-border hover:bg-accent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-medium font-mono">{t.name}</span>
                                                    <Badge variant="outline" className="text-[9px] px-1">{t.category}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{t.bodyText}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Variable inputs */}
                            {selectedTemplate && Object.keys(variables).length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Isi Variabel Template</label>
                                    {Object.keys(variables).map(v => (
                                        <div key={v} className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-mono">{v}</label>
                                            <Input
                                                placeholder={`Nilai untuk ${v}`}
                                                value={variables[v]}
                                                onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Preview */}
                            {selectedTemplate && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Preview Pesan</label>
                                    <div className="bg-muted/40 border border-border rounded-lg p-3">
                                        {selectedTemplate.headerText && (
                                            <p className="text-sm font-semibold mb-1">{selectedTemplate.headerText}</p>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{previewBody}</p>
                                        {selectedTemplate.footerText && (
                                            <p className="text-xs text-muted-foreground mt-2 italic">{selectedTemplate.footerText}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Subject + Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Subjek Tiket</label>
                                    <Input
                                        placeholder="Opsional..."
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Prioritas</label>
                                    <Select value={priority} onValueChange={v => setPriority(v as typeof priority)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                )}

                {/* Error */}
                {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2 shrink-0">{error}</p>
                )}

                <DialogFooter className="shrink-0">
                    <Button variant="ghost" onClick={onClose}>Batal</Button>
                    {step === 2 && (
                        <Button
                            onClick={handleSend}
                            disabled={!selectedContact || !selectedTemplate || sending}
                            className="gap-2"
                        >
                            {sending
                                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Mengirim...</>
                                : <><Send className="w-4 h-4" />Kirim & Buat Tiket</>
                            }
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
