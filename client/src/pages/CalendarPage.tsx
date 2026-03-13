import { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, Plus, X, Trash2, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import '@/calendar.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
    color?: string;
    location?: string;
}

interface EventFormData {
    title: string;
    description: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    allDay: boolean;
    color: string;
    location: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
    { label: 'Biru', value: '#3b82f6' },
    { label: 'Hijau', value: '#22c55e' },
    { label: 'Merah', value: '#ef4444' },
    { label: 'Oranye', value: '#f97316' },
    { label: 'Ungu', value: '#a855f7' },
    { label: 'Pink', value: '#ec4899' },
    { label: 'Kuning', value: '#eab308' },
    { label: 'Abu-abu', value: '#6b7280' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const defaultForm: EventFormData = {
    title: '',
    description: '',
    startDate: undefined,
    endDate: undefined,
    startHour: '08',
    startMinute: '00',
    endHour: '09',
    endMinute: '00',
    allDay: false,
    color: '#3b82f6',
    location: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildISO(date: Date, hour: string, minute: string, allDay: boolean): string {
    const d = new Date(date);
    if (allDay) {
        d.setHours(0, 0, 0, 0);
    } else {
        d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    }
    return d.toISOString();
}

// ─── DatePickerField Component ────────────────────────────────────────────────
interface DatePickerFieldProps {
    value: Date | undefined;
    onChange: (d: Date | undefined) => void;
    placeholder?: string;
}

function DatePickerField({ value, onChange, placeholder = 'Pilih tanggal' }: DatePickerFieldProps) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <CalendarIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    {value
                        ? format(value, 'dd MMMM yyyy', { locale: id })
                        : placeholder}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <CalendarPicker
                    mode="single"
                    selected={value}
                    defaultMonth={value}
                    captionLayout="dropdown"
                    onSelect={(d) => {
                        onChange(d);
                        setOpen(false);
                    }}
                    locale={id}
                />
            </PopoverContent>
        </Popover>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<EventFormData>(defaultForm);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchEvents = useCallback(async () => {
        try {
            const res = await fetch('/api/calendar', { credentials: 'include' });
            if (!res.ok) throw new Error();
            const data: CalendarEvent[] = await res.json();
            setEvents(data);
        } catch {
            toast.error('Gagal memuat event kalender');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const openNew = (dateStr?: string) => {
        setEditingId(null);
        setForm({
            ...defaultForm,
            startDate: dateStr ? new Date(dateStr) : undefined,
        });
        setModalOpen(true);
    };

    const openEdit = (event: CalendarEvent) => {
        setEditingId(event.id);
        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : undefined;
        setForm({
            title: event.title,
            description: event.description ?? '',
            startDate: start,
            endDate: end,
            startHour: String(start.getHours()).padStart(2, '0'),
            startMinute: String(Math.round(start.getMinutes() / 15) * 15).padStart(2, '0'),
            endHour: end ? String(end.getHours()).padStart(2, '0') : '09',
            endMinute: end ? String(Math.round(end.getMinutes() / 15) * 15).padStart(2, '0') : '00',
            allDay: event.allDay,
            color: event.color ?? '#3b82f6',
            location: event.location ?? '',
        });
        setModalOpen(true);
    };

    const handleDateClick = (arg: DateClickArg) => openNew(arg.dateStr);
    const handleEventClick = (arg: EventClickArg) => {
        const found = events.find(e => e.id === arg.event.id);
        if (found) openEdit(found);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Nama event wajib diisi'); return; }
        if (!form.startDate) { toast.error('Tanggal mulai wajib dipilih'); return; }

        const startISO = buildISO(form.startDate, form.startHour, form.startMinute, form.allDay);
        const endISO = form.endDate
            ? buildISO(form.endDate, form.endHour, form.endMinute, form.allDay)
            : null;

        setSaving(true);
        try {
            const payload = {
                title: form.title.trim(),
                description: form.description || null,
                startDate: startISO,
                endDate: endISO,
                allDay: form.allDay,
                color: form.color,
                location: form.location || null,
            };

            const url = editingId ? `/api/calendar/${editingId}` : '/api/calendar';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error();
            toast.success(editingId ? 'Event berhasil diperbarui' : 'Event berhasil ditambahkan');
            setModalOpen(false);
            fetchEvents();
        } catch {
            toast.error('Gagal menyimpan event');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/calendar/${editingId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) throw new Error();
            toast.success('Event berhasil dihapus');
            setModalOpen(false);
            fetchEvents();
        } catch {
            toast.error('Gagal menghapus event');
        } finally {
            setDeleting(false);
        }
    };

    const fcEvents: EventInput[] = events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.startDate,
        end: e.endDate ?? undefined,
        allDay: e.allDay,
        backgroundColor: e.color ?? '#3b82f6',
        borderColor: e.color ?? '#3b82f6',
    }));

    return (
        <div className="flex flex-col h-full p-4 md:p-6 gap-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">Kalender Event</h1>
                        <p className="text-xs text-muted-foreground">Kelola dan jadwalkan event tim Anda</p>
                    </div>
                </div>
                <button
                    onClick={() => openNew()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Event
                </button>
            </div>

            {/* Calendar */}
            <div className="bg-card border border-border rounded-xl overflow-hidden flex-1 min-h-[500px]">
                {loading ? (
                    <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground text-sm">
                        Memuat kalender...
                    </div>
                ) : (
                    <div className="p-2 sm:p-4 h-full">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
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
                            dateClick={handleDateClick}
                            eventClick={handleEventClick}
                            height="100%"
                            editable={false}
                            selectable={false}
                            dayMaxEvents={3}
                        />
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="font-semibold text-base text-foreground">
                                {editingId ? 'Edit Event' : 'Tambah Event Baru'}
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Nama Event *</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Pelatihan SIMRS di RSUD Dr. Soetomo"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>

                            {/* All Day Toggle */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="allDay"
                                    checked={form.allDay}
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        allDay: e.target.checked,
                                        endDate: undefined,
                                    }))}
                                    className="w-4 h-4 accent-blue-500"
                                />
                                <label htmlFor="allDay" className="text-sm text-foreground cursor-pointer">
                                    Seharian penuh
                                </label>
                            </div>

                            {/* Start Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Tanggal Mulai *</label>
                                <DatePickerField
                                    value={form.startDate}
                                    onChange={d => setForm(f => ({ ...f, startDate: d }))}
                                    placeholder="Pilih tanggal mulai"
                                />
                                {/* Start Time */}
                                {!form.allDay && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Select value={form.startHour} onValueChange={v => setForm(f => ({ ...f, startHour: v }))}>
                                            <SelectTrigger className="w-22 h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <span className="text-muted-foreground font-medium">:</span>
                                        <Select value={form.startMinute} onValueChange={v => setForm(f => ({ ...f, startMinute: v }))}>
                                            <SelectTrigger className="w-20 h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* End Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Tanggal Selesai</label>
                                <DatePickerField
                                    value={form.endDate}
                                    onChange={d => setForm(f => ({ ...f, endDate: d }))}
                                    placeholder="Pilih tanggal selesai"
                                />
                                {/* End Time */}
                                {!form.allDay && form.endDate && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <Select value={form.endHour} onValueChange={v => setForm(f => ({ ...f, endHour: v }))}>
                                            <SelectTrigger className="w-22 h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <span className="text-muted-foreground font-medium">:</span>
                                        <Select value={form.endMinute} onValueChange={v => setForm(f => ({ ...f, endMinute: v }))}>
                                            <SelectTrigger className="w-20 h-9 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Color */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Warna Event</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            title={opt.label}
                                            onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                                            className={`w-7 h-7 rounded-full transition-all ${form.color === opt.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: opt.value }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Location */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Lokasi</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Ruang Meeting A / Online"
                                    value={form.location}
                                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Deskripsi</label>
                                <textarea
                                    placeholder="Deskripsi event (opsional)"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between gap-3 p-5 border-t border-border">
                            <div>
                                {editingId && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deleting ? 'Menghapus...' : 'Hapus'}
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
