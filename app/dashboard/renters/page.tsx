import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Plus, UserCircle, Search } from "lucide-react";
import { RenterSearch } from "./renter-search";

export default async function RentersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const operator = await getOperator();
  const supabase = await createClient();
  const { q } = await searchParams;

  let query = supabase
    .from("renters")
    .select("*")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
    );
  }

  const { data: renters } = await query;

  // Get booking counts for each renter
  const renterIds = renters?.map((r) => r.id) || [];
  let bookingCounts: Record<string, number> = {};
  let lastRentals: Record<string, string> = {};

  if (renterIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("renter_id, start_date")
      .in("renter_id", renterIds)
      .order("start_date", { ascending: false });

    if (bookings) {
      for (const b of bookings) {
        if (b.renter_id) {
          bookingCounts[b.renter_id] = (bookingCounts[b.renter_id] || 0) + 1;
          if (!lastRentals[b.renter_id]) {
            lastRentals[b.renter_id] = b.start_date;
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Renters</h1>
          <p className="text-muted-foreground">
            {renters?.length ?? 0} total renters
          </p>
        </div>
        <Link href="/dashboard/renters/new">
          <Button style={{ backgroundColor: "#2EBD6B" }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Renter
          </Button>
        </Link>
      </div>

      <RenterSearch defaultValue={q} />

      {!renters || renters.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No renters yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first renter to get started
            </p>
            <Link href="/dashboard/renters/new">
              <Button style={{ backgroundColor: "#2EBD6B" }}>
                Add Renter
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Last Rental</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renters.map((renter) => (
                  <TableRow key={renter.id}>
                    <TableCell className="font-medium">
                      {renter.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {renter.email || "---"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {renter.phone || "---"}
                    </TableCell>
                    <TableCell>
                      {renter.is_blacklisted ? (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-500 border-red-500/20"
                        >
                          Blacklisted
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{bookingCounts[renter.id] || 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lastRentals[renter.id] || "---"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/renters/${renter.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
