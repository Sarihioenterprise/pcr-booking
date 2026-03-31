import { Car } from "lucide-react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2EBD6B]">
            <Car className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-[#0c0c1c] tracking-tight">
            PCR Booking
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Renter Portal</p>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
