import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Megaphone, Globe, Plus } from "lucide-react";

interface LeadSourcesWidgetProps {
  bookingWidgetCount: number;
  pcrLeadsCount: number;
  otherCount: number;
  pcrConversions: number;
}

function SourceBar({
  label,
  count,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ElementType;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded ${color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{pct}%</span>
          <span className="font-bold text-gray-900 w-6 text-right">{count}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            color.includes("green")
              ? "bg-[#2EBD6B]"
              : color.includes("blue")
              ? "bg-blue-500"
              : "bg-gray-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function LeadSourcesWidget({
  bookingWidgetCount,
  pcrLeadsCount,
  otherCount,
  pcrConversions,
}: LeadSourcesWidgetProps) {
  const total = bookingWidgetCount + pcrLeadsCount + otherCount;

  return (
    <Card className="border-0 bg-white shadow-sm ring-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <TrendingUp className="h-5 w-5 text-[#2EBD6B]" />
          Lead Sources This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <p>No leads this month yet.</p>
            <Link
              href="/dashboard/leads"
              className="mt-2 inline-flex items-center gap-1 text-[#2EBD6B] hover:underline text-xs font-medium"
            >
              <Plus className="h-3 w-3" />
              Add a lead manually
            </Link>
          </div>
        ) : (
          <>
            <SourceBar
              label="Booking Page"
              count={bookingWidgetCount}
              total={total}
              color="bg-blue-50 text-blue-600"
              icon={Globe}
            />
            <SourceBar
              label="PCR Leads Campaigns"
              count={pcrLeadsCount}
              total={total}
              color="bg-[#2EBD6B]/10 text-[#2EBD6B]"
              icon={Megaphone}
            />
            {otherCount > 0 && (
              <SourceBar
                label="Manual / Other"
                count={otherCount}
                total={total}
                color="bg-gray-100 text-gray-500"
                icon={Plus}
              />
            )}
          </>
        )}

        {/* PCR Leads pitch / performance note */}
        {pcrLeadsCount === 0 ? (
          <div className="rounded-lg bg-[#0a1f14] border border-[#2EBD6B]/30 p-3">
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="font-semibold text-white">PCR Leads</span> fills the top of the
              funnel with managed Facebook ads — new renters sent straight to your booking page.
              Clients typically see{" "}
              <span className="text-[#2EBD6B] font-semibold">20–50+ leads/month</span>.
            </p>
            <a
              href="https://join.pcrleads.com?ref=pcrbooking"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2EBD6B] hover:underline"
            >
              Get More Leads →
            </a>
          </div>
        ) : (
          <div className="rounded-lg bg-[#0a1f14] border border-[#2EBD6B]/30 p-3">
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="font-semibold text-[#2EBD6B]">{pcrLeadsCount} leads</span> from
              PCR Leads campaigns this month.
              {pcrConversions > 0 && (
                <>
                  {" "}
                  <span className="font-semibold text-white">{pcrConversions} converted</span> to
                  bookings.
                </>
              )}
            </p>
            <a
              href="https://join.pcrleads.com?ref=pcrbooking"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2EBD6B] hover:underline"
            >
              View Campaign →
            </a>
          </div>
        )}

        <Link
          href="/dashboard/leads"
          className="block text-center text-xs text-gray-400 hover:text-[#2EBD6B] transition-colors"
        >
          View all leads →
        </Link>
      </CardContent>
    </Card>
  );
}
