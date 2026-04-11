"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SMSButton } from "@/components/dashboard/sms-button";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Upload,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type {
  Renter,
  Booking,
  RenterCommunication,
} from "@/lib/types";

interface RenterDocument {
  id: string;
  document_name: string;
  document_type: "insurance" | "license" | "other";
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
}

const bookingStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const commTypeIcons: Record<string, React.ReactNode> = {
  note: <FileText className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  in_person: <User className="h-4 w-4" />,
};

export default function RenterDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [renter, setRenter] = useState<Renter | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [communications, setCommunications] = useState<RenterCommunication[]>(
    []
  );
  const [documents, setDocuments] = useState<RenterDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Blacklist state
  const [blacklistReason, setBlacklistReason] = useState("");
  const [togglingBlacklist, setTogglingBlacklist] = useState(false);

  // Communication form
  const [commType, setCommType] = useState<string>("note");
  const [commSubject, setCommSubject] = useState("");
  const [commContent, setCommContent] = useState("");
  const [addingComm, setAddingComm] = useState(false);

  // Document form
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<"insurance" | "license" | "other">("insurance");
  const [docUrl, setDocUrl] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase
        .from("renters")
        .select("*")
        .eq("id", id)
        .single();

      if (r) {
        setRenter(r as Renter);
        setBlacklistReason(r.blacklist_reason || "");
      }

      const { data: b } = await supabase
        .from("bookings")
        .select("*, vehicles(make, model, year)")
        .eq("renter_id", id)
        .order("start_date", { ascending: false });

      if (b) setBookings(b as Booking[]);

      const { data: c } = await supabase
        .from("renter_communications")
        .select("*")
        .eq("renter_id", id)
        .order("created_at", { ascending: false });

      if (c) setCommunications(c as RenterCommunication[]);

      // Fetch documents for all bookings of this renter
      if (b && b.length > 0) {
        const bookingIds = (b as Booking[]).map(booking => booking.id);
        const { data: docs } = await supabase
          .from("renter_documents")
          .select("*")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });

        if (docs) setDocuments(docs as RenterDocument[]);
      }

      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function toggleBlacklist() {
    if (!renter) return;
    setTogglingBlacklist(true);

    const newStatus = !renter.is_blacklisted;
    const res = await fetch(`/api/renters/${renter.id}/blacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_blacklisted: newStatus,
        blacklist_reason: newStatus ? blacklistReason : null,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setRenter(updated);
      if (!newStatus) setBlacklistReason("");
    }

    setTogglingBlacklist(false);
  }

  async function addCommunication(e: React.FormEvent) {
    e.preventDefault();
    if (!commContent.trim()) return;
    setAddingComm(true);

    const res = await fetch(`/api/renters/${id}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: commType,
        subject: commSubject.trim() || null,
        content: commContent.trim(),
      }),
    });

    if (res.ok) {
      const newComm = await res.json();
      setCommunications((prev) => [newComm, ...prev]);
      setCommSubject("");
      setCommContent("");
    }

    setAddingComm(false);
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docName.trim() || !bookings.length) return;
    setAddingDoc(true);

    try {
      const res = await fetch(`/api/renters/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: docName.trim(),
          document_type: docType,
          file_url: docUrl.trim() || null,
          expiry_date: docExpiry || null,
          booking_id: bookings[0].id, // Link to first booking
        }),
      });

      if (res.ok) {
        const newDoc = await res.json();
        setDocuments((prev) => [newDoc, ...prev]);
        setDocName("");
        setDocUrl("");
        setDocExpiry("");
        setDocType("insurance");
      }
    } catch (err) {
      console.error("Failed to add document:", err);
    }

    setAddingDoc(false);
  }

  async function deleteDocument(docId: string) {
    try {
      const res = await fetch(`/api/renters/${id}/documents/${docId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter(d => d.id !== docId));
        setDeleteDocId(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  }

  function getExpiryStatus(expiryDate: string | null) {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: "expired", label: "Expired", color: "bg-red-500/10 text-red-600", icon: AlertCircle };
    } else if (daysUntilExpiry <= 30) {
      return { status: "expiring", label: `Expires in ${daysUntilExpiry}d`, color: "bg-yellow-500/10 text-yellow-600", icon: AlertTriangle };
    } else {
      return { status: "valid", label: "Valid", color: "bg-green-500/10 text-green-600", icon: CheckCircle };
    }
  }

  if (loading)
    return <div className="text-muted-foreground">Loading...</div>;
  if (!renter)
    return <div className="text-muted-foreground">Renter not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/renters">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{renter.name}</h1>
          <p className="text-muted-foreground">Renter profile</p>
        </div>
        <div className="flex items-center gap-2">
          {renter.phone && (
            <SMSButton phone={renter.phone} renterName={renter.name} />
          )}
          {renter.is_blacklisted && (
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-500 border-red-500/20"
            >
              Blacklisted
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="history">Rental History</TabsTrigger>
          <TabsTrigger value="communications">Communication Log</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{renter.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{renter.email || "---"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{renter.phone || "---"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {renter.date_of_birth || "---"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {[renter.address, renter.city, renter.state, renter.zip]
                      .filter(Boolean)
                      .join(", ") || "---"}
                  </p>
                </div>
                {renter.notes && (
                  <div>
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{renter.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Driver&apos;s License</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">License Number</p>
                  <p className="font-medium">
                    {renter.drivers_license_number || "---"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expiry Date</p>
                  <p className="font-medium">
                    {renter.drivers_license_expiry || "---"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-sm ring-0 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {renter.is_blacklisted ? (
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  )}
                  Blacklist Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renter.is_blacklisted ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">
                      This renter is currently blacklisted.
                    </p>
                    {renter.blacklist_reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Reason: {renter.blacklist_reason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="blacklist-reason">
                        Reason for blacklisting
                      </Label>
                      <Input
                        id="blacklist-reason"
                        placeholder="Enter reason..."
                        value={blacklistReason}
                        onChange={(e) => setBlacklistReason(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <Button
                  variant={renter.is_blacklisted ? "outline" : "destructive"}
                  onClick={toggleBlacklist}
                  disabled={
                    togglingBlacklist ||
                    (!renter.is_blacklisted && !blacklistReason.trim())
                  }
                >
                  {togglingBlacklist
                    ? "Updating..."
                    : renter.is_blacklisted
                    ? "Remove from Blacklist"
                    : "Blacklist Renter"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RENTAL HISTORY TAB */}
        <TabsContent value="history">
          {bookings.length === 0 ? (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">No rental history</h3>
                <p className="text-sm text-muted-foreground">
                  This renter has no bookings yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking: any) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.vehicles
                            ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
                            : "No vehicle"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {booking.start_date} - {booking.end_date}
                        </TableCell>
                        <TableCell>{booking.duration_days} days</TableCell>
                        <TableCell className="font-medium">
                          ${Number(booking.total_price).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              bookingStatusColors[booking.status] || ""
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
                          >
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
        </TabsContent>

        {/* COMMUNICATION LOG TAB */}
        <TabsContent value="communications">
          <div className="space-y-6">
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Add Note</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addCommunication} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={commType}
                        onValueChange={(val) => { if (val) setCommType(val); }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="call">Phone Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="in_person">
                            In Person
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comm-subject">Subject</Label>
                      <Input
                        id="comm-subject"
                        placeholder="Optional subject"
                        value={commSubject}
                        onChange={(e) => setCommSubject(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comm-content">Content</Label>
                    <Textarea
                      id="comm-content"
                      placeholder="Write your note..."
                      value={commContent}
                      onChange={(e) => setCommContent(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={addingComm || !commContent.trim()}
                    style={{ backgroundColor: "#2EBD6B" }}
                  >
                    {addingComm ? "Adding..." : "Add Entry"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {communications.length === 0 ? (
              <Card className="border-0 bg-white shadow-sm ring-0">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">
                    No communication logs
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add your first note above.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {communications.map((comm) => (
                  <Card
                    key={comm.id}
                    className="border-0 bg-white shadow-sm ring-0"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                          {commTypeIcons[comm.type] || (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {comm.type}
                            </Badge>
                            {comm.subject && (
                              <span className="font-medium text-sm">
                                {comm.subject}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {comm.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {comm.created_by && `${comm.created_by} -- `}
                            {new Date(comm.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <div className="space-y-6">
            {/* Add Document Form */}
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Add Insurance & Document</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addDocument} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-name">Document Name *</Label>
                      <Input
                        id="doc-name"
                        placeholder="e.g., Auto Insurance Policy"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-type">Type</Label>
                      <Select
                        value={docType}
                        onValueChange={(val) => { if (val) setDocType(val as "insurance" | "license" | "other"); }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="license">License</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-url">Document URL</Label>
                      <Input
                        id="doc-url"
                        placeholder="Paste Google Drive or Dropbox link"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-expiry">Expiry Date</Label>
                      <Input
                        id="doc-expiry"
                        type="date"
                        value={docExpiry}
                        onChange={(e) => setDocExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={addingDoc || !docName.trim() || !bookings.length}
                    style={{ backgroundColor: "#2EBD6B" }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {addingDoc ? "Adding..." : "Add Document"}
                  </Button>
                  {!bookings.length && (
                    <p className="text-sm text-muted-foreground">No bookings found. Documents are linked to bookings.</p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Documents List */}
            {documents.length === 0 ? (
              <Card className="border-0 bg-white shadow-sm ring-0">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No documents</h3>
                  <p className="text-sm text-muted-foreground">
                    Add documents above to track insurance and other renter files.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const expiryStatus = getExpiryStatus(doc.expiry_date);
                  const StatusIcon = expiryStatus?.icon;

                  return (
                    <Card
                      key={doc.id}
                      className="border-0 bg-white shadow-sm ring-0"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-semibold text-sm">
                                {doc.document_name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {doc.document_type}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground">
                              {doc.expiry_date && (
                                <div className="flex items-center gap-2">
                                  {expiryStatus && StatusIcon && (
                                    <>
                                      <StatusIcon className="h-4 w-4" />
                                      <span className={`font-medium ${expiryStatus.color}`}>
                                        {expiryStatus.label}
                                      </span>
                                      <span>({doc.expiry_date})</span>
                                    </>
                                  )}
                                </div>
                              )}

                              {doc.file_url && (
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#2EBD6B] hover:underline text-xs"
                                >
                                  View Document →
                                </a>
                              )}

                              <p className="text-xs">
                                Added {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="p-2 hover:bg-red-50 rounded text-red-500 hover:text-red-600"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
