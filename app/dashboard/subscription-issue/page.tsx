export default function SubscriptionIssuePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#2EBD6B]" />
          <span className="text-xl font-bold tracking-tight text-[#080812]">PCR Booking</span>
        </div>
        <h1 className="text-2xl font-bold text-[#080812] mb-3">Subscription Required</h1>
        <p className="text-gray-500 mb-6">
          Your account doesn&apos;t have an active subscription. All plans include a 14-day free trial
          with your card on file — you won&apos;t be charged until the trial ends.
        </p>
        <div className="space-y-3">
          <a
            href="/onboarding/plan"
            className="block w-full bg-[#2EBD6B] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#27a85f] transition-colors"
          >
            Start Your 14-Day Free Trial
          </a>
          <a
            href="/auth/login"
            className="block w-full bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign in to a Different Account
          </a>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Already subscribed but seeing this?{" "}
          <a href="/auth/login" className="text-[#2EBD6B] hover:underline">
            Try logging in again
          </a>{" "}
          or email{" "}
          <a href="mailto:support@pcrbooking.com" className="text-[#2EBD6B] hover:underline">
            support@pcrbooking.com
          </a>
        </p>
      </div>
    </div>
  );
}
