import { useRef } from 'react';
import { PanelLeft, Monitor, MessageSquare, RotateCcw, Clock, StickyNote } from 'lucide-react';
import { useAppSettings } from '@/context/AppSettingsContext';

// ── Presets ──────────────────────────────────────────────────

const BG_PRESETS = [
    { label: 'Default', value: '' },
    { label: 'Light Gray', value: '#f0f2f5' },
    { label: 'WhatsApp', value: '#efeae2' },
    { label: 'Sky Blue', value: '#d9eef7' },
    { label: 'Lavender', value: '#ede7f6' },
    { label: 'Sage', value: '#e8f5e9' },
    { label: 'Peach', value: '#fce4d6' },
    { label: 'Dark Navy', value: '#1a1a2e' },
    { label: 'Charcoal', value: '#2d2d2d' },
];

const OUTBOUND_PRESETS = [
    { label: 'Default', value: '' },
    { label: 'Blue', value: '#1d6fa5' },
    { label: 'WA Green', value: '#128c7e' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Indigo', value: '#4338ca' },
    { label: 'Teal', value: '#0891b2' },
    { label: 'Green', value: '#16a34a' },
    { label: 'Dark', value: '#374151' },
];

const INBOUND_PRESETS = [
    { label: 'Default', value: '' },
    { label: 'White', value: '#ffffff' },
    { label: 'Light Blue', value: '#e3f2fd' },
    { label: 'Light Gray', value: '#f5f5f5' },
    { label: 'Lavender', value: '#f3e5f5' },
    { label: 'Mint', value: '#f0fdf4' },
    { label: 'Dark', value: '#374151' },
];

// ── Helper ────────────────────────────────────────────────────

function isDark(hex: string): boolean {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return false;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

// ── Sub-components ────────────────────────────────────────────

function ColorSwatch({
    value,
    selected,
    label,
    onClick,
}: {
    value: string;
    selected: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={label}
            onClick={onClick}
            className={`w-9 h-9 rounded-full border-2 transition-all shrink-0 ${
                selected
                    ? 'border-primary ring-2 ring-primary/40 scale-110'
                    : 'border-border hover:border-muted-foreground hover:scale-105'
            } ${!value ? 'bg-muted' : ''}`}
            style={value ? { backgroundColor: value } : undefined}
        >
            {!value && (
                <span className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">
                    ∅
                </span>
            )}
        </button>
    );
}

function ColorPickerRow({
    label,
    description,
    value,
    presets,
    onChange,
}: {
    label: string;
    description?: string;
    value: string;
    presets: { label: string; value: string }[];
    onChange: (v: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isCustom = value !== '' && !presets.find((p) => p.value === value);

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {presets.map((p) => (
                    <ColorSwatch
                        key={p.value === '' ? '__default__' : p.value}
                        value={p.value}
                        label={p.label}
                        selected={value === p.value}
                        onClick={() => onChange(p.value)}
                    />
                ))}
                {/* Custom picker button */}
                <button
                    type="button"
                    title="Custom color"
                    onClick={() => inputRef.current?.click()}
                    className={`w-9 h-9 rounded-full border-2 border-dashed transition-all shrink-0 flex items-center justify-center hover:scale-105 ${
                        isCustom
                            ? 'border-primary ring-2 ring-primary/40 scale-110'
                            : 'border-border hover:border-muted-foreground'
                    }`}
                    style={isCustom ? { backgroundColor: value } : undefined}
                >
                    {!isCustom && (
                        <svg
                            viewBox="0 0 16 16"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-muted-foreground"
                        >
                            <path d="M8 3v10M3 8h10" />
                        </svg>
                    )}
                    <input
                        ref={inputRef}
                        type="color"
                        className="sr-only"
                        value={value || '#3d6b8e'}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </button>
                {isCustom && (
                    <span className="text-xs text-muted-foreground font-mono">{value}</span>
                )}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────

export function AppSettingsPage() {
    const {
        sidebarCollapsed,
        setSidebarCollapsed,
        chatBg,
        setChatBg,
        outboundBubbleColor,
        setOutboundBubbleColor,
        inboundBubbleColor,
        setInboundBubbleColor,
        loading,
    } = useAppSettings();

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Loading settings…</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page header */}
            <div className="px-6 py-4 border-b border-border bg-card/50 shrink-0">
                <h1 className="text-lg font-semibold text-foreground">App Settings</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Sesuaikan tampilan aplikasi. Perubahan tersimpan otomatis ke akun Anda.
                </p>
            </div>

            {/* Two-column body */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── Left: Settings ── */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 min-w-0">

                    {/* Sidebar */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <PanelLeft className="w-4 h-4 text-muted-foreground" />
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Sidebar
                            </h2>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                            <div>
                                <p className="text-sm font-medium text-foreground">Collapse Sidebar</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Tampilkan sidebar dalam mode minimalis (ikon saja)
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={sidebarCollapsed}
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className={`relative shrink-0 rounded-full transition-colors ${
                                    sidebarCollapsed ? 'bg-primary' : 'bg-muted'
                                }`}
                                style={{ width: 44, height: 24 }}
                            >
                                <span
                                    className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
                                    style={{ transform: sidebarCollapsed ? 'translateX(23px)' : 'translateX(3px)' }}
                                />
                            </button>
                        </div>
                    </section>

                    {/* Chat Background */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Chat Background
                            </h2>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-card">
                            <ColorPickerRow
                                label="Warna Background Area Chat"
                                description="Warna latar belakang area pesan pada halaman Tickets"
                                value={chatBg}
                                presets={BG_PRESETS}
                                onChange={setChatBg}
                            />
                        </div>
                    </section>

                    {/* Bubble Colors */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Warna Bubble Chat
                            </h2>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-card space-y-6">
                            <ColorPickerRow
                                label="Bubble Agent (Outbound)"
                                description="Pesan yang dikirim oleh agen ke pelanggan"
                                value={outboundBubbleColor}
                                presets={OUTBOUND_PRESETS}
                                onChange={setOutboundBubbleColor}
                            />
                            <div className="border-t border-border" />
                            <ColorPickerRow
                                label="Bubble Pelanggan (Inbound)"
                                description="Pesan yang diterima dari pelanggan"
                                value={inboundBubbleColor}
                                presets={INBOUND_PRESETS}
                                onChange={setInboundBubbleColor}
                            />
                        </div>
                    </section>
                </div>

                {/* ── Right: Live Preview (sticky) ── */}
                <div className="w-180 shrink-0 border-l border-border bg-card/30 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-border shrink-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</p>
                    </div>

                    {/* Mock chat window */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Mock topbar */}
                        <div className="px-3 py-2 border-b border-border bg-card/60 flex items-center gap-2 shrink-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                JD
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-foreground leading-none">John Doe</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">RS Mitra Husada · TKT-00042</p>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div
                            className="flex-1 px-3 py-3 space-y-2 overflow-y-auto"
                            style={{ backgroundColor: chatBg || undefined }}
                        >
                            {/* Date separator */}
                            <div className="flex items-center justify-center my-1">
                                <span className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/80 rounded-full">
                                    Today
                                </span>
                            </div>

                            {/* Inbound */}
                            <div className="flex justify-start">
                                <div
                                    className="px-2.5 py-1.5 rounded-xl rounded-bl-md text-xs max-w-[85%] border border-border bg-muted"
                                    style={inboundBubbleColor ? { backgroundColor: inboundBubbleColor } : undefined}
                                >
                                    <p style={{ color: inboundBubbleColor ? (isDark(inboundBubbleColor) ? '#fff' : '#111') : undefined }}>
                                        Halo, ada yang bisa dibantu? 👋
                                    </p>
                                    <p className="text-[9px] text-right mt-0.5 opacity-50" style={{ color: inboundBubbleColor ? (isDark(inboundBubbleColor) ? '#fff' : '#111') : undefined }}>09:01</p>
                                </div>
                            </div>

                            {/* Outbound */}
                            <div className="flex justify-end">
                                <div
                                    className="bubble-bg px-2.5 py-1.5 rounded-xl rounded-br-md text-xs text-white max-w-[85%] border border-blue-500/30"
                                    style={outboundBubbleColor ? { backgroundColor: outboundBubbleColor } : undefined}
                                >
                                    <p>Selamat datang! Kami siap membantu Anda.</p>
                                    <p className="text-[9px] text-right mt-0.5 opacity-60">09:02</p>
                                </div>
                            </div>

                            {/* Inbound 2 */}
                            <div className="flex justify-start">
                                <div
                                    className="px-2.5 py-1.5 rounded-xl rounded-bl-md text-xs max-w-[85%] border border-border bg-muted"
                                    style={inboundBubbleColor ? { backgroundColor: inboundBubbleColor } : undefined}
                                >
                                    <p style={{ color: inboundBubbleColor ? (isDark(inboundBubbleColor) ? '#fff' : '#111') : undefined }}>
                                        Saya memiliki kendala di modul billing.
                                    </p>
                                    <p className="text-[9px] text-right mt-0.5 opacity-50" style={{ color: inboundBubbleColor ? (isDark(inboundBubbleColor) ? '#fff' : '#111') : undefined }}>09:03</p>
                                </div>
                            </div>

                            {/* Internal note */}
                            <div className="flex justify-center">
                                <div className="max-w-[90%] px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <StickyNote className="w-2.5 h-2.5 text-amber-400" />
                                        <span className="text-[9px] font-medium text-amber-400">Internal Note — Agen A</span>
                                    </div>
                                    <p className="text-[10px] text-amber-500/90">Sudah di-escalate ke tim developer.</p>
                                </div>
                            </div>

                            {/* Outbound 2 */}
                            <div className="flex justify-end">
                                <div
                                    className="bubble-bg px-2.5 py-1.5 rounded-xl rounded-br-md text-xs text-white max-w-[85%] border border-blue-500/30"
                                    style={outboundBubbleColor ? { backgroundColor: outboundBubbleColor } : undefined}
                                >
                                    <p>Baik, kami akan segera tindak lanjuti 🙏</p>
                                    <p className="text-[9px] text-right mt-0.5 opacity-60">09:05</p>
                                </div>
                            </div>

                            {/* Window timer badge */}
                            <div className="flex justify-center pt-1">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10">
                                    <Clock className="w-2.5 h-2.5" /> Time Left: 23h 12m
                                </span>
                            </div>
                        </div>

                        {/* Mock input bar */}
                        <div className="px-3 py-2 border-t border-border bg-card/60 shrink-0">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border">
                                <span className="text-xs text-muted-foreground flex-1">Ketik pesan…</span>
                                <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
                                    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                                        <path d="M2 8h10M8 3l5 5-5 5" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
