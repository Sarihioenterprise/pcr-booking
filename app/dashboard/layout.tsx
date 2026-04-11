import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserMenu } from "@/components/dashboard/user-menu";
import { SupportChat } from "@/components/dashboard/support-chat";
import { getOperator } from "@/lib/get-operator";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getOperator();

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 lg:px-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Support Chat — floats on every dashboard page */}
      <SupportChat />
    </div>
  );
}
