import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, MessageCircle, StickyNote, User2, FileText, Clock, X, Music, Film, File, PanelRightOpen, CircleAlertIcon, Plus, ImageIcon, Smile, Download, HandGrab, ArrowLeftRight, UserCheck, Pencil, Archive, Trash2, Check, CheckCheck, CornerUpLeft, ExternalLink, Loader2 } from 'lucide-react';
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter } from '@/components/ui/emoji-picker';
import type { Ticket, Message } from '@/lib/api';
import { sendMessage as apiSendMessage, sendMediaMessage as apiSendMedia, editMessage as apiEditMessage, sendTemplateToTicket as apiSendTemplate, createClickUpTask, fetchClickUpTags, fetchQuickReplies } from '@/lib/api';
import type { QuickReply } from '@/lib/api';
import { HandoverDialog } from '@/components/HandoverDialog';
import { AssignDialog } from '@/components/AssignDialog';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppSettings } from '@/context/AppSettingsContext';


interface ChatWindowProps {
    ticket: Ticket | null;
    onClaimTicket: (ticketId: string) => void;
    onMessageSent: () => void;
    onBack?: () => void;
    showContextPanel?: boolean;
    onToggleContextPanel?: () => void;
    onArchiveTicket?: (ticketId: string) => void;
    onDeleteTicket?: (ticketId: string) => void;
    onRestoreTicket?: (ticketId: string) => void;
}

interface TemplateData {
    id: string;
    name: string;
    bodyText: string;
    category: string;
    status: string;
    language: string;
}

function formatTimestamp(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
    const groups: Record<string, Message[]> = {};
    for (const msg of messages) {
        const key = new Date(msg.timestamp).toDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(msg);
    }
    return groups;
}

function getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    return ext.length > 6 ? 'FILE' : ext;
}

function MessageTicks({ msg }: { msg: import('@/lib/api').Message }) {
    if (msg.direction !== 'OUTBOUND' || !msg.wamid) return null;
    if (msg.readAt) return <CheckCheck className="w-3.5 h-3.5 text-blue-300 shrink-0" />;
    if (msg.deliveredAt) return <CheckCheck className="w-3.5 h-3.5 text-blue-200/50 shrink-0" />;
    return <Check className="w-3.5 h-3.5 text-blue-200/50 shrink-0" />;
}

function QuotedMessage({ replyTo, variant }: { replyTo: NonNullable<Message['replyTo']>; variant: 'inbound' | 'outbound' | 'internal' }) {
    const borderColor = variant === 'outbound' ? 'border-blue-300/40' : variant === 'internal' ? 'border-amber-400/40' : 'border-border';
    const bgColor = variant === 'outbound' ? 'bg-blue-900/30' : variant === 'internal' ? 'bg-amber-800/20' : 'bg-muted/50';
    const label = replyTo.direction === 'OUTBOUND' ? (replyTo.sentBy?.name ?? 'Agent') : replyTo.direction === 'INTERNAL' ? 'Internal Note' : 'Pelanggan';
    return (
        <div className={`rounded-lg border-l-2 px-2 py-1 -ms-2.5 -mt-1 -me-2.5 ${borderColor} ${bgColor} `}>
            <p className="text-[10px] font-semibold text-blue-300/80 mb-0.5">{label}</p>
            <p className="text-xs truncate opacity-70">{replyTo.type === 'TEXT' ? replyTo.body : `[${replyTo.type}]`}</p>
        </div>
    );
}

function DocBubble({ url, filename, variant }: { url: string; filename: string; variant: 'inbound' | 'outbound' }) {
    const ext = getFileExtension(filename);
    const isPdf = ext === 'PDF';
    const isWord = ['DOC', 'DOCX'].includes(ext);
    const isExcel = ['XLS', 'XLSX'].includes(ext);

    const iconBg = isPdf ? 'bg-red-500' : isWord ? 'bg-blue-900' : isExcel ? 'bg-green-600' : 'bg-gray-500';
    const textColor = variant === 'outbound' ? 'text-white/80' : 'text-primary/80';
    const subColor = variant === 'outbound' ? 'text-blue-100/70' : 'text-muted-foreground';
    const borderColor = variant === 'outbound' ? 'border-blue-400/20' : 'border-border';

    return (
        <a href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-1 rounded-lg border ${borderColor} hover:opacity-80 transition-opacity ${variant === 'outbound' ? 'bg-secondary/20' : 'bg-primary/20'} mb-1 min-w-[200px] max-w-[320px]`}>
            <div className={`${iconBg} rounded-lg w-10 h-10 flex items-center justify-center shrink-0`}>
                <span className="text-white text-[10px] font-bold">{ext}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${textColor}`}>{filename}</p>
                <p className={`text-[10px] ${subColor}`}>{ext} Document</p>
            </div>
            <Download className={`w-4 h-4 shrink-0 ${subColor}`} />
        </a>
    );
}

