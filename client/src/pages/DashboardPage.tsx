import { useState, useEffect, useCallback } from 'react';
import { Building2, Users, Ticket as TicketIcon, CheckCircle2, AlertTriangle, UserCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSocket } from '@/hooks/useSocket';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
    totalActive: number;
    totalResolved: number;
    unassigned: number;
    totalClients: number;
    totalContacts: number;
    totalAgents: number;
    status: Record<string, number>;
    category: Record<string, number>;
    priority: Record<string, number>;
    recentTickets: RecentTicket[];
}

interface RecentTicket {
    id: string;
    ticketNumber: string;
    status: string;
    priority: string;
    category: string;
    createdAt: string;
    contact: { name: string; client: { name: string } };
    claimedBy: { name: string } | null;
    assignedAgent: { name: string } | null;
    _count: { messages: number };
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    NEW: "default",
    OPEN: "secondary",
    PENDING: "outline",
    RESOLVED: "secondary",
};

const priorityVariant: Record<string, "default" | "destructive"> = {
    URGENT: "destructive",
    HIGH: "destructive",
};

export function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const navigate = useNavigate();

    const loadStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats');
            setStats(await res.json());
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    }, []);

    useSocket({
        onNewMessage: loadStats,
        onNewTicket: loadStats,
    });

    useEffect(() => { loadStats(); }, [loadStats]);

    const summaryCards = [
        {
            label: 'Total Clients',
            value: stats?.totalClients ?? '—',
            icon: Building2,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
            desc: 'Rumah Sakit terdaftar',
        },
        {
            label: 'Total Contacts',
            value: stats?.totalContacts ?? '—',
            icon: Users,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            desc: 'Kontak personil RS',
        },
        {
            label: 'Active Tickets',
            value: stats?.totalActive ?? '—',
            icon: TicketIcon,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
            desc: 'Tiket belum selesai',
        },
        {
            label: 'Resolved',
            value: stats?.totalResolved ?? '—',
            icon: CheckCircle2,
            color: 'text-teal-400',
            bg: 'bg-teal-500/10 border-teal-500/20',
            desc: 'Tiket selesai',
        },
        {
            label: 'Unclaimed',
            value: stats?.unassigned ?? '—',
            icon: UserCheck,
            color: 'text-red-400',
            bg: 'bg-red-500/10 border-red-500/20',
            desc: 'Menunggu agen',
        },
        {
            label: 'Active Agents',
            value: stats?.totalAgents ?? '—',
            icon: AlertTriangle,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
            desc: 'Agen CRM terdaftar',
        },
    ];

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background">
            {/* Header */}
            <div className="px-4 md:px-8 py-4 md:py-6 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
                <h3 className="text-xl font-bold text-foreground">Dashboard</h3>
                {/* <p className="text-sm text-muted-foreground mt-0.5">Ringkasan performa sistem CRM</p> */}
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="px-4 md:px-8 py-4 md:py-6 space-y-6 md:space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {summaryCards.map((card) => (
                            <Card key={card.label} className={`border ${card.bg}`}>
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                                            <card.icon className={`w-4 h-4 ${card.color}`} />
                                        </div>
                                    </div>
                                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                                    <p className="text-xs font-medium text-foreground/80 mt-0.5">{card.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{card.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Ticket Status Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Breakdown Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {['NEW', 'OPEN', 'PENDING'].map((s) => {
                                        const count = stats?.status[s] || 0;
                                        const total = stats?.totalActive || 1;
                                        const pct = Math.round((count / total) * 100);
                                        const colors: Record<string, string> = {
                                            NEW: 'bg-blue-500',
                                            OPEN: 'bg-emerald-500',
                                            PENDING: 'bg-amber-500',
                                        };
                                        return (
                                            <div key={s}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground font-medium">{s}</span>
                                                    <span className="text-foreground font-semibold">{count}</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className={`h-full rounded-full ${colors[s]} transition-all`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Breakdown Priority</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => {
                                        const count = stats?.priority[p] || 0;
                                        const total = stats?.totalActive || 1;
                                        const pct = Math.round((count / total) * 100);
                                        const colors: Record<string, string> = {
                                            URGENT: 'bg-red-500',
                                            HIGH: 'bg-orange-500',
                                            MEDIUM: 'bg-yellow-500',
                                            LOW: 'bg-teal-500',
                                        };
                                        return (
                                            <div key={p}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground font-medium">{p}</span>
                                                    <span className="text-foreground font-semibold">{count}</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div className={`h-full rounded-full ${colors[p]} transition-all`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Tickets Table */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                Recent Tickets
                            </CardTitle>
                            <button
                                onClick={() => navigate('/tickets')}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                            >
                                Lihat Semua <ExternalLink className="w-3 h-3" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!stats ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ticket</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Rumah Sakit</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Agen</TableHead>
                                            <TableHead className="text-right">Waktu</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(stats.recentTickets || []).map((t) => (
                                            <TableRow
                                                key={t.id}
                                                className="cursor-pointer"
                                                onClick={() => navigate('/tickets')}
                                            >
                                                <TableCell>
                                                    <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium">{t.contact.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">{t.contact.client.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariant[t.status] || 'secondary'} className="text-[10px]">
                                                        {t.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={priorityVariant[t.priority] || 'outline'} className="text-[10px]">
                                                        {t.priority}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">
                                                        {t.claimedBy?.name || t.assignedAgent?.name || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="text-xs text-muted-foreground">{formatTime(t.createdAt)}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}
