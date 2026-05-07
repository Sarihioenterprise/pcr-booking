export default function SubscriptionIssuePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#2EBD6B]" />
          <span className="text-xl font-bold tracking-tight text-[#080812]">PCR Booking</span>
        </div>
        <h1 className="text-2xl font-bold text-[#080812] mb-3">Subscription Not Linked Yet</h1>
        <p className="text-gray-500 mb-6">
          Your payment was received but your subscription hasn&apos;t linked to your account yet. This usually resolves within 60 seconds. Please try logging in again.
        </p>
        <a
          href="/auth/login"
          className="inline-block bg-[#2EBD6B] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#27a85f] transition-colors"
        >
          Try Logging In Again
        </a>
        <p className="mt-6 text-xs text-gray-400">
          Still having trouble? Email us at{" "}
          <a href="mailto:support@pcrbooking.com" className="text-[#2EBD6B] hover:underline">
            support@pcrbooking.com
          </a>
        </p>
      </div>
    </div>
  );
}
