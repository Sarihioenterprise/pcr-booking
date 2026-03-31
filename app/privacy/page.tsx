export const metadata = {
  title: "Privacy Policy | PCR Booking",
  description: "Privacy Policy for PCR Booking",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-10 text-sm text-gray-500">Last updated: March 31, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Overview</h2>
            <p>PCR Booking ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect information when you use PCR Booking (pcrbooking.com). By using our Service, you agree to the practices described here.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
            <h3 className="mt-4 font-semibold text-gray-800">Information you provide directly:</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Account information (name, email, business name, phone number)</li>
              <li>Fleet data (vehicle details, photos, documents)</li>
              <li>Customer/renter information you enter into the platform</li>
              <li>Payment information (processed and stored by Stripe — we never see full card numbers)</li>
              <li>Rental agreements and inspection records</li>
            </ul>
            <h3 className="mt-4 font-semibold text-gray-800">Information collected automatically:</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Usage data (pages visited, features used, session duration)</li>
              <li>Device and browser information</li>
              <li>IP address and approximate location</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails (booking confirmations, receipts, alerts)</li>
              <li>Provide customer support</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
              <li>Send product updates and marketing (you can opt out anytime)</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties. Ever.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Renter Data</h2>
            <p>When operators use PCR Booking to manage their customers, the renter's personal information (name, phone, email, license) is stored on our platform. Operators are the data controllers for their renter data. PCR Booking processes this data only on behalf of the operator to provide the Service. Renters who wish to access, correct, or delete their data should contact the operator directly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Data Sharing</h2>
            <p>We share data only in the following circumstances:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li><strong>Stripe</strong> — for payment processing</li>
              <li><strong>Supabase</strong> — for database hosting and authentication</li>
              <li><strong>Vercel</strong> — for application hosting</li>
              <li><strong>Twilio</strong> — for SMS notifications (if enabled)</li>
              <li><strong>Legal requirements</strong> — if required by law, court order, or government authority</li>
              <li><strong>Business transfers</strong> — in the event of a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="mt-3">All third-party providers are contractually required to protect your data and use it only to provide their respective services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>HTTPS encryption for all data in transit</li>
              <li>Row-level security on all database tables</li>
              <li>Encrypted storage for sensitive credentials</li>
              <li>Regular security reviews</li>
            </ul>
            <p className="mt-3">No system is 100% secure. In the event of a data breach that affects your personal information, we will notify you as required by applicable law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Cookies</h2>
            <p>We use cookies and similar technologies to maintain your session, remember preferences, and analyze usage. You can disable cookies in your browser settings, though some features may not function properly without them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. If you cancel your account, we retain your data for 30 days before deletion, in case you wish to reactivate. You can request immediate deletion by contacting us. Some data may be retained longer if required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:support@pcrbooking.com" className="text-[#2EBD6B] underline">support@pcrbooking.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Children's Privacy</h2>
            <p>PCR Booking is not directed at children under 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, contact us and we will delete it.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact Us</h2>
            <p>For privacy-related questions or requests, contact us at:</p>
            <p className="mt-2"><strong>PCR Leads LLC</strong><br />
            Email: <a href="mailto:support@pcrbooking.com" className="text-[#2EBD6B] underline">support@pcrbooking.com</a><br />
            Website: <a href="https://pcrbooking.com" className="text-[#2EBD6B] underline">pcrbooking.com</a></p>
          </section>

        </div>

        <div className="mt-12 border-t pt-6 text-sm text-gray-500">
          <a href="/" className="text-[#2EBD6B] hover:underline">← Back to PCR Booking</a>
          <span className="mx-3">·</span>
          <a href="/terms" className="text-[#2EBD6B] hover:underline">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
