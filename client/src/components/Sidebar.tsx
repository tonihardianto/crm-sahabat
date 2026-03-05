import { NavLink, useNavigate } from 'react-router-dom';
import { Headset, LayoutDashboard, MessageSquare, Building2, Users, FileText, Shield, LogOut } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tickets', icon: MessageSquare, label: 'Tickets' },
    { to: '/clients', icon: Building2, label: 'Clients' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/templates', icon: FileText, label: 'Templates' },
];

export function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <aside className="w-16 flex flex-col items-center py-4 bg-card border-r border-border shrink-0">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6">
                <Headset className="w-5 h-5 text-white" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col items-center gap-1">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <Tooltip key={to}>
                        <TooltipTrigger asChild>
                            <NavLink
                                to={to}
                                end={to === '/'}
                                className={({ isActive }) =>
                                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    }`
                                }
                            >
                                <Icon className="w-5 h-5" />
                            </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                    </Tooltip>
                ))}

                {/* Admin only: Users */}
                {user?.role === 'ADMIN' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <NavLink
                                to="/users"
                                className={({ isActive }) =>
                                    `w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    }`
                                }
                            >
                                <Shield className="w-5 h-5" />
                            </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">Users (Admin)</TooltipContent>
                    </Tooltip>
                )}
            </nav>

            {/* Bottom: user avatar + logout */}
            <div className="mt-auto flex flex-col items-center gap-3">
                {/* Live indicator */}
                <div className="flex flex-col items-center gap-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-400 font-medium">Live</span>
                </div>

                {/* User avatar with tooltip */}
                {user && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-border flex items-center justify-center text-xs font-bold text-foreground cursor-default">
                                {user.name.slice(0, 2).toUpperCase()}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <div className="text-xs space-y-0.5">
                                <div className="font-semibold">{user.name}</div>
                                <div className="text-muted-foreground">{user.email}</div>
                                <div className="text-muted-foreground">{user.role}</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Logout */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleLogout}
                            className="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
            </div>
        </aside>
    );
}
