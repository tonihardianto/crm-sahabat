import { BarChart3, AlertTriangle, Clock, Inbox, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Ticket } from '@/lib/api';

interface StatsBarProps {
    tickets: Ticket[];
}

export function StatsBar({ tickets }: StatsBarProps) {
    const totalActive = tickets.length;
    const statusCount = tickets.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});
    const unassigned = tickets.filter(t => !t.claimedById).length;
    const urgentCount = tickets.filter(t => t.priority === 'URGENT').length;

    const cards = [
        { label: 'Total Aktif', value: totalActive, icon: BarChart3, color: 'text-blue-400' },
        { label: 'New', value: statusCount['NEW'] || 0, icon: Inbox, color: 'text-sky-400' },
        { label: 'Open', value: statusCount['OPEN'] || 0, icon: Clock, color: 'text-emerald-400' },
        { label: 'Pending', value: statusCount['PENDING'] || 0, icon: Clock, color: 'text-amber-400' },
        { label: 'Urgent', value: urgentCount, icon: AlertTriangle, color: 'text-red-400' },
        { label: 'Unclaimed', value: unassigned, icon: UserCheck, color: 'text-purple-400' },
    ];

    return (
        <div className="px-3 py-3 border-b border-border space-y-2">
            <div className="grid grid-cols-3 gap-2">
                {cards.map((c) => (
                    <Card key={c.label} className="py-2 px-2.5 gap-0">
                        <CardContent className="flex items-center gap-2 p-0">
                            <c.icon className={`w-3.5 h-3.5 ${c.color} shrink-0`} />
                            <div className="min-w-0">
                                <p className={`text-sm font-bold ${c.color} leading-none`}>{c.value}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
