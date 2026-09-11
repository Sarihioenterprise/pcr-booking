"use client";

export function PrintButton() {
  return (
    <div className="mb-6 flex items-center gap-3 print:hidden" id="invoice-print-btn">
      <button
        onClick={() => window.print()}
        className="px-5 py-2 rounded-lg bg-[#2EBD6B] text-white text-sm font-medium hover:bg-[#27a85e] transition-colors"
      >
        Print / Save PDF
      </button>
      <span className="text-sm text-gray-500">Choose &ldquo;Save as PDF&rdquo; in the print dialog to download</span>
    </div>
  );
}
