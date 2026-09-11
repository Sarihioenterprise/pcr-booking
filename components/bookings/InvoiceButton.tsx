"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface InvoiceData {
  bookingId: string;
  renterName: string;
  renterEmail: string | null;
  renterPhone: string | null;
  operatorName: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  dailyRate: number;
  totalPrice: number;
  taxAmount: number;
  discountAmount: number;
  depositAmount: number;
  depositStatus: string | null;
  createdAt: string;
}

export function InvoiceButton({ data }: { data: InvoiceData }) {
  const [downloading, setDownloading] = React.useState(false);
  const [dlError, setDlError] = React.useState("");

  async function handleDownload() {
    setDownloading(true);
    setDlError("");
    try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    const colRight = pageW - margin;
    let y = 60;

    // ── Header ──────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(15, 15, 28);
    doc.text("INVOICE", margin, y);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const invoiceDate = new Date(data.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc.text(`Invoice #${data.bookingId.slice(0, 8).toUpperCase()}`, colRight, y - 14, { align: "right" });
    doc.text(`Date: ${invoiceDate}`, colRight, y + 4, { align: "right" });

    y += 30;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, colRight, y);
    y += 28;

    // ── From / Bill To ───────────────────────────────────────────────
    const colMid = pageW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text("FROM", margin, y);
    doc.text("BILL TO", colMid, y);
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(data.operatorName || "Operator", margin, y);
    doc.text(data.renterName, colMid, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    if (data.renterEmail) {
      doc.text(data.renterEmail, colMid, y);
      y += 14;
    }
    if (data.renterPhone) {
      doc.text(data.renterPhone, colMid, y);
      y += 14;
    }

    y += 20;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, colRight, y);
    y += 28;

    // ── Line Items Table ─────────────────────────────────────────────
    const colDesc = margin;
    const colQty = 330;
    const colRate = 410;
    const colAmt = colRight;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("DESCRIPTION", colDesc, y);
    doc.text("QTY", colQty, y, { align: "right" });
    doc.text("RATE", colRate, y, { align: "right" });
    doc.text("AMOUNT", colAmt, y, { align: "right" });
    y += 8;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, colRight, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);

    const vehicleLabel =
      data.vehicleYear && data.vehicleMake && data.vehicleModel
        ? `${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}`
        : "Vehicle Rental";

    const startFmt = new Date(data.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endFmt = new Date(data.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const vehicleDesc = `${vehicleLabel}\n${startFmt} – ${endFmt}`;

    doc.text(vehicleLabel, colDesc, y);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`${startFmt} – ${endFmt}`, colDesc, y + 13);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);

    const lineTotal = data.durationDays * data.dailyRate;
    doc.text(`${data.durationDays}`, colQty, y, { align: "right" });
    doc.text(`$${data.dailyRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, colRate, y, { align: "right" });
    doc.text(`$${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, colAmt, y, { align: "right" });

    y += 34;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, colRight, y);
    y += 20;

    // ── Totals ───────────────────────────────────────────────────────
    const totalsX = 370;

    function totalsRow(label: string, value: string, bold = false) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 11 : 10);
      doc.setTextColor(bold ? 30 : 80, bold ? 30 : 80, bold ? 30 : 80);
      doc.text(label, totalsX, y);
      doc.text(value, colAmt, y, { align: "right" });
      y += 18;
    }

    if (data.discountAmount > 0) {
      totalsRow("Discount", `-$${data.discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    }
    if (data.taxAmount > 0) {
      totalsRow("Tax", `$${data.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    }

    y += 4;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(1);
    doc.line(totalsX, y, colAmt, y);
    y += 14;

    totalsRow("TOTAL DUE", `$${data.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, true);

    if (data.depositAmount > 0) {
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Security Deposit: $${data.depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${data.depositStatus || "pending"})`,
        totalsX,
        y
      );
      y += 14;
    }

    // ── Footer ───────────────────────────────────────────────────────
    const footerY = doc.internal.pageSize.getHeight() - 48;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, colRight, footerY - 10);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(140, 140, 140);
    doc.text("Thank you for your business.", pageW / 2, footerY + 8, { align: "center" });

    // Use explicit blob + anchor approach for reliable cross-browser downloads
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const filename = `invoice-${data.bookingId.slice(0, 8)}.pdf`;

    // Try download via anchor click
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke after a moment
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error("Invoice download error:", err);
      setDlError(err instanceof Error ? err.message : "Download failed — try again");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full">
      <Button variant="outline" onClick={handleDownload} disabled={downloading} className="w-full justify-start">
        <Download className="h-4 w-4 mr-2 text-slate-500" />
        {downloading ? "Generating…" : "Download Invoice"}
      </Button>
      {dlError && <p className="text-xs text-red-500 mt-1">{dlError}</p>}
    </div>
  );
}
