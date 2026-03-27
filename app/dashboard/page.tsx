import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  DollarSign,
  Car,
  Users,
  Clock,
  CalendarX2,
} from "lucide-react";

const stats = [
  {
    title: "Total Bookings This Month",
    value: "12",
    icon: CalendarDays,
  },
  {
    title: "Revenue This Month",
    value: "$0",
    icon: DollarSign,
  },
  {
    title: "Active Rentals",
    value: "3",
    icon: Car,
  },
  {
    title: "Leads Today",
    value: "5",
    icon: Users,
  },
  {
    title: "Upcoming Returns",
    value: "2",
    icon: Clock,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-0 bg-white shadow-sm ring-0"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                <stat.icon className="h-[18px] w-[18px] text-[#2EBD6B]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-gray-900">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bookings */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <CalendarDays className="h-5 w-5 text-[#2EBD6B]" />
            Recent Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
              <CalendarX2 className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              No bookings yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              When you receive bookings, they will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
