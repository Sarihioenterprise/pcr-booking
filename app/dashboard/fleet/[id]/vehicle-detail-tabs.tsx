"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Car,
  ImagePlus,
  FileText,
  Wrench,
  CalendarDays,
  DollarSign,
  CalendarX2,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import type {
  Vehicle,
  VehiclePhoto,
  VehicleDocument,
  Booking,
  MaintenanceRecord,
  PricingRule,
  BlackoutDate,
} from "@/lib/types";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const bookingStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

const maintenanceStatusColors: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface VehicleDetailTabsProps {
  vehicle: Vehicle & {
    locations: {
      id: string;
      name: string;
      address: string;
      city: string;
      state: string;
    } | null;
  };
  photos: VehiclePhoto[];
  documents: VehicleDocument[];
  bookings: Booking[];
  maintenance: MaintenanceRecord[];
  pricingRules: PricingRule[];
  blackoutDates: BlackoutDate[];
}

export function VehicleDetailTabs({
  vehicle,
  photos: initialPhotos,
  documents: initialDocuments,
  bookings,
  maintenance,
  pricingRules,
  blackoutDates,
}: VehicleDetailTabsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [vehicleStatus, setVehicleStatus] = useState(vehicle.status);
  const [photos, setPhotos] = useState(initialPhotos);
  const [documents, setDocuments] = useState(initialDocuments);

  // Photo dialog
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoLabel, setPhotoLabel] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);

  // Document dialog
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docType, setDocType] = useState("registration");
  const [docExpiry, setDocExpiry] = useState("");
  const [docLoading, setDocLoading] = useState(false);

  async function updateStatus(value: string | null) {
    if (!value) return;
    await supabase
      .from("vehicles")
      .update({ status: value })
      .eq("id", vehicle.id);
    setVehicleStatus(value as Vehicle["status"]);
  }

  async function addPhoto() {
    if (!photoUrl) return;
    setPhotoLoading(true);
    const res = await fetch(`/api/fleet/${vehicle.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: photoUrl,
        label: photoLabel || null,
        is_primary: photos.length === 0,
        sort_order: photos.length,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos([...photos, data]);
      setPhotoUrl("");
      setPhotoLabel("");
      setPhotoDialogOpen(false);
    }
    setPhotoLoading(false);
  }

  async function removePhoto(photoId: string) {
    const res = await fetch(
      `/api/fleet/${vehicle.id}/photos?photoId=${photoId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setPhotos(photos.filter((p) => p.id !== photoId));
    }
  }

  async function addDocument() {
    if (!docName || !docUrl) return;
    setDocLoading(true);
    const res = await fetch(`/api/fleet/${vehicle.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: docName,
        url: docUrl,
        type: docType,
        expiry_date: docExpiry || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setDocuments([data, ...documents]);
      setDocName("");
      setDocUrl("");
      setDocType("registration");
      setDocExpiry("");
      setDocDialogOpen(false);
    }
    setDocLoading(false);
  }

  async function removeDocument(docId: string) {
    const res = await fetch(
      `/api/fleet/${vehicle.id}/documents?docId=${docId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setDocuments(documents.filter((d) => d.id !== docId));
    }
  }

  return (
    <>
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Rules</TabsTrigger>
          <TabsTrigger value="blackouts">Blackout Dates</TabsTrigger>
        </TabsList>

        {/* DETAILS TAB */}
        <TabsContent value="details">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Vehicle Info */}
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Make</p>
                    <p className="font-semibold">{vehicle.make}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-semibold">{vehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-semibold">{vehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Color</p>
                    <p className="font-semibold">{vehicle.color || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plate</p>
                    <p className="font-semibold">{vehicle.plate || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">VIN</p>
                    <p className="font-semibold">{vehicle.vin || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-semibold capitalize">
                      {vehicle.category || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-semibold">
                      {vehicle.locations?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mileage</p>
                    <p className="font-semibold">
                      {vehicle.mileage?.toLocaleString() ?? "—"} mi
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fuel Level</p>
                    <p className="font-semibold">{vehicle.fuel_level || "—"}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2 border-t pt-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={statusStyles[vehicleStatus]}
                    >
                      {vehicleStatus}
                    </Badge>
                    <Select value={vehicleStatus} onValueChange={updateStatus}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Costs */}
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing & Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Daily Rate</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ${Number(vehicle.daily_rate).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weekly Rate</p>
                    <p className="text-lg font-bold">
                      {vehicle.weekly_rate
                        ? `$${Number(vehicle.weekly_rate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Rate</p>
                    <p className="text-lg font-bold">
                      {vehicle.monthly_rate
                        ? `$${Number(vehicle.monthly_rate).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min Rental Days</p>
                    <p className="font-semibold">
                      {vehicle.minimum_rental_days} day
                      {vehicle.minimum_rental_days !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Purchase Price</p>
                    <p className="font-semibold">
                      {vehicle.purchase_price
                        ? `$${Number(vehicle.purchase_price).toLocaleString()}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Cost</p>
                    <p className="font-semibold">
                      {vehicle.monthly_cost
                        ? `$${Number(vehicle.monthly_cost).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ImagePlus className="h-5 w-5" />
                  Vehicle Photos ({photos.length})
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                  onClick={() => setPhotoDialogOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Photo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImagePlus className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No photos uploaded yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative overflow-hidden rounded-lg border"
                    >
                      <img
                        src={photo.url}
                        alt={photo.label || "Vehicle photo"}
                        className="aspect-video w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex w-full items-center justify-between p-3">
                          <span className="text-sm text-white">
                            {photo.label || "Photo"}
                            {photo.is_primary && (
                              <Badge className="ml-2 bg-white/20">
                                Primary
                              </Badge>
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({documents.length})
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                  onClick={() => setDocDialogOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const isExpired =
                        doc.expiry_date &&
                        new Date(doc.expiry_date) < new Date();
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {doc.name}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.expiry_date ? (
                              <span
                                className={
                                  isExpired ? "text-red-600 font-medium" : ""
                                }
                              >
                                {new Date(doc.expiry_date).toLocaleDateString()}
                                {isExpired && " (Expired)"}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDocument(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAINTENANCE TAB */}
        <TabsContent value="maintenance">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance Records
                </CardTitle>
                <Link href="/dashboard/maintenance/new">
                  <Button
                    size="sm"
                    className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Record
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {maintenance.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No maintenance records.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/maintenance/${record.id}`}
                            className="font-medium hover:underline"
                          >
                            {record.type}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              maintenanceStatusColors[record.status] || ""
                            }
                          >
                            {record.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.cost
                            ? `$${Number(record.cost).toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {record.date_performed
                            ? new Date(
                                record.date_performed
                              ).toLocaleDateString()
                            : record.date_due
                              ? new Date(
                                  record.date_due
                                ).toLocaleDateString()
                              : "—"}
                        </TableCell>
                        <TableCell>{record.vendor || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BOOKINGS TAB */}
        <TabsContent value="bookings">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No bookings for this vehicle yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/dashboard/bookings/${booking.id}`}
                      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {booking.renter_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            bookingStatusColors[booking.status] || ""
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {new Date(booking.start_date).toLocaleDateString()} -{" "}
                          {new Date(booking.end_date).toLocaleDateString()}
                        </span>
                        <span>${Number(booking.total_price).toFixed(2)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRICING RULES TAB */}
        <TabsContent value="pricing">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Dynamic Pricing Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pricingRules.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No pricing rules configured.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingRules.map((rule) => {
                      const dayNames = [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ];
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {rule.type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{rule.multiplier}x</TableCell>
                          <TableCell>
                            {rule.start_date
                              ? new Date(
                                  rule.start_date
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {rule.end_date
                              ? new Date(rule.end_date).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {rule.day_of_week !== null
                              ? dayNames[rule.day_of_week]
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLACKOUT DATES TAB */}
        <TabsContent value="blackouts">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarX2 className="h-5 w-5" />
                Blackout Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blackoutDates.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No blackout dates configured.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blackoutDates.map((bd) => (
                      <TableRow key={bd.id}>
                        <TableCell>
                          {new Date(bd.start_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(bd.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{bd.reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Photo Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="photo-url">Photo URL</Label>
              <Input
                id="photo-url"
                placeholder="https://example.com/photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-label">Label (optional)</Label>
              <Input
                id="photo-label"
                placeholder="e.g. Front view"
                value={photoLabel}
                onChange={(e) => setPhotoLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPhotoDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={addPhoto}
              disabled={photoLoading || !photoUrl}
            >
              {photoLoading ? "Adding..." : "Add Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                placeholder="e.g. Vehicle Registration"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-url">Document URL</Label>
              <Input
                id="doc-url"
                placeholder="https://example.com/doc.pdf"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={docType} onValueChange={(v) => v && setDocType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry">Expiry Date (optional)</Label>
              <Input
                id="doc-expiry"
                type="date"
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={addDocument}
              disabled={docLoading || !docName || !docUrl}
            >
              {docLoading ? "Adding..." : "Add Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
