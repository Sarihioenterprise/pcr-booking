"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, FileText, RotateCcw } from "lucide-react";
import Link from "next/link";

interface AgreementData {
  id: string;
  content: string;
  status: string;
  renter_signature: string | null;
  signed_at: string | null;
}

interface BookingData {
  id: string;
  renter_name: string;
  rental_agreements?: AgreementData[];
}

export default function AgreementSignPage() {
  const { bookingId } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);

  const sigPadRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/portal/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
        const agr = Array.isArray(data.rental_agreements)
          ? data.rental_agreements[0]
          : data.rental_agreements;
        if (agr) {
          setAgreement(agr);
          if (agr.status === "signed") {
            setSigned(true);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [bookingId]);

  function clearCanvas() {
    sigPadRef.current?.clear();
    setCanvasEmpty(true);
  }

  function handleCanvasEnd() {
    setCanvasEmpty(sigPadRef.current?.isEmpty() ?? true);
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!signature.trim() || !agreed) return;
    setSubmitting(true);

    // Capture canvas PNG as base64 (empty string if pad unused)
    let signaturePng = "";
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      signaturePng = sigPadRef.current
        .getTrimmedCanvas()
        .toDataURL("image/png");
    }

    const res = await fetch(`/api/portal/${bookingId}/agreement/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        renter_signature: signature.trim(),
        signature_png_b64: signaturePng || undefined,
      }),
    });

    if (res.ok) {
      setSigned(true);
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Loading agreement...
      </div>
    );
  }

  if (!booking || !agreement) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No Agreement Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No rental agreement has been generated for this booking yet.
            </p>
            <Link href={`/portal/${bookingId}`}>
              <Button variant="outline">Back to Booking</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Agreement Signed</h2>
            <p className="text-muted-foreground text-center mb-6">
              Thank you for signing the rental agreement.
            </p>
            <Link href={`/portal/${bookingId}`}>
              <Button variant="outline">Back to Booking</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/portal/${bookingId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Rental Agreement</h1>
          <p className="text-muted-foreground">
            Review and sign your rental agreement
          </p>
        </div>
      </div>

      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle>Agreement Content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-slate-50 rounded-lg p-6 whitespace-pre-wrap font-sans leading-relaxed max-h-[400px] overflow-y-auto border">
            {agreement.content}
          </pre>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle>Sign Agreement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSign} className="space-y-6">
            {/* Typed name */}
            <div className="space-y-2">
              <Label htmlFor="signature">
                Type your full name as your signature
              </Label>
              <Input
                id="signature"
                placeholder={booking.renter_name}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="text-lg"
                required
              />
              {signature && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Typed Signature Preview
                  </p>
                  <p
                    className="text-2xl text-slate-700 italic"
                    style={{ fontFamily: "cursive" }}
                  >
                    {signature}
                  </p>
                </div>
              )}
            </div>

            {/* Canvas signature pad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Draw Your Signature (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  className="text-slate-500 hover:text-slate-700 gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
              <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden touch-none">
                {canvasEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <p className="text-slate-400 text-sm">Sign here ✍️</p>
                  </div>
                )}
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="#1e293b"
                  canvasProps={{
                    className: "w-full",
                    style: { height: 160, touchAction: "none" },
                  }}
                  onEnd={handleCanvasEnd}
                  backgroundColor="rgb(255,255,255)"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use your finger or stylus to draw your signature above.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="agree" className="text-sm font-normal">
                I have read and agree to the terms and conditions outlined
                in this rental agreement. I understand that by typing my
                name above, I am providing a legally binding electronic
                signature.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={submitting || !signature.trim() || !agreed}
              className="w-full"
              style={{ backgroundColor: "#2EBD6B" }}
            >
              {submitting ? "Signing..." : "Sign Agreement"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
