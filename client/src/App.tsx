import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { PrivateRoute } from '@/components/PrivateRoute';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { UsersPage } from '@/pages/UsersPage';

function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 min-w-0 overflow-hidden bg-muted/20">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