function is24hWindowOpen(messages: Message[]): boolean {
    const now = Date.now();
    const cutoff = 24 * 60 * 60 * 1000;
    const lastInbound = messages
        .filter((m) => m.direction === 'INBOUND')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (!lastInbound) return false;
    return now - new Date(lastInbound.timestamp).getTime() < cutoff;
}

function getWindowTimeLeft(messages: Message[]): string | null {
    const lastInbound = messages
        .filter((m) => m.direction === 'INBOUND')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (!lastInbound) return null;
    const diff = 24 * 60 * 60 * 1000 - (Date.now() - new Date(lastInbound.timestamp).getTime());
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
}

export function ChatWindow({ ticket, onClaimTicket, onMessageSent, onBack, showContextPanel, onToggleContextPanel, onArchiveTicket, onDeleteTicket, onRestoreTicket }: ChatWindowProps) {
    const [inputText, setInputText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [templates, setTemplates] = useState<TemplateData[]>([]);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachPreview, setAttachPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showHandover, setShowHandover] = useState(false);
    const [showAssign, setShowAssign] = useState(false);
    const [editingMsg, setEditingMsg] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [templateDialog, setTemplateDialog] = useState<{ tpl: TemplateData; vars: Record<number, string> } | null>(null);
    const [sendingTemplate, setSendingTemplate] = useState(false);
    const [clickupDialogMsg, setClickupDialogMsg] = useState<Message | null>(null);
    const [clickupDesc, setClickupDesc] = useState('');
    const [clickupPriority, setClickupPriority] = useState<number | undefined>(undefined);
    const [clickupSelectedTags, setClickupSelectedTags] = useState<string[]>([]);
    const [clickupAvailableTags, setClickupAvailableTags] = useState<{ name: string; tag_fg: string; tag_bg: string }[]>([]);
    const [clickupTagsLoading, setClickupTagsLoading] = useState(false);
    const [clickupTagSearch, setClickupTagSearch] = useState('');
    const [clickupSubmitting, setClickupSubmitting] = useState(false);
    const [clickupResult, setClickupResult] = useState<{ success: boolean; message: string } | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [qrActiveIndex, setQrActiveIndex] = useState(0);
    const { user } = useAuth();
    const { chatBg, outboundBubbleColor, inboundBubbleColor } = useAppSettings();
    const isAdmin = user?.role === 'ADMIN';
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]);

    useEffect(() => {
        fetch('/api/templates')
            .then((r) => r.json())
            .then(setTemplates)
            .catch(console.error);
    }, []);

    useEffect(() => {
        fetchQuickReplies().then(setQuickReplies).catch(console.error);
    }, []);

    const qrSearch = (inputText.startsWith('/') && !editingMsg) ? inputText.slice(1).toLowerCase() : null;
    const filteredQR = qrSearch !== null
        ? quickReplies.filter(qr => qr.shortcut.startsWith(qrSearch) || qr.title.toLowerCase().includes(qrSearch))
        : [];
    const showQRPopup = qrSearch !== null && filteredQR.length > 0;

    const applyQR = (qr: QuickReply) => {
        setInputText(qr.body);
        setQrActiveIndex(0);
    };

    const windowOpen = ticket ? is24hWindowOpen(ticket.messages) : false;
    const timeLeft = ticket ? getWindowTimeLeft(ticket.messages) : null;

    const handleSend = async () => {
        if (!ticket) return;
        if (!inputText.trim() && !attachedFile) return;

        // --- Edit mode ---
        if (editingMsg) {
            if (!inputText.trim()) return;
            setSending(true);
            try {
                await apiEditMessage(ticket.id, editingMsg.id, inputText.trim());
                setInputText('');
                setEditingMsg(null);
                onMessageSent();
            } catch (err) {
                console.error('Failed to edit message:', err);
            } finally {
                setSending(false);
            }
            return;
        }

        if (!windowOpen && !isInternal) {
            alert('24-hour window sudah tertutup. Gunakan Template Message atau Internal Note.');
            return;
        }
        setSending(true);
        try {
            if (attachedFile) {
                await apiSendMedia(ticket.id, attachedFile, inputText.trim());
                setAttachedFile(null);
                setAttachPreview(null);
                setInputText('');
            } else {
                await apiSendMessage(ticket.id, inputText.trim(), isInternal ? 'INTERNAL' : 'OUTBOUND', undefined, replyingTo?.id);
                setInputText('');
                setReplyingTo(null);
            }
            onMessageSent();
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAttachedFile(file);
        setIsInternal(false);
        setShowTemplatePicker(false);
        if (file.type.startsWith('image/')) {
            setAttachPreview(URL.createObjectURL(file));
        } else {
            setAttachPreview(null);
        }
        e.target.value = '';
    };

    const clearAttachment = () => {
        setAttachedFile(null);
        setAttachPreview(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showQRPopup) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setQrActiveIndex(i => Math.min(i + 1, filteredQR.length - 1)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setQrActiveIndex(i => Math.max(i - 1, 0)); return; }
            if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); applyQR(filteredQR[qrActiveIndex]); return; }
            if (e.key === 'Escape') { setInputText(''); return; }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        if (e.key === 'Escape' && editingMsg) {
            setEditingMsg(null);
            setInputText('');
        }
        if (e.key === 'Escape' && replyingTo) {
            setReplyingTo(null);
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setInputText(prev => prev + emoji);
    };

    // Close emoji picker on outside click
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handler = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showEmojiPicker]);

    const handlePickTemplate = (tpl: TemplateData) => {
        setShowTemplatePicker(false);
        if (windowOpen) {
            // Window open: paste bodyText to input as usual
            setInputText(tpl.bodyText);
            setIsInternal(false);
        } else {
            // Window closed: open variable-fill dialog to send via WA
            const indices = Array.from(tpl.bodyText.matchAll(/\{\{(\d+)\}\}/g)).map(m => parseInt(m[1]));
            const unique = [...new Set(indices)].sort((a, b) => a - b);
            const vars: Record<number, string> = {};
            unique.forEach(i => { vars[i] = ''; });
            setTemplateDialog({ tpl, vars });
        }
    };

    const [templateError, setTemplateError] = useState<string | null>(null);

    const handleSendTemplate = async () => {
        if (!ticket || !templateDialog) return;
        setSendingTemplate(true);
        setTemplateError(null);
        try {
            const { tpl, vars } = templateDialog;
            let resolvedBody = tpl.bodyText;
            const paramEntries = Object.entries(vars).sort(([a], [b]) => parseInt(a) - parseInt(b));
            paramEntries.forEach(([idx, val]) => {
                resolvedBody = resolvedBody.replace(new RegExp(`\\{\\{${idx}\\}\\}`, 'g'), val || `{{${idx}}}`);
            });
            const components: unknown[] = paramEntries.length > 0
                ? [{ type: 'body', parameters: paramEntries.map(([, val]) => ({ type: 'text', text: val })) }]
                : [];
            await apiSendTemplate(ticket.id, tpl.name, tpl.language || 'id', components, resolvedBody);
            setTemplateDialog(null);
            setTemplateError(null);
            onMessageSent();
        } catch (err) {
            console.error('Failed to send template:', err);
            setTemplateError(err instanceof Error ? err.message : 'Gagal mengirim template');
        } finally {
            setSendingTemplate(false);
        }
    };

    if (!ticket) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-1">No Ticket Selected</h3>
                    <p className="text-sm text-muted-foreground">Select a ticket from the list to start chatting</p>
                </div>
            </div>
        );
    }

    const dateGroups = groupMessagesByDate(ticket.messages);

    return (
        <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 md:px-5 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {ticket.contact.name.charAt(0).toUpperCase()}{ticket.contact.name.charAt(1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                            {ticket.contact.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                            {ticket.contact.client.name} · {ticket.ticketNumber}
                        </p>

                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* {windowOpen ? (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
                            <Clock className="w-3 h-3" /> {timeLeft}
                        </Badge>
                    ) : (
                        <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" /> Window Closed
                        </Badge>
                    )} */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5">
                                <HandGrab className="w-3 h-3" />
                                {ticket.claimedBy
                                    ? ticket.claimedBy.name
                                    : ticket.assignedAgent
                                        ? ticket.assignedAgent.name
                                        : 'Action'}
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            {/* Claim */}
                            <DropdownMenuItem
                                disabled={!!ticket.claimedById}
                                onClick={() => !ticket.claimedById && onClaimTicket(ticket.id)}
                                className={ticket.claimedById ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                <HandGrab className="w-4 h-4 mr-2" />
                                {ticket.claimedBy ? `Claimed: ${ticket.claimedBy.name}` : 'Claim Ticket'}
                            </DropdownMenuItem>

                            {/* Handover — hanya jika sudah di-claim */}
                            {ticket.claimedById && (
                                <DropdownMenuItem onClick={() => setShowHandover(true)}>
                                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                                    Handover Tiket
                                </DropdownMenuItem>
                            )}

                            {/* Assign To — hanya admin */}
                            {isAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowAssign(true)}>
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        {ticket.assignedAgent ? `Re-assign (${ticket.assignedAgent.name})` : 'Assign To'}
                                    </DropdownMenuItem>
                                </>
                            )}

                            {/* Archive / Delete / Restore */}
                            {(onRestoreTicket || onArchiveTicket || (isAdmin && onDeleteTicket)) && (
                                <>
                                    <DropdownMenuSeparator />
                                    {onRestoreTicket && (
                                        <DropdownMenuItem onClick={() => onRestoreTicket(ticket.id)}>
                                            <Archive className="w-4 h-4 mr-2" />
                                            Restore Tiket
                                        </DropdownMenuItem>
                                    )}
                                    {onArchiveTicket && (
                                        <DropdownMenuItem onClick={() => onArchiveTicket(ticket.id)}>
                                            <Archive className="w-4 h-4 mr-2" />
                                            Archive Tiket
                                        </DropdownMenuItem>
                                    )}
                                    {isAdmin && onDeleteTicket && (
                                        <DropdownMenuItem
                                            onClick={() => onDeleteTicket(ticket.id)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Hapus Permanen
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {onToggleContextPanel && !showContextPanel && (
                        <button
                            onClick={onToggleContextPanel}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="Tampilkan panel"
                        >
                            <PanelRightOpen className="w-6 h-6 text-primary" />
                        </button>
                    )}
                </div>

            </div>

            {/* ClickUp status bar */}
            {ticket.clickupTaskId && (
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-blue-500/5 shrink-0">
                    <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="text-xs text-blue-300/80">ClickUp:</span>
                    <span className="text-xs font-medium text-blue-300 uppercase">{ticket.clickupStatus ?? 'BACKLOG'}</span>
                    <span className="flex-1" />
                    {ticket.clickupTaskUrl && (
                        <a
                            href={ticket.clickupTaskUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Open in ClickUp <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    )}
                </div>
            )}

            {/* Messages — relative wrapper so the floating badge can overlay */}
            <div className="flex-1 relative min-h-0">
                {/* Floating badge */}
                {windowOpen ? (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1 shadow-sm backdrop-blur-sm">
                            <Clock className="w-3 h-3" />Time Left: {timeLeft}
                        </Badge>
                    </div>
                ) : (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-max max-w-[90%]">
                        <Badge variant="outline" className="items-center text-center text-destructive/90 bg-destructive/20 py-1 gap-1 shadow-sm backdrop-blur-sm">
                            <CircleAlertIcon className="w-3 h-3 shrink-0" />
                            <p>Pesan kadaluwarsa. Hanya bisa mengirim <span className="font-semibold">Template Message</span> atau <span className="font-semibold">Internal Note</span>.</p>
                        </Badge>
                    </div>
                )}

                <ScrollArea className="h-full px-5 py-0 overflow-y-auto" style={chatBg ? { backgroundColor: chatBg } : undefined}>
                    <div className="space-y-1 pt-7">
                        {Object.entries(dateGroups).map(([dateKey, msgs]) => (
                            <div key={dateKey}>
                                <div className="flex items-center justify-center my-4">
                                    <span className="px-3 py-1 text-[11px] font-medium text-muted-foreground bg-muted rounded-full">
                                        {formatDate(msgs[0].timestamp)}
                                    </span>
                                </div>
                                {msgs.map((msg) => (
                                    <div key={msg.id} className={`flex mb-2 ${msg.direction === 'INBOUND' ? 'justify-start' : msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-center'}`}>
                                        {msg.direction === 'INTERNAL' ? (
                                            <div className="group relative max-w-[85%] px-2 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <StickyNote className="w-3 h-3 text-amber-400" />
                                                    <span className="text-[10px] font-medium text-amber-400">Internal Note{msg.sentBy ? ` — ${msg.sentBy.name}` : ''}</span>
                                                </div>
                                                {msg.replyTo && <QuotedMessage replyTo={msg.replyTo} variant="internal" />}
                                                <p className="text-sm text-amber-500/90 whitespace-pre-wrap">{msg.body}</p>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    {msg.isEdited && <span className="text-[10px] text-amber-500/50 italic">diedit</span>}
                                                    <span className="text-[10px] text-amber-500/60">{formatTimestamp(msg.timestamp)}</span>
                                                </div>
                                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    {!msg.isSystemNote && msg.type === 'TEXT' && (
                                                        <button
                                                            onClick={() => { setEditingMsg(msg); setInputText(msg.body); setReplyingTo(null); }}
                                                            className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center hover:bg-amber-500/40"
                                                            title="Edit pesan"
                                                        >
                                                            <Pencil className="w-3 h-3 text-amber-400" />
                                                        </button>
                                                    )}
                                                    {!msg.isSystemNote && msg.type === 'TEXT' && (
                                                        <button
                                                            onClick={() => {
                                                                setClickupDialogMsg(msg);
                                                                setClickupDesc('');
                                                                setClickupPriority(undefined);
                                                                setClickupSelectedTags([]);
                                                                setClickupTagSearch('');
                                                                setClickupResult(null);
                                                                setClickupTagsLoading(true);
                                                                fetchClickUpTags()
                                                                    .then(setClickupAvailableTags)
                                                                    .finally(() => setClickupTagsLoading(false));
                                                            }}
                                                            className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center hover:bg-blue-500/40"
                                                            title="Kirim ke ClickUp"
                                                        >
                                                            <ExternalLink className="w-3 h-3 text-blue-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : msg.direction === 'INBOUND' ? (
                                            <div className="max-w-[70%] group relative">
                                                <div className="px-1 py-1 rounded-xl rounded-bl-md bg-muted border border-border" style={inboundBubbleColor ? { backgroundColor: inboundBubbleColor } : undefined}>
                                                    {msg.replyTo && <div className="px-2 pt-1"><QuotedMessage replyTo={msg.replyTo} variant="inbound" /></div>}
                                                    {(msg.type === 'IMAGE') && msg.mediaUrl ? (
                                                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                                                            <img src={msg.mediaUrl} alt="image" className="max-w-[440px] max-h-[240px] rounded-lg mb-1" />
                                                        </a>
                                                    ) : (msg.type === 'AUDIO') && msg.mediaUrl ? (
                                                        <audio controls src={msg.mediaUrl} className="max-w-[240px] mb-1" />
                                                    ) : (msg.type === 'VIDEO') && msg.mediaUrl ? (
                                                        <video controls src={msg.mediaUrl} className="max-w-[240px] rounded-lg mb-1" />
                                                    ) : (msg.type === 'DOCUMENT') && msg.mediaUrl ? (
                                                        <DocBubble url={msg.mediaUrl} filename={msg.filename || 'document'} variant="inbound" />
                                                    ) : null}
                                                    {msg.type === 'TEXT' && <p className="text-sm px-1 py-1 text-foreground whitespace-pre-wrap">{msg.body}</p>}
                                                    {(msg.type === 'DOCUMENT' && msg.body) && <p className="text-sm px-1 py-1 text-muted-foreground">{msg.body}</p>}
                                                    {(msg.type !== 'TEXT' && msg.type !== 'DOCUMENT' && msg.body) && <p className="text-sm px-2 py-1 text-muted-foreground mt-1">{msg.body}</p>}
                                                    <span className="text-[10px] text-muted-foreground mt-0 block text-right">{formatTimestamp(msg.timestamp)}</span>
                                                </div>
                                                <button
                                                    onClick={() => { setReplyingTo(msg); setEditingMsg(null); }}
                                                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent cursor-pointer"
                                                    title="Balas pesan"
                                                >
                                                    <CornerUpLeft className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                            </div>
                                        ) : (msg.direction === 'OUTBOUND') ? (
                                            <div className="group relative max-w-[70%]">
                                                <div className="px-1 py-1 rounded-xl rounded-br-md bubble-bg border border-blue-500/30" style={outboundBubbleColor ? { backgroundColor: outboundBubbleColor } : undefined}>
                                                    {msg.sentBy && (
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <User2 className="w-3 h-3 text-blue-200/70" />
                                                            <span className="text-[10px] text-blue-200/70">{msg.sentBy.name}</span>
                                                        </div>
                                                    )}
                                                    {msg.replyTo && <div className="px-2 pt-1"><QuotedMessage replyTo={msg.replyTo} variant="outbound" /></div>}
                                                    {(msg.type === 'IMAGE') && msg.mediaUrl ? (
                                                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                                                            <img src={msg.mediaUrl} alt="image" className="max-w-[240px] rounded-lg mb-1" />
                                                        </a>
                                                    ) : (msg.type === 'AUDIO') && msg.mediaUrl ? (
                                                        <audio controls src={msg.mediaUrl} className="max-w-[240px] mb-1" />
                                                    ) : (msg.type === 'VIDEO') && msg.mediaUrl ? (
                                                        <video controls src={msg.mediaUrl} className="max-w-[240px] rounded-lg mb-1" />
                                                    ) : (msg.type === 'DOCUMENT') && msg.mediaUrl ? (
                                                        <DocBubble url={msg.mediaUrl} filename={msg.filename || 'document'} variant="outbound" />
                                                    ) : null}
                                                    {msg.type === 'TEXT' && <p className="text-sm px-1 py-1 text-white whitespace-pre-wrap">{msg.body}</p>}
                                                    {(msg.type === 'DOCUMENT' && msg.body) && <p className="text-sm px-1 py-1 text-white/80">{msg.body}</p>}
                                                    {(msg.type !== 'TEXT' && msg.body && msg.type !== 'DOCUMENT') && <p className="text-sm px-2 py-1 text-white mt-1">{msg.body}</p>}
                                                    <div className="flex items-center justify-end gap-1">
                                                        {msg.isEdited && <span className="text-[10px] text-blue-200/40 italic">diedit</span>}
                                                        <span className="text-[10px] text-blue-200/50 mt-0">{formatTimestamp(msg.timestamp)}</span>
                                                        <MessageTicks msg={msg} />
                                                    </div>
                                                </div>
                                                <div className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <button
                                                        onClick={() => { setReplyingTo(msg); setEditingMsg(null); }}
                                                        className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center hover:bg-blue-500/40 cursor-pointer"
                                                        title="Balas pesan"
                                                    >
                                                        <CornerUpLeft className="w-3 h-3 text-blue-300" />
                                                    </button>
                                                    {/* {msg.type === 'TEXT' && (
                                                    <button
                                                        onClick={() => { setEditingMsg(msg); setInputText(msg.body); setReplyingTo(null); }}
                                                        className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center hover:bg-blue-500/40"
                                                        title="Edit pesan"
                                                    >
                                                        <Pencil className="w-3 h-3 text-blue-300" />
                                                    </button>
                                                )} */}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="px-5 py-3 border-none border-border bg-background relative overflow-visible">
                {/* Edit mode indicator */}
                {editingMsg && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <Pencil className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-xs text-primary font-medium flex-1 truncate">Mengedit pesan: {editingMsg.body}</span>
                        <button onClick={() => { setEditingMsg(null); setInputText(''); }} className="p-0.5 rounded hover:bg-primary/20">
                            <X className="w-3.5 h-3.5 text-primary" />
                        </button>
                    </div>
                )}
                {/* Reply preview strip */}
                {replyingTo && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <CornerUpLeft className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="text-xs text-blue-400 font-medium shrink-0">Membalas:</span>
                        <span className="text-xs text-muted-foreground flex-1 truncate">{replyingTo.body}</span>
                        <button onClick={() => setReplyingTo(null)} className="p-0.5 rounded hover:bg-blue-500/20">
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    </div>
                )}
                {showTemplatePicker && (
                    <div className="mb-2 rounded-xl border border-border bg-card divide-y divide-border">
                        <div className="flex items-center justify-between px-4 py-2 shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">Pilih Template</span>
                            <button onClick={() => setShowTemplatePicker(false)} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-border">
                        {templates.filter(t => windowOpen || t.status === 'APPROVED').length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                                {windowOpen ? 'Belum ada template.' : 'Tidak ada template APPROVED. Sync atau buat template baru.'}
                            </div>
                        ) : (
                            templates.filter(t => windowOpen || t.status === 'APPROVED').map((tpl) => (
                                <button key={tpl.id} onClick={() => handlePickTemplate(tpl)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{tpl.name}</span>
                                        <Badge variant="outline" className="text-[10px]">{tpl.category}</Badge>
                                        {!windowOpen && <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">WA Send</Badge>}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.bodyText}</p>
                                </button>
                            ))
                        )}
                        </div>
                    </div>
                )}

                {/* File Preview */}
                {attachedFile && (
                    <div className="mb-2 flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-muted/50">
                        {attachPreview ? (
                            <img src={attachPreview} alt="preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        ) : attachedFile.type.startsWith('audio/') ? (
                            <Music className="w-8 h-8 text-blue-400 shrink-0" />
                        ) : attachedFile.type.startsWith('video/') ? (
                            <Film className="w-8 h-8 text-purple-400 shrink-0" />
                        ) : (
                            <File className="w-8 h-8 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{attachedFile.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(attachedFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={clearAttachment} className="p-1 rounded-md hover:bg-accent">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                )}

                <InputGroup className={`rounded-xl ${isInternal ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                {/* Quick Reply Popup */}
                {showQRPopup && (
                    <div className="absolute bottom-full left-0 right-0 z-40 mb-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="text-yellow-400"><path d="M9.5 1L3 9h5l-1.5 6L14 7H9L9.5 1z"/></svg>
                            <span className="text-[11px] text-muted-foreground font-medium">Quick Replies</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">↑↓ navigate · Tab / Enter to insert · Esc dismiss</span>
                        </div>
                        {filteredQR.slice(0, 6).map((qr, idx) => (
                            <button
                                key={qr.id}
                                onMouseDown={(e) => { e.preventDefault(); applyQR(qr); }}
                                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 transition-colors ${
                                    idx === qrActiveIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                                }`}
                            >
                                <span className="shrink-0 text-[11px] font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md mt-0.5">/{qr.shortcut}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">{qr.title}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{qr.body}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                    <InputGroupAddon className="pl-1">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*,video/*,audio/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <input
                            ref={docInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild className='ms-2'>
                                <InputGroupButton
                                    size="icon-sm"
                                    variant="ghost"
                                    className="text-muted-foreground hover:bg-primary/10 cursor-pointer"
                                >
                                    <Plus className="size-4" />
                                </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="start" sideOffset={12} className="w-42 bg-card">
                                {windowOpen && (
                                    <>
                                        <DropdownMenuItem className='text-xs cursor-pointer' onClick={() => imageInputRef.current?.click()}>
                                            <ImageIcon className="size-3.5 text-blue-400" />
                                            <span>Gambar / Video</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className='text-xs cursor-pointer' onClick={() => docInputRef.current?.click()}>
                                            <File className="size-3.5 text-emerald-400" />
                                            <span>Dokumen</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem className='text-xs cursor-pointer' onClick={() => { setShowTemplatePicker(p => !p); setIsInternal(false); }}>
                                    <FileText className="size-3.5 text-violet-400" />
                                    <span>Templates</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className='text-xs cursor-pointer' onClick={() => { setIsInternal(p => !p); setShowTemplatePicker(false); clearAttachment(); }}>
                                    <StickyNote className="size-3.5 text-amber-400" />
                                    <span>{isInternal ? 'Batalkan Internal Note' : 'Internal Note'}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {isInternal && (
                            <span className="text-[10px] font-semibold text-amber-400 pr-1">Note</span>
                        )}
                    </InputGroupAddon>
                    <InputGroupTextarea
                        value={inputText}
                        onChange={(e) => { setInputText(e.target.value); setQrActiveIndex(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder={attachedFile ? 'Tambah caption (opsional)...' : (!windowOpen && !isInternal ? 'Window tertutup — pilih Template atau Internal Note' : isInternal ? 'Write internal note...' : 'Type a message...')}
                        disabled={!windowOpen && !isInternal && !attachedFile}
                        rows={1}
                        className="min-h-[36px] py-2"
                    />
                    <InputGroupAddon align="inline-end" className="pr-1 relative">
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-10 right-0 z-50 rounded-xl border border-border shadow-lg overflow-hidden">
                                <EmojiPicker className="h-[340px] w-[266px]" onEmojiSelect={({ emoji }) => { handleEmojiClick(emoji); setShowEmojiPicker(false); }}>
                                    <EmojiPickerSearch />
                                    <EmojiPickerContent className='cursor-pointer' />
                                    <EmojiPickerFooter />
                                </EmojiPicker>
                            </div>
                        )}
                        <InputGroupButton
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setShowEmojiPicker(p => !p)}
                            className="text-muted-foreground hover:bg-primary/10 cursor-pointer"
                            title="Emoji"
                        >
                            <Smile className="w-4 h-4" />
                        </InputGroupButton>
                        <InputGroupButton
                            size={"icon-sm"}
                            variant={((inputText.trim() || attachedFile) && (windowOpen || isInternal)) ? 'default' : 'ghost'}
                            onClick={handleSend}
                            disabled={(!inputText.trim() && !attachedFile) || sending || (!windowOpen && !isInternal && !attachedFile)}
                            className={isInternal && inputText.trim() ? 'bg-amber-500 hover:bg-amber-400 mr-2 cursor-pointer' : 'mr-2 cursor-pointer'}
                        >
                            <SendHorizonal className="w-10 h-10" />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </div>

            {/* Template Send Dialog */}
            {templateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Kirim Template via WhatsApp</h3>
                            <button onClick={() => setTemplateDialog(null)} className="p-1 rounded hover:bg-accent">
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="mb-3 px-3 py-2 rounded-xl bg-muted/50 border border-border">
                            <p className="text-[10px] font-semibold text-violet-400 mb-1">{templateDialog.tpl.name} · {templateDialog.tpl.category}</p>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {Object.entries(templateDialog.vars).reduce((text, [idx, val]) =>
                                    text.replace(new RegExp(`\\{\\{${idx}\\}\\}`, 'g'), val
                                        ? <span className="text-foreground font-medium">{val}</span> as unknown as string
                                        : `{{${idx}}}`
                                    ), templateDialog.tpl.bodyText)}
                            </p>
                        </div>
                        {/* Preview with highlighting */}
                        <div className="mb-3 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-[10px] text-blue-300/70 mb-1">Preview pesan:</p>
                            <p className="text-xs text-foreground whitespace-pre-wrap">
                                {Object.entries(templateDialog.vars).reduce(
                                    (text, [idx, val]) => text.replace(new RegExp(`\\{\\{${idx}\\}\\}`, 'g'), val || `[var ${idx}]`),
                                    templateDialog.tpl.bodyText
                                )}
                            </p>
                        </div>
                        {Object.keys(templateDialog.vars).length > 0 && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs font-medium text-muted-foreground">Isi variabel:</p>
                                {Object.keys(templateDialog.vars).sort((a, b) => parseInt(a) - parseInt(b)).map(idxStr => {
                                    const idx = parseInt(idxStr);
                                    return (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground shrink-0 w-14">{`{{${idx}}}`}</span>
                                            <input
                                                className="flex-1 h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                                placeholder={`Nilai untuk {{${idx}}}`}
                                                value={templateDialog.vars[idx]}
                                                onChange={(e) => setTemplateDialog(prev => prev ? {
                                                    ...prev,
                                                    vars: { ...prev.vars, [idx]: e.target.value }
                                                } : null)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {templateError && (
                            <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                                {templateError}
                            </div>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setTemplateDialog(null); setTemplateError(null); }} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
                                Batal
                            </button>
                            <button
                                onClick={handleSendTemplate}
                                disabled={sendingTemplate}
                                className="px-4 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50"
                            >
                                {sendingTemplate ? 'Mengirim...' : 'Kirim via WhatsApp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Handover Dialog */}
            {showHandover && (
                <HandoverDialog
                    ticket={ticket}
                    open={showHandover}
                    onClose={() => setShowHandover(false)}
                    onSuccess={(updated) => {
                        onMessageSent();
                        setShowHandover(false);
                        // Propagate the updated ticket back so caller can refresh state
                        void updated;
                    }}
                />
            )}

            {/* Assign Dialog */}
            {showAssign && (
                <AssignDialog
                    ticket={ticket}
                    open={showAssign}
                    onClose={() => setShowAssign(false)}
                    onSuccess={(updated) => {
                        onMessageSent();
                        setShowAssign(false);
                        void updated;
                    }}
                />
            )}

            {/* ClickUp Task Dialog */}
            {clickupDialogMsg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ExternalLink className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-semibold text-foreground">Buat Task ClickUp</h3>
                            </div>
                            <button onClick={() => { setClickupDialogMsg(null); setClickupResult(null); }} className="p-1 rounded hover:bg-accent">
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Task title preview */}
                        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[10px] font-semibold text-amber-400 mb-1">Judul Task (dari internal note)</p>
                            <p className="text-xs text-amber-500/90 line-clamp-3">{clickupDialogMsg.body}</p>
                        </div>

                        {/* Description */}
                        <div className="mb-3 space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Deskripsi (opsional)</label>
                            <textarea
                                value={clickupDesc}
                                onChange={(e) => setClickupDesc(e.target.value)}
                                placeholder="Tambahkan detail tambahan untuk task ini..."
                                rows={3}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                        </div>

                        {/* Priority + Tags */}
                        <div className="mb-4 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                                <select
                                    value={clickupPriority ?? ''}
                                    onChange={(e) => setClickupPriority(e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="">— Normal —</option>
                                    <option value="1">Urgent</option>
                                    <option value="2">High</option>
                                    <option value="3">Normal</option>
                                    <option value="4">Low</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                                {clickupTagsLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Memuat tags...
                                    </div>
                                ) : clickupAvailableTags.length > 0 ? (
                                    <div className="space-y-2">
                                        {/* Search input */}
                                        <input
                                            type="text"
                                            value={clickupTagSearch}
                                            onChange={(e) => setClickupTagSearch(e.target.value)}
                                            placeholder="Cari tag..."
                                            className="w-full h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                        {/* Selected tags */}
                                        {clickupSelectedTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-muted/30 border border-border">
                                                {clickupSelectedTags.map((name) => {
                                                    const tag = clickupAvailableTags.find(t => t.name === name);
                                                    return (
                                                        <button
                                                            key={name}
                                                            type="button"
                                                            onClick={() => setClickupSelectedTags(prev => prev.filter(t => t !== name))}
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ring-1 ring-white/20"
                                                            style={{
                                                                backgroundColor: (tag?.tag_bg ?? '#888') + '44',
                                                                borderColor: (tag?.tag_bg ?? '#888') + '99',
                                                                color: tag?.tag_fg ?? '#fff',
                                                            }}
                                                        >
                                                            {name}
                                                            <X className="w-2.5 h-2.5 opacity-70" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {/* Filtered available tags */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {clickupAvailableTags
                                                .filter(tag =>
                                                    !clickupSelectedTags.includes(tag.name) &&
                                                    tag.name.toLowerCase().includes(clickupTagSearch.toLowerCase())
                                                )
                                                .map((tag) => (
                                                    <button
                                                        key={tag.name}
                                                        type="button"
                                                        onClick={() => {
                                                            setClickupSelectedTags(prev => [...prev, tag.name]);
                                                            setClickupTagSearch('');
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all opacity-60 hover:opacity-100"
                                                        style={{
                                                            backgroundColor: tag.tag_bg + '33',
                                                            borderColor: tag.tag_bg + '88',
                                                            color: tag.tag_fg,
                                                        }}
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground">Belum ada tags di space ClickUp Anda.</p>
                                )}
                            </div>
                        </div>

                        {/* Result feedback */}
                        {clickupResult && (
                            <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${clickupResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                                {clickupResult.message}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => { setClickupDialogMsg(null); setClickupResult(null); }}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                            >
                                {clickupResult?.success ? 'Tutup' : 'Batal'}
                            </button>
                            {!clickupResult?.success && (
                                <button
                                    onClick={async () => {
                                        if (!clickupDialogMsg) return;
                                        setClickupSubmitting(true);
                                        try {
                                            const tags = clickupSelectedTags.length > 0 ? clickupSelectedTags : undefined;
                                            await createClickUpTask(clickupDialogMsg.id, clickupDesc, clickupPriority, tags);
                                            setClickupResult({ success: true, message: 'Task berhasil dibuat di ClickUp!' });
                                            onMessageSent();
                                        } catch (err) {
                                            setClickupResult({ success: false, message: err instanceof Error ? err.message : 'Gagal membuat task' });
                                        } finally {
                                            setClickupSubmitting(false);
                                        }
                                    }}
                                    disabled={clickupSubmitting}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    {clickupSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                    {clickupSubmitting ? 'Membuat...' : 'Buat Task'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
