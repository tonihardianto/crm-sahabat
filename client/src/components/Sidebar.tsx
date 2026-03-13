import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Building2, Users, FileText, Shield, ChevronLeft, ChevronRight, Archive, CalendarDays } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAppSettings } from '@/context/AppSettingsContext';

const generalNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tickets', icon: MessageSquare, label: 'Tickets' },
    { to: '/archived', icon: Archive, label: 'Arsip' },
    { to: '/clients', icon: Building2, label: 'Clients' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/calendar', icon: CalendarDays, label: 'Kalender' },
];

function NavItems({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
    const { user } = useAuth();
    const { unreadCount } = useNotification();
    return (
        <div className={`flex flex-col flex-1 space-y-6 ${collapsed ? 'px-2' : 'px-4'} pb-4`}>
            <div>
                {!collapsed && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">General</h3>}
                <nav className="space-y-0.5">
                    {generalNavItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            onClick={onNavigate}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                } ${collapsed ? 'justify-center' : ''}`
                            }
                        >
                            <div className="relative shrink-0">
                                <Icon className="w-4 h-4" />
                                {to === '/tickets' && unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold px-0.5 leading-none">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            {!collapsed && label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {user?.role === 'ADMIN' && (
                <div>
                    {!collapsed && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Admin</h3>}
                    <nav className="space-y-0.5">
                        <NavLink
                            to="/users"
                            onClick={onNavigate}
                            title={collapsed ? 'User Management' : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                } ${collapsed ? 'justify-center' : ''}`
                            }
                        >
                            <Shield className="w-4 h-4 shrink-0" />
                            {!collapsed && 'User Management'}
                        </NavLink>
                    </nav>
                </div>
            )}

            {!collapsed && (
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Custom Filters</h3>
                    <nav className="space-y-0.5">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-1" />
                            Active Tickets
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1" />
                            Pending Templates
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
}

interface SidebarProps {
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
    const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } = useAppSettings();

    return (
        <>
            {/* Mobile: Sheet drawer */}
            <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
                <SheetContent side="left" className="w-64 p-0 pt-4">
                    <div className="px-4 mb-4">
                        <span className="font-semibold text-base tracking-tight text-foreground">CRM Sahabat</span>
                    </div>
                    <NavItems onNavigate={onMobileClose} />
                </SheetContent>
            </Sheet>

            {/* Desktop: collapsible sidebar */}
            <aside className={`bg-card border-r border-border shrink-0 flex-col overflow-y-auto hidden md:flex transition-all duration-200 ${collapsed ? 'w-14' : 'w-64'}`}>
                <div className={`flex items-center py-3 ${collapsed ? 'justify-center px-2' : 'justify-end px-3'}`}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
                <NavItems collapsed={collapsed} />
            </aside>
        </>
    );
}
