import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import type { EventInput } from '@fullcalendar/core';
import { Calendar, MapPin, Info, X, Sun, Moon, Users } from 'lucide-react';
import './calendar.css';

function useTheme() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains('dark')
    );
    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };
    return { dark, toggle };
}

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
    color?: string;
    location?: string;
    createdBy?: { name: string };
    teams?: { id: string; name: string; department?: string }[];
}

export function PublicCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const { dark, toggle } = useTheme();

    useEffect(() => {
        fetch('/api/calendar')
            .then(r => r.json())
            .then((data: CalendarEvent[]) => setEvents(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const fcEvents: EventInput[] = events.map(e => {
        // FullCalendar uses exclusive end dates — add one day for all-day events
        let end: string | undefined;
        if (e.endDate) {
            const d = new Date(e.endDate);
            if (e.allDay) d.setDate(d.getDate() + 1);
            end = d.toISOString();
        }
        return {
            id: e.id,
            title: e.location ? `${e.location} : ${e.title}` : e.title,
            start: e.startDate,
            end,
            allDay: e.allDay,
            backgroundColor: e.color ?? '#c8842c',
            borderColor: e.color ?? '#c8842c',
        };
    });

    const formatDate = (iso: string, allDay: boolean) => {
        const d = new Date(iso);
        if (allDay) {
            return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        return d.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-foreground leading-tight">Kalender Kegiatan</h1>
                        <p className="text-xs text-muted-foreground leading-tight truncate">Tim Support SIMRS Sahabat</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            Live
                        </span>
                        <button
                            onClick={toggle}
                            title={dark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                        >
                            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[450px] gap-3 text-muted-foreground">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Memuat kalender...</span>
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl shadow-sm border border-border">
                        {/* Card header with event count */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                            <p className="text-xs text-muted-foreground font-medium">
                                {events.length} kegiatan terjadwal
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {['#3b82f6','#22c55e','#ef4444','#f97316','#a855f7','#ec4899'].map(c => (
                                    <span key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        <div className="px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'multiMonthYear,dayGridMonth,timeGridWeek',
                                }}
                                buttonText={{
                                    today: 'Hari Ini',
                                    month: 'Bulan',
                                    week: 'Minggu',
                                    multiMonthYear: 'Tahun',
                                }}
                                locale="id"
                                events={fcEvents}
                                height="auto"
                                editable={false}
                                selectable={false}
                                dayMaxEvents={3}
                                eventClick={(arg) => {
                                    const found = events.find(e => e.id === arg.event.id);
                                    if (found) setSelectedEvent(found);
                                }}
                            />
                        </div>
                    </div>
                )}

                <p className="text-center text-xs text-muted-foreground mt-5">
                    Kalender ini bersifat publik dan hanya untuk informasi. &nbsp;·&nbsp; Hubungi Tim Support Sahabat untuk informasi lebih lanjut.
                </p>
            </main>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Color accent bar */}
                        <div className="h-1" style={{ backgroundColor: selectedEvent.color ?? '#c8842c' }} />

                        {/* Modal header */}
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                                    style={{ backgroundColor: selectedEvent.color ?? '#c8842c' }}
                                />
                                <h2 className="font-semibold text-sm text-foreground leading-snug">{selectedEvent.title}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                <div className="space-y-0.5">
                                    <div className="font-medium text-foreground">{formatDate(selectedEvent.startDate, selectedEvent.allDay)}</div>
                                    {selectedEvent.endDate && (
                                        <div className="text-muted-foreground text-xs">s/d {formatDate(selectedEvent.endDate, selectedEvent.allDay)}</div>
                                    )}
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                                    <span>{selectedEvent.location}</span>
                                </div>
                            )}

                            {selectedEvent.teams && selectedEvent.teams.length > 0 && (
                                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <Users className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                    <div className="flex flex-wrap gap-1">
                                        {selectedEvent.teams.map(t => (
                                            <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                                                {t.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                                    <p className="leading-relaxed">{selectedEvent.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
