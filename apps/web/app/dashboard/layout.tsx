import { Metadata } from 'next';
import SidebarNav from '@/components/dashboard/SidebarNav';

export const metadata: Metadata = {
  title: 'Dashboard — NOX // FiveM',
  description: 'Manage your FiveM servers',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F14]">
      <SidebarNav />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
