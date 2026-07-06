import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import type { EventInput } from '@fullcalendar/core';
import { Calendar, MapPin, Info, Users } from 'lucide-react';

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
            title: e.location ? `${e.location} — ${e.title}` : e.title,
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
            <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div>
                        <h1 className="text-base font-bold text-foreground leading-tight">Kalender Event</h1>
                        <p className="text-xs text-muted-foreground">Tim Support SIMRS Sahabat — Jadwal & Kegiatan</p>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-sm">
                        Memuat kalender...
                    </div>
                ) : (
                    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <style>{`
                                .fc .fc-toolbar-title { font-size: 1rem; font-weight: 700; color: var(--foreground); }
                                .fc .fc-button { border-radius: 8px !important; font-size: 0.78rem !important; font-weight: 500 !important; }
                                .fc .fc-button-primary { background-color: var(--primary) !important; border-color: var(--primary) !important; color: var(--primary-foreground) !important; }
                                .fc .fc-button-primary:hover { opacity: 0.9 !important; }
                                .fc .fc-button-primary:disabled { opacity: 0.5 !important; }
                                .fc .fc-event { border-radius: 4px !important; font-size: 0.75rem !important; cursor: pointer !important; }
                                .fc .fc-daygrid-day-number { font-size: 0.8rem; color: var(--foreground); }
                                .fc .fc-col-header-cell-cushion { font-size: 0.78rem; font-weight: 600; color: var(--muted-foreground); }
                                .fc-theme-standard td, .fc-theme-standard th { border-color: var(--border) !important; }
                                .fc-theme-standard .fc-scrollgrid { border-color: var(--border) !important; }
                                .fc .fc-daygrid-day.fc-day-today { background-color: var(--accent) !important; }
                                .fc .fc-multimonth-title { font-size: 0.875rem; font-weight: 600; color: var(--foreground); }
                                .fc .fc-button-group .fc-button { border-color: var(--border) !important; }
                                .fc .fc-button-group .fc-button:not(.fc-button-primary) { background-color: var(--card) !important; color: var(--foreground) !important; }
                                .fc .fc-button-group .fc-button:not(.fc-button-primary):hover { background-color: var(--accent) !important; }
                            `}</style>
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

                {/* Footer info */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    Kalender ini bersifat publik dan hanya untuk informasi. Untuk pertanyaan lebih lanjut, hubungi Tim Support Sahabat.
                </p>
            </main>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Color accent bar */}
                        <div className="h-1.5" style={{ backgroundColor: selectedEvent.color ?? '#c8842c' }} />

                        <div className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="font-bold text-base text-foreground leading-snug">{selectedEvent.title}</h2>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent shrink-0 transition-colors text-lg leading-none"
                                >×</button>
                            </div>

                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                <div>
                                    <div>{formatDate(selectedEvent.startDate, selectedEvent.allDay)}</div>
                                    {selectedEvent.endDate && (
                                        <div className="text-muted-foreground/70">s/d {formatDate(selectedEvent.endDate, selectedEvent.allDay)}</div>
                                    )}
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                                    {selectedEvent.location}
                                </div>
                            )}

                            {selectedEvent.teams && selectedEvent.teams.length > 0 && (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
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
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
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
