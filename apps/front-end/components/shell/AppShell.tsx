// Server Component: AppShell
// Architectural: Provides layout, sidebar, and topbar. RBAC-aware navigation (read-only, no logic).
// All imports explicit, ESM, and alias-based.

import { ReactNode } from 'react';
import { Sidebar } from '@/components/shell/Sidebar.tsx';
import { Topbar } from '@/components/shell/Topbar.tsx';
import Footer from '@/components/shell/Footer.tsx';

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell (Server Component)
 * - Provides main layout for the app
 * - Sidebar and Topbar are read-only presenters
 * - RBAC navigation is read-only (no logic)
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
