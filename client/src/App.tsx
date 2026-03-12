import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import { Toaster } from 'sonner';
import { PrivateRoute } from '@/components/PrivateRoute';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { ArchivePage } from '@/pages/ArchivePage';
import { ClientsPage } from '@/pages/ClientsPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { UsersPage } from '@/pages/UsersPage';
import { AppSettingsPage } from '@/pages/AppSettingsPage';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tickets': 'Tiket Aktif',
  '/archived': 'Arsip Tiket',
  '/clients': 'Klien',
  '/contacts': 'Kontak',
  '/templates': 'Template',
  '/settings': 'Pengaturan',
  '/users': 'Pengguna',
  '/login': 'Login',
};

const APP_NAME = 'AishaCRM';

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = PAGE_TITLES[pathname];
    document.title = page ? `${page} — ${APP_NAME}` : APP_NAME;
  }, [pathname]);
  return null;
}

function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: '100dvh' }}>
      <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 min-w-0 overflow-hidden h-full bg-muted/20">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/archived" element={<ArchivePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/settings" element={<AppSettingsPage />} />
            <Route path="/users" element={
              <PrivateRoute adminOnly>
                <UsersPage />
              </PrivateRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppSettingsProvider>
        <NotificationProvider>
        <Toaster position="top-right" closeButton />
        <DocumentTitle />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — all other pages */}
          <Route path="/*" element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          } />
        </Routes>
        </NotificationProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
