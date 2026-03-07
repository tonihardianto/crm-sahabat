import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, MessageCircle, StickyNote, User2, FileText, Clock, X, Music, Film, File, PanelRightOpen, CircleAlertIcon, Plus, ImageIcon, Smile, Download, Hand } from 'lucide-react';
import { EmojiPicker } from '@/components/EmojiPicker';
import type { Ticket, Message } from '@/lib/api';
import { sendMessage as apiSendMessage, sendMediaMessage as apiSendMedia } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';


interface ChatWindowProps {
    ticket: Ticket | null;
    onClaimTicket: (ticketId: string) => void;
    onMessageSent: () => void;
    onBack?: () => void;
    showContextPanel?: boolean;
    onToggleContextPanel?: () => void;
}

interface TemplateData {
    id: string;
    name: string;
    bodyText: string;
    category: string;
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
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
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
        <a href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-1 rounded-lg border ${borderColor} hover:opacity-80 transition-opacity ${variant === 'outbound' ? 'bg-secondary/20' : 'bg-primary/20'} mb-1 min-w-[200px] max-w-[260px]`}>
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

export function ChatWindow({ ticket, onClaimTicket, onMessageSent, onBack, showContextPanel, onToggleContextPanel }: ChatWindowProps) {
    const [inputText, setInputText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [templates, setTemplates] = useState<TemplateData[]>([]);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachPreview, setAttachPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

    const windowOpen = ticket ? is24hWindowOpen(ticket.messages) : false;
    const timeLeft = ticket ? getWindowTimeLeft(ticket.messages) : null;

    const handleSend = async () => {
        if (!ticket) return;
        if (!inputText.trim() && !attachedFile) return;
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
                await apiSendMessage(ticket.id, inputText.trim(), isInternal ? 'INTERNAL' : 'OUTBOUND');
                setInputText('');
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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
        setInputText(tpl.bodyText);
        setShowTemplatePicker(false);
        setIsInternal(false);
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {ticket.contact.name.charAt(0).toUpperCase()}
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
                    <Button
                        size="sm"
                        variant={ticket.claimedById ? "secondary" : "default"}
                        disabled={!!ticket.claimedById}
                        onClick={() => onClaimTicket(ticket.id)}
                        className="gap-1.5"
                    >
                        <Hand className="w-3 h-3" />
                        {ticket.claimedBy ? `Claimed: ${ticket.claimedBy.name}` : 'Claim Ticket'}
                    </Button>
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
            {!windowOpen ? (
                <div className='flex items-center justify-center'>
                    <div>
                        <Badge variant="outline" className='items-center text-center text-destructive/90 bg-destructive/20 mx-3 my-2 w-fit py-1'>
                            <CircleAlertIcon />
                            {/* <AlertDescription> */}
                                <p>Pesan kadaluwarsa. Hanya bisa mengirim <span className="font-semibold">Template Message</span> atau <span className="font-semibold">Internal Note</span>.</p>
                            {/* </AlertDescription> */}
                        </Badge>
                    </div>
                    
                </div>
                
            ) : (
                <div className='flex items-center justify-center w-full mt-2 -pb-1 -mb-2 bg-transparent'>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
                        <Clock className="w-3 h-3" />Time Left: {timeLeft}
                    </Badge>
                </div>
            )}     

            {/* Messages */}
            <ScrollArea className="flex-1 px-5 py-4 overflow-y-auto">
                <div className="space-y-1">
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
                                        <div className="max-w-[85%] px-2 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <StickyNote className="w-3 h-3 text-amber-400" />
                                                <span className="text-[10px] font-medium text-amber-400">Internal Note{msg.sentBy ? ` — ${msg.sentBy.name}` : ''}</span>
                                            </div>
                                            <p className="text-sm text-amber-500/90 whitespace-pre-wrap">{msg.body}</p>
                                            <span className="text-[10px] text-amber-500/60 mt-1 block text-right">{formatTimestamp(msg.timestamp)}</span>
                                        </div>
                                    ) : msg.direction === 'INBOUND' ? (
                                        <div className="max-w-[70%]">
                                            <div className="px-1 py-1 rounded-xl rounded-bl-md bg-muted border border-border">
                                                {(msg.type === 'IMAGE') && msg.mediaUrl ? (
                                                    <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                                                        <img src={msg.mediaUrl} alt="image" className="max-w-[240px] rounded-lg mb-1" />
                                                    </a>
                                                ) : (msg.type === 'AUDIO') && msg.mediaUrl ? (
                                                    <audio controls src={msg.mediaUrl} className="max-w-[240px] mb-1" />
                                                ) : (msg.type === 'VIDEO') && msg.mediaUrl ? (
                                                    <video controls src={msg.mediaUrl} className="max-w-[240px] rounded-lg mb-1" />
                                                ) : (msg.type === 'DOCUMENT') && msg.mediaUrl ? (
                                                    <DocBubble url={msg.mediaUrl} filename={msg.body || 'document'} variant="inbound" />
                                                ) : null}
                                                {msg.type === 'TEXT' && <p className="text-sm px-2 py-2 text-foreground whitespace-pre-wrap">{msg.body}</p>}
                                                {(msg.type !== 'TEXT' && msg.type !== 'DOCUMENT' && msg.body) && <p className="text-sm px-2 py-1 text-muted-foreground mt-1">{msg.body}</p>}
                                                <span className="text-[10px] text-muted-foreground mt-0 block text-right">{formatTimestamp(msg.timestamp)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="max-w-[70%]">
                                            <div className="px-1 py-1 rounded-xl rounded-br-md bubble-bg border border-blue-500/30">
                                                {msg.sentBy && (
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <User2 className="w-3 h-3 text-blue-200/70" />
                                                        <span className="text-[10px] text-blue-200/70">{msg.sentBy.name}</span>
                                                    </div>
                                                )}
                                                {(msg.type === 'IMAGE') && msg.mediaUrl ? (
                                                    <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                                                        <img src={msg.mediaUrl} alt="image" className="max-w-[240px] rounded-lg mb-1" />
                                                    </a>
                                                ) : (msg.type === 'AUDIO') && msg.mediaUrl ? (
                                                    <audio controls src={msg.mediaUrl} className="max-w-[240px] mb-1" />
                                                ) : (msg.type === 'VIDEO') && msg.mediaUrl ? (
                                                    <video controls src={msg.mediaUrl} className="max-w-[240px] rounded-lg mb-1" />
                                                ) : (msg.type === 'DOCUMENT') && msg.mediaUrl ? (
                                                    <DocBubble url={msg.mediaUrl} filename={msg.body || 'document'} variant="outbound" />
                                                ) : null}
                                                {msg.type === 'TEXT' && <p className="text-sm px-2 py-2 text-white whitespace-pre-wrap">{msg.body}</p>}
                                                {(msg.type !== 'TEXT' && msg.body && msg.type !== 'DOCUMENT') && <p className="text-sm px-2 py-1 text-white mt-1">{msg.body}</p>}
                                                <span className="text-[10px] text-blue-200/50 mt-0 block text-right">{formatTimestamp(msg.timestamp)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-5 py-3 border-t border-border bg-card/50">
                {showTemplatePicker && (
                    <div className="mb-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border">
                        {templates.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground text-center">Belum ada template.</div>
                        ) : (
                            templates.map((tpl) => (
                                <button key={tpl.id} onClick={() => handlePickTemplate(tpl)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-foreground">{tpl.name}</span>
                                        <Badge variant="outline" className="text-[10px]">{tpl.category}</Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.bodyText}</p>
                                </button>
                            ))
                        )}
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
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <Plus className="size-4" />
                                </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="start" sideOffset={12} className="w-52">
                                {windowOpen && (
                                    <>
                                        <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                                            <ImageIcon className="size-4" />
                                            <span>Kirim Gambar / Video</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
                                            <File className="size-4" />
                                            <span>Kirim Dokumen</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem onClick={() => { setShowTemplatePicker(p => !p); setIsInternal(false); }}>
                                    <FileText className="size-4" />
                                    <span>Templates</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setIsInternal(p => !p); setShowTemplatePicker(false); clearAttachment(); }}>
                                    <StickyNote className="size-4" />
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
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={attachedFile ? 'Tambah caption (opsional)...' : (!windowOpen && !isInternal ? 'Window tertutup — pilih Template atau Internal Note' : isInternal ? 'Write internal note...' : 'Type a message...')}
                        disabled={!windowOpen && !isInternal && !attachedFile}
                        rows={1}
                        className="min-h-[36px] py-2"
                    />
                    <InputGroupAddon align="inline-end" className="pr-1 relative">
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-10 right-0 z-50 w-[320px] rounded-xl border border-border bg-popover shadow-lg">
                                <EmojiPicker onSelect={handleEmojiClick} />
                            </div>
                        )}
                        <InputGroupButton
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setShowEmojiPicker(p => !p)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Emoji"
                        >
                            <Smile className="w-4 h-4" />
                        </InputGroupButton>
                        <InputGroupButton
                            size={"icon-sm"}
                            variant={((inputText.trim() || attachedFile) && (windowOpen || isInternal)) ? 'default' : 'ghost'}
                            onClick={handleSend}
                            disabled={(!inputText.trim() && !attachedFile) || sending || (!windowOpen && !isInternal && !attachedFile)}
                            className={isInternal && inputText.trim() ? 'bg-amber-500 hover:bg-amber-400 mr-2' : 'mr-2'}
                        >
                            <SendHorizonal className="w-10 h-10" />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    );
}
