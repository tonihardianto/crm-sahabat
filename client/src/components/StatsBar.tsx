import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle, Clock, Inbox, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
    totalActive: number;
    unassigned: number;
    status: Record<string, number>;
    priority: Record<string, number>;
}

export function StatsBar() {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        fetch('/api/stats')
            .then((r) => r.json())
            .then(setStats)
            .catch(console.error);
    }, []);

    if (!stats) return null;

    const cards = [
        { label: 'Total Aktif', value: stats.totalActive, icon: BarChart3, color: 'text-blue-400' },
        { label: 'New', value: stats.status['NEW'] || 0, icon: Inbox, color: 'text-sky-400' },
        { label: 'Open', value: stats.status['OPEN'] || 0, icon: Clock, color: 'text-emerald-400' },
        { label: 'Pending', value: stats.status['PENDING'] || 0, icon: Clock, color: 'text-amber-400' },
        { label: 'Urgent', value: stats.priority['URGENT'] || 0, icon: AlertTriangle, color: 'text-red-400' },
        { label: 'Unclaimed', value: stats.unassigned, icon: UserCheck, color: 'text-purple-400' },
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
