import Link from "next/link"

export const metadata = {
  title: "Privacy Policy | PCR Booking",
  description: "Privacy Policy for PCR Booking",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2EBD6B]">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="font-semibold text-gray-900">PCR Booking</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Back to Home</Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: March 31, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Sarihio Enterprise LLC ("we," "us," or "our") operates PCR Booking at pcrbooking.com. This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our Service. By using PCR Booking, you consent to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Account information: name, email address, phone number, business name</li>
              <li>Billing information: processed and stored by Stripe (we do not store card numbers)</li>
              <li>Business data: vehicle information, booking records, renter information you enter</li>
              <li>Communications: messages you send us via support channels</li>
            </ul>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Log data: IP address, browser type, pages visited, time spent on pages</li>
              <li>Device information: device type, operating system</li>
              <li>Cookies and similar tracking technologies for session management and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process payments and manage your subscription</li>
              <li>Send transactional emails (booking confirmations, receipts, account alerts)</li>
              <li>Respond to your support requests</li>
              <li>Improve and develop the Service</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Renter Data</h2>
            <p className="text-gray-600 leading-relaxed">
              As an operator using PCR Booking, you collect and manage data about your renters (their names, phone numbers, emails, driver's license information, etc.). You are the data controller for your renters' information. We process this data on your behalf as a data processor. You are responsible for obtaining appropriate consent from your renters and complying with applicable privacy laws regarding their data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Information Sharing</h2>
            <p className="text-gray-600 leading-relaxed mb-3">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Stripe:</strong> Payment processing. Stripe's privacy policy governs their use of your billing data.</li>
              <li><strong>Supabase:</strong> Database infrastructure for storing your account and business data.</li>
              <li><strong>Vercel:</strong> Hosting infrastructure.</li>
              <li><strong>Twilio:</strong> SMS notifications (if enabled). Only phone numbers you provide are shared.</li>
              <li><strong>Law enforcement:</strong> When required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit (TLS/SSL), row-level security on our database, and secure authentication. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your account data for as long as your account is active. If you cancel your account, we will retain your data for 30 days during which you may export it. After 30 days, your data will be permanently deleted from our systems, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use cookies and similar technologies for authentication (keeping you logged in), session management, and basic analytics. You can control cookies through your browser settings. Disabling cookies may affect the functionality of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Export:</strong> Download your data in a portable format from your account settings</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              To exercise these rights, contact us at support@pcrbooking.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Third-Party Links</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before the changes take effect. Continued use of the Service after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related questions or requests, contact us at:
            </p>
            <div className="mt-3 text-gray-600">
              <p>Sarihio Enterprise LLC</p>
              <p>Locust Grove, Georgia</p>
              <p>Email: support@pcrbooking.com</p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-6 mt-12">
        <div className="mx-auto max-w-4xl flex items-center justify-between text-sm text-gray-500">
          <span>© 2026 Sarihio Enterprise LLC. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
