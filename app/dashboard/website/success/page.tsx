import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function WebsiteSuccessPage() {
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <CheckCircle className="h-16 w-16 text-[#2EBD6B] mx-auto mb-5" />
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h1>
      <p className="text-white/60 mb-8">
        Payment confirmed. We&apos;ll reach out within 24 hours to collect your details
        and get your website built. It will be live within 24–72 hours.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-lg bg-[#2EBD6B] hover:bg-[#27a85e] text-white font-semibold px-6 py-2.5 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
