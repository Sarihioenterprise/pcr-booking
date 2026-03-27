import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const vehicles = [
  {
    id: "1",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    color: "White",
    plate: "ABC-1234",
    dailyRate: 65,
    status: "active" as const,
  },
  {
    id: "2",
    make: "Honda",
    model: "Civic",
    year: 2023,
    color: "Black",
    plate: "XYZ-5678",
    dailyRate: 55,
    status: "maintenance" as const,
  },
  {
    id: "3",
    make: "Nissan",
    model: "Altima",
    year: 2024,
    color: "Silver",
    plate: "DEF-9012",
    dailyRate: 60,
    status: "inactive" as const,
  },
];

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-600",
  maintenance: "bg-yellow-100 text-yellow-700",
};

export default function FleetPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
          <Link href="/dashboard/fleet/new">
            <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
              Add Vehicle
            </Button>
          </Link>
        </div>

        {/* Vehicle Grid */}
        {vehicles.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="mb-2 text-lg font-medium text-gray-500">
                No vehicles yet
              </p>
              <p className="mb-4 text-sm text-gray-400">
                Add your first vehicle to get started.
              </p>
              <Link href="/dashboard/fleet/new">
                <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                  Add Vehicle
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {vehicle.make} {vehicle.model}
                    </CardTitle>
                    <Badge
                      className={statusStyles[vehicle.status]}
                    >
                      {vehicle.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Year</span>
                      <span className="font-medium text-gray-900">
                        {vehicle.year}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Plate</span>
                      <span className="font-medium text-gray-900">
                        {vehicle.plate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Rate</span>
                      <span className="font-medium text-gray-900">
                        ${vehicle.dailyRate}/day
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
