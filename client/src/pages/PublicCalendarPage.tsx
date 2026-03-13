import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import type { EventInput } from '@fullcalendar/core';
import { Calendar, MapPin, Info } from 'lucide-react';

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

    const fcEvents: EventInput[] = events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.startDate,
        end: e.endDate ?? undefined,
        allDay: e.allDay,
        backgroundColor: e.color ?? '#3b82f6',
        borderColor: e.color ?? '#3b82f6',
    }));

    const formatDate = (iso: string, allDay: boolean) => {
        const d = new Date(iso);
        if (allDay) {
            return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        return d.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
            {/* Header */}
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
                    {/* <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                        <Calendar className="w-5 h-5 text-white" />
                    </div> */}
                    <div>
                        <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Kalender Event</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tim Support SIMRS Sahabat — Jadwal & Kegiatan</p>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[400px] text-slate-400 text-sm">
                        Memuat kalender...
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <style>{`
                                .fc .fc-toolbar-title { font-size: 1rem; font-weight: 700; }
                                .fc .fc-button { border-radius: 8px !important; font-size: 0.78rem !important; font-weight: 500 !important; }
                                .fc .fc-button-primary { background-color: #2563eb !important; border-color: #2563eb !important; }
                                .fc .fc-button-primary:hover { background-color: #1d4ed8 !important; }
                                .fc .fc-event { border-radius: 4px !important; font-size: 0.75rem !important; cursor: pointer !important; }
                                .fc .fc-daygrid-day-number { font-size: 0.8rem; }
                                .fc .fc-col-header-cell-cushion { font-size: 0.78rem; font-weight: 600; }
                                .fc-theme-standard td, .fc-theme-standard th { border-color: #e2e8f0; }
                                .fc-theme-standard .fc-scrollgrid { border-color: #e2e8f0; }
                                .fc .fc-daygrid-day.fc-day-today { background-color: #eff6ff !important; }
                                .fc .fc-multimonth-title { font-size: 0.875rem; font-weight: 600; }
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
                <p className="text-center text-xs text-slate-400 mt-6">
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
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Color accent bar */}
                        <div className="h-1.5   " style={{ backgroundColor: selectedEvent.color ?? '#3b82f6' }} />

                        <div className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{selectedEvent.title}</h2>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-colors text-lg leading-none"
                                >×</button>
                            </div>

                            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                                <div>
                                    <div>{formatDate(selectedEvent.startDate, selectedEvent.allDay)}</div>
                                    {selectedEvent.endDate && (
                                        <div className="text-slate-400">s/d {formatDate(selectedEvent.endDate, selectedEvent.allDay)}</div>
                                    )}
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                                    {selectedEvent.location}
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
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
