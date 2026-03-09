import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, User, Menu, Sun, Moon, Bell } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
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

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const { unreadCount, requestPermission, notifyPermission } = useNotification();
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
                <button
                    onClick={notifyPermission === 'default' ? requestPermission : undefined}
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
