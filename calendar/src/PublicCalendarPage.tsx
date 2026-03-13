import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import type { EventInput } from '@fullcalendar/core';
import { Calendar, MapPin, Info, X } from 'lucide-react';
import './calendar.css';

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
        textColor: '#ffffff',
    }));

    const formatDate = (iso: string, allDay: boolean) => {
        const d = new Date(iso);
        if (allDay) {
            return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        return d.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
                    {/* <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                        <Calendar className="w-4 h-4 text-white" />
                    </div> */}
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Kalender Event</h1>
                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight truncate">Tim Support SIMRS Sahabat</p>
                    </div>
                    <div className="ml-auto">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[450px] gap-3 text-slate-400">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Memuat kalender...</span>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        {/* Card header with event count */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {events.length} event terjadwal
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

                <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-5">
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
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Color accent bar */}
                        <div className="h-1" style={{ backgroundColor: selectedEvent.color ?? '#3b82f6' }} />

                        {/* Modal header */}
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                                    style={{ backgroundColor: selectedEvent.color ?? '#3b82f6' }}
                                />
                                <h2 className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{selectedEvent.title}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                                <div className="space-y-0.5">
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{formatDate(selectedEvent.startDate, selectedEvent.allDay)}</div>
                                    {selectedEvent.endDate && (
                                        <div className="text-slate-400 dark:text-slate-500 text-xs">s/d {formatDate(selectedEvent.endDate, selectedEvent.allDay)}</div>
                                    )}
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                                    <span>{selectedEvent.location}</span>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
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
