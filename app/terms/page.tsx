export const metadata = {
  title: "Terms of Service | PCR Booking",
  description: "Terms of Service for PCR Booking",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mb-10 text-sm text-gray-500">Last updated: March 31, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p>By accessing or using PCR Booking ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including rental operators and their customers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
            <p>PCR Booking is a software platform that enables private vehicle rental operators to manage bookings, fleet, payments, and customer relationships. PCR Booking is a tools provider only — we are not a party to any rental transaction between operators and their renters.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Accounts and Registration</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You are responsible for all activity that occurs under your account. You must be at least 18 years old to create an account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Subscription and Billing</h2>
            <p>PCR Booking offers paid subscription plans (Growth, Pro, Scale). Subscriptions are billed monthly in advance. You may cancel at any time; cancellation takes effect at the end of the current billing period. No refunds are issued for partial months. We reserve the right to change pricing with 30 days' notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Operator Responsibilities</h2>
            <p>As an operator using PCR Booking, you are solely responsible for:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Complying with all applicable local, state, and federal laws governing vehicle rentals</li>
              <li>Verifying renter identity, licenses, and eligibility</li>
              <li>Maintaining adequate insurance on all vehicles in your fleet</li>
              <li>The accuracy of your rental agreements and pricing</li>
              <li>All disputes, damages, or claims arising from your rental transactions</li>
            </ul>
            <p className="mt-3">PCR Booking is not liable for any losses, disputes, or legal issues arising from rental transactions conducted through the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Violate any law or regulation</li>
              <li>Transmit fraudulent, misleading, or harmful content</li>
              <li>Attempt to gain unauthorized access to the platform or other accounts</li>
              <li>Reverse engineer, copy, or resell the Service</li>
              <li>Use the Service for any purpose other than managing a legitimate vehicle rental business</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Payment Processing</h2>
            <p>Payment processing is handled by Stripe. By using payment features, you also agree to Stripe's Terms of Service. PCR Booking does not store full card numbers or banking credentials. Operators using the payment collection feature are responsible for accurate tax collection and reporting in their jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Intellectual Property</h2>
            <p>All content, features, and functionality of PCR Booking are owned by PCR Leads LLC and protected by applicable intellectual property laws. You retain ownership of all data you upload to the platform (customer records, vehicle info, etc.). You grant PCR Booking a limited license to process and store that data solely to provide the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Disclaimers</h2>
            <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. PCR BOOKING DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. WE DO NOT WARRANT THE ACCURACY OR COMPLETENESS OF ANY INFORMATION PROVIDED THROUGH THE SERVICE.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, PCR BOOKING SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 3 MONTHS PRECEDING THE CLAIM.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these Terms. You may cancel your account at any time from your account settings. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination, after which it may be deleted.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Georgia, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Georgia.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">13. Changes to Terms</h2>
            <p>We may update these Terms at any time. We will notify you of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">14. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:support@pcrbooking.com" className="text-[#2EBD6B] underline">support@pcrbooking.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 border-t pt-6 text-sm text-gray-500">
          <a href="/" className="text-[#2EBD6B] hover:underline">← Back to PCR Booking</a>
          <span className="mx-3">·</span>
          <a href="/privacy" className="text-[#2EBD6B] hover:underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
