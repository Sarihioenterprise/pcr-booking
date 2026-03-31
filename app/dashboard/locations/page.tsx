import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Phone, Star } from "lucide-react";
import type { Location } from "@/lib/types";
import { LocationActions } from "./location-actions";

export default async function LocationsPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("operator_id", operator.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-[#2EBD6B]" />
            Locations
          </h1>
          <p className="text-muted-foreground">
            {locations?.length ?? 0} location{(locations?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/locations/new">
          <Button className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </div>

      {!locations || locations.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No locations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first pickup/dropoff location
            </p>
            <Link href="/dashboard/locations/new">
              <Button className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">Add Location</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(locations as Location[]).map((location) => (
            <Card key={location.id} className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                      <MapPin className="h-[18px] w-[18px] text-[#2EBD6B]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{location.name}</h3>
                      {location.is_default && (
                        <Badge className="bg-[#2EBD6B] text-white text-[10px] mt-0.5">
                          <Star className="h-2.5 w-2.5 mr-0.5" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                  <LocationActions location={location} />
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {location.address && <p>{location.address}</p>}
                  {(location.city || location.state || location.zip) && (
                    <p>
                      {[location.city, location.state].filter(Boolean).join(", ")}
                      {location.zip ? ` ${location.zip}` : ""}
                    </p>
                  )}
                  {location.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {location.phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
