import Link from "next/link"

export const metadata = {
  title: "Terms of Service | PCR Booking",
  description: "Terms of Service for PCR Booking",
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: March 31, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using PCR Booking ("the Service"), operated by Sarihio Enterprise LLC ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              PCR Booking is a software-as-a-service (SaaS) platform that provides fleet management, booking management, payment processing, and related tools for private vehicle rental operators. The Service enables operators to manage their own rental businesses independently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Eligibility</h2>
            <p className="text-gray-600 leading-relaxed">
              You must be at least 18 years of age and capable of entering into a binding contract to use this Service. By using the Service, you represent and warrant that you meet these requirements and that all information you provide is accurate and complete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Account Registration</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              To access the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
              <li>Ensuring all account information remains accurate and up to date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Subscription and Payment</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              PCR Booking is offered on a subscription basis. By subscribing, you agree to the following:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Subscription fees are billed monthly in advance</li>
              <li>All fees are non-refundable except as expressly set forth in these Terms</li>
              <li>We reserve the right to change pricing with 30 days written notice</li>
              <li>Failure to pay may result in suspension or termination of your account</li>
              <li>Payments are processed securely through Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Engage in fraudulent, deceptive, or misleading practices</li>
              <li>Collect or store personal data about renters without their consent</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Use the Service for any purpose other than legitimate vehicle rental operations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Data and Content</h2>
            <p className="text-gray-600 leading-relaxed">
              You retain ownership of all data and content you submit to the Service, including renter information, vehicle data, and booking records. By using the Service, you grant us a limited license to store, process, and display your data solely for the purpose of providing the Service to you. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Operator Responsibility</h2>
            <p className="text-gray-600 leading-relaxed">
              You, as the operator, are solely responsible for your rental business operations, including but not limited to: verifying renter identities and licenses, maintaining proper insurance coverage on your vehicles, complying with all local, state, and federal laws governing vehicle rental operations, the accuracy of rental agreements you create, and any disputes between you and your renters.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              PCR Booking is a software tool only. We are not a party to any rental transaction between you and your renters.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Affiliate Program</h2>
            <p className="text-gray-600 leading-relaxed">
              PCR Booking offers an affiliate/referral program. Commissions are paid at 30% of referred subscription revenue for up to 12 months per referred customer. We reserve the right to modify or terminate the affiliate program at any time with 30 days notice. Fraudulent referrals will result in immediate account termination and forfeiture of commissions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service and its original content, features, and functionality are owned by Sarihio Enterprise LLC and are protected by applicable intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Disclaimer of Warranties</h2>
            <p className="text-gray-600 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SARIHIO ENTERPRISE LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE THREE MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              You may cancel your account at any time from your account settings. We reserve the right to suspend or terminate your account for violation of these Terms. Upon termination, your right to use the Service ceases immediately. You may export your data within 30 days of termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Henry County, Georgia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these Terms from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of the Service after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">16. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about these Terms, contact us at:
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
