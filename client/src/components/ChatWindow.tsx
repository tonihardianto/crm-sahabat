import { useState, useRef, useEffect } from 'react';
import { Send, Shield, MessageCircle, StickyNote, User2, FileText, Clock, AlertTriangle } from 'lucide-react';
import type { Ticket, Message } from '@/lib/api';
import { sendMessage as apiSendMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatWindowProps {
    ticket: Ticket | null;
    onClaimTicket: (ticketId: string) => void;
    onMessageSent: () => void;
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

export function ChatWindow({ ticket, onClaimTicket, onMessageSent }: ChatWindowProps) {
    const [inputText, setInputText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [templates, setTemplates] = useState<TemplateData[]>([]);
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
        if (!inputText.trim() || !ticket) return;
        if (!windowOpen && !isInternal) {
            alert('24-hour window sudah tertutup. Gunakan Template Message atau Internal Note.');
            return;
        }
        setSending(true);
        try {
            await apiSendMessage(ticket.id, inputText.trim(), isInternal ? 'INTERNAL' : 'OUTBOUND');
            setInputText('');
            onMessageSent();
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePickTemplate = (tpl: TemplateData) => {
        setInputText(tpl.bodyText);
        setShowTemplatePicker(false);
        setIsInternal(false);
    };

    if (!ticket) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
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
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
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
                    {windowOpen ? (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
                            <Clock className="w-3 h-3" /> {timeLeft}
                        </Badge>
                    ) : (
                        <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" /> Window Closed
                        </Badge>
                    )}
                    <Button
                        size="sm"
                        variant={ticket.claimedById ? "secondary" : "default"}
                        disabled={!!ticket.claimedById}
                        onClick={() => onClaimTicket(ticket.id)}
                        className="gap-1.5"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        {ticket.claimedBy ? `Claimed: ${ticket.claimedBy.name}` : 'Claim Ticket'}
                    </Button>
                </div>
            </div>

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
                                        <div className="max-w-[85%] px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <StickyNote className="w-3 h-3 text-amber-400" />
                                                <span className="text-[10px] font-medium text-amber-400">Internal Note{msg.sentBy ? ` — ${msg.sentBy.name}` : ''}</span>
                                            </div>
                                            <p className="text-sm text-amber-200/90 whitespace-pre-wrap">{msg.body}</p>
                                            <span className="text-[10px] text-amber-400/60 mt-1 block text-right">{formatTimestamp(msg.timestamp)}</span>
                                        </div>
                                    ) : msg.direction === 'INBOUND' ? (
                                        <div className="max-w-[70%]">
                                            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-muted border border-border">
                                                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.body}</p>
                                                <span className="text-[10px] text-muted-foreground mt-1 block text-right">{formatTimestamp(msg.timestamp)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="max-w-[70%]">
                                            <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-600 border border-blue-500/30">
                                                {msg.sentBy && (
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <User2 className="w-3 h-3 text-blue-200/70" />
                                                        <span className="text-[10px] text-blue-200/70">{msg.sentBy.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-sm text-white whitespace-pre-wrap">{msg.body}</p>
                                                <span className="text-[10px] text-blue-200/50 mt-1 block text-right">{formatTimestamp(msg.timestamp)}</span>
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
                {!windowOpen && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive">
                            24-hour window tertutup. Hanya bisa kirim <span className="font-semibold">Template Message</span> atau <span className="font-semibold">Internal Note</span>.
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                    <Button size="sm" variant={!windowOpen ? "ghost" : (!isInternal && !showTemplatePicker ? "default" : "secondary")}
                        disabled={!windowOpen} onClick={() => { setIsInternal(false); setShowTemplatePicker(false); }} className="gap-1.5 text-xs h-7">
                        <Send className="w-3 h-3" /> Kirim WA
                    </Button>
                    <Button size="sm" variant={isInternal ? "default" : "secondary"}
                        onClick={() => { setIsInternal(true); setShowTemplatePicker(false); }} className="gap-1.5 text-xs h-7 bg-amber-600 hover:bg-amber-500 data-[active=false]:bg-secondary" data-active={isInternal}>
                        <StickyNote className="w-3 h-3" /> Internal Note
                    </Button>
                    <Button size="sm" variant={showTemplatePicker ? "default" : "secondary"}
                        onClick={() => setShowTemplatePicker(!showTemplatePicker)} className="gap-1.5 text-xs h-7">
                        <FileText className="w-3 h-3" /> Templates
                    </Button>
                </div>

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

                <div className={`flex items-end gap-2 rounded-xl p-1 border transition-colors ${isInternal ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'}`}>
                    <Textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={!windowOpen && !isInternal ? 'Window tertutup — pilih Template atau Internal Note' : isInternal ? 'Write internal note...' : 'Type a message...'}
                        disabled={!windowOpen && !isInternal}
                        rows={1}
                        className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 min-h-[36px]"
                    />
                    <Button size="icon" variant={inputText.trim() && (windowOpen || isInternal) ? (isInternal ? "default" : "default") : "ghost"}
                        onClick={handleSend} disabled={!inputText.trim() || sending || (!windowOpen && !isInternal)}
                        className={`shrink-0 ${isInternal && inputText.trim() ? 'bg-amber-500 hover:bg-amber-400' : ''}`}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
