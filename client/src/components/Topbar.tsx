import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, User, Menu, Sun, Moon, Bell, MessageCircle, Ticket, UserCheck, ArrowRightLeft, BellOff, CheckCheck } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import type { NotificationItemType } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import logoLight from '@/assets/images/logo-256.png';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

const NOTIF_META: Record<NotificationItemType, { icon: React.ReactNode; color: string; bg: string }> = {
    message:    { icon: <MessageCircle className="w-4 h-4" />,    color: 'text-blue-400',   bg: 'bg-blue-500/15' },
    ticket_new: { icon: <Ticket className="w-4 h-4" />,           color: 'text-amber-400',  bg: 'bg-amber-500/15' },
    handover:   { icon: <ArrowRightLeft className="w-4 h-4" />,   color: 'text-violet-400', bg: 'bg-violet-500/15' },
    assign:     { icon: <UserCheck className="w-4 h-4" />,        color: 'text-emerald-400',bg: 'bg-emerald-500/15' },
};

function timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const { unreadCount, notifications, markAllRead, clearNotifications, requestPermission, notifyPermission } = useNotification();
    const navigate = useNavigate();

    return (
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 top-0 sticky z-50">
            {/* Logo area */}
            <div className="flex items-center gap-3 shrink-0">
                {/* Hamburger — mobile only */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <div className="w-10 h-8 rounded-lg flex items-center justify-center">
                        {/* <Headset className="w-5 h-5 text-white" /> */}
                        <img src={logoLight} alt="CRM Sahabat" className="w-6 h-6 object-contain" />
                    </div>
                    <span className="font-semibold -ms-4 text-primary text-base tracking-tight text-foreground hidden sm:block">ishaCRM</span>

                </Link>
            </div>

            {/* Middle: Search — hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl px-4 items-center justify-center">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search CRM..."
                        className="w-full pl-9 h-9 bg-muted/50 border-transparent hover:border-border focus:bg-background transition-colors rounded-full"
                    />
                </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium border-border/50 hidden sm:flex">
                    <Plus className="w-3.5 h-3.5" />
                    Create
                </Button>

                {/* Notification bell */}
                <DropdownMenu onOpenChange={(open) => { if (open && unreadCount > 0) markAllRead(); }}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="relative w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="Notifikasi"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                            <span className="text-sm font-semibold">Notifikasi</span>
                            <div className="flex items-center gap-1">
                                {notifications.length > 0 && (
                                    <>
                                        <button
                                            onClick={markAllRead}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
                                            title="Tandai semua sudah dibaca"
                                        >
                                            <CheckCheck className="w-3 h-3" /> Baca semua
                                        </button>
                                        <button
                                            onClick={clearNotifications}
                                            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
                                            title="Hapus semua notifikasi"
                                        >
                                            Hapus
                                        </button>
                                    </>
                                )}
                                {notifyPermission === 'default' && (
                                    <button
                                        onClick={requestPermission}
                                        className="text-xs text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
                                    >
                                        Izinkan notifikasi
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                                <BellOff className="w-8 h-8 opacity-30" />
                                <p className="text-sm">Belum ada notifikasi</p>
                            </div>
                        ) : (
                            <ScrollArea className="max-h-[360px]">
                                <div className="py-1">
                                    {notifications.map((n) => {
                                        const meta = NOTIF_META[n.type];
                                        return (
                                            <div
                                                key={n.id}
                                                className={`flex gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors ${!n.read ? 'bg-accent/20' : ''}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${meta.bg} ${meta.color}`}>
                                                    {meta.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-xs font-medium leading-snug ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {n.title}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                                                    </div>
                                                    {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                                                    {n.detail && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{n.detail}</p>}
                                                </div>
                                                {!n.read && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Dark/Light toggle */}
                <button
                    onClick={toggle}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-border flex items-center justify-center text-xs font-bold text-foreground hover:ring-2 ring-blue-500/20 transition-all outline-none">
                                {user.name.slice(0, 2).toUpperCase()}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                                <User className="w-4 h-4" />
                                My Account
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
