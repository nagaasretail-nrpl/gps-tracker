import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild data-testid="button-back-terms">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Terms and Conditions</h1>
              <p className="text-xs text-muted-foreground">NagaasRetail Pvt Ltd · Last updated: January 2025</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using the GPS Fleet Tracker service ("Service") provided by <strong className="text-foreground">NagaasRetail Pvt Ltd</strong> ("Company", "we", "us", or "our"), you ("User", "you") agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you must not use the Service.
            </p>
            <p>
              These Terms apply to all users of the Service, including fleet operators, administrators, and sub-users. By creating an account or making a payment, you confirm that you have read, understood, and accepted these Terms.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              NagaasRetail Pvt Ltd provides a cloud-based GPS fleet tracking and management platform ("GPS Fleet Tracker") accessible via the web application hosted at <strong className="text-foreground">nistagps.com</strong>. The Service includes:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Real-time vehicle location tracking using GT06N GPS devices</li>
              <li>Fleet dashboard with live status, trip history, and reports</li>
              <li>Geofencing, speed monitoring, and event alerts</li>
              <li>User and vehicle management for fleet administrators</li>
              <li>Subscription-based access with annual renewal</li>
            </ul>
            <p>
              The Service is provided on a software-as-a-service (SaaS) basis. Hardware devices (GPS trackers) are not included in the subscription and must be procured separately.
            </p>
          </Section>

          <Section title="3. User Accounts and Obligations">
            <p>
              To use the Service, you must register an account with a valid mobile number and password. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring that all information you provide is accurate and current</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
            <p>
              You must not share your account with others, create accounts using false information, or use the Service for any unlawful purpose. We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </Section>

          <Section title="4. Subscription and Payment Terms">
            <p>
              Access to the Service requires an active subscription. Subscriptions are billed on an annual basis in Indian Rupees (INR). The subscription fee is set by NagaasRetail Pvt Ltd and may be updated from time to time with reasonable notice.
            </p>
            <p><strong className="text-foreground">Payment Processing:</strong> All payments are processed securely through Razorpay Payment Gateway. By making a payment, you also agree to Razorpay's Terms of Service and Privacy Policy.</p>
            <p><strong className="text-foreground">Subscription Expiry:</strong> Upon expiry of your subscription, access to the Service will be suspended. You may renew your subscription at any time via the renewal payment page.</p>
            <p><strong className="text-foreground">Refund Policy:</strong> Subscription fees are non-refundable once the subscription period has commenced. In cases of technical failure attributable to NagaasRetail Pvt Ltd that results in extended service unavailability (more than 72 continuous hours), a pro-rata credit may be considered at our sole discretion. To request a refund consideration, contact us at <strong className="text-foreground">support@nagaasretail.com</strong>.</p>
            <p><strong className="text-foreground">Pricing Changes:</strong> We reserve the right to change subscription prices. Any price changes will be communicated at least 30 days in advance and will apply from the next renewal cycle.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Use the Service for surveillance of individuals without their knowledge or consent in violation of applicable law</li>
              <li>Reverse-engineer, decompile, or attempt to extract source code from the Service</li>
              <li>Use the Service to transmit malicious code, spam, or harmful content</li>
              <li>Resell or sub-license the Service without prior written consent from NagaasRetail Pvt Ltd</li>
              <li>Exceed reasonable usage limits or attempt to overload our systems</li>
              <li>Violate any applicable Indian or international law while using the Service</li>
            </ul>
          </Section>

          <Section title="6. Data and Privacy">
            <p>
              Your use of the Service is also governed by our <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and processing of data as described in our Privacy Policy.
            </p>
            <p>
              Vehicle location data, user activity logs, and other data generated through the Service are stored securely. You retain ownership of your fleet and operational data. We do not sell your data to third parties.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              All intellectual property rights in the Service — including software, design, trademarks, logos, and content — belong to NagaasRetail Pvt Ltd or its licensors. These Terms do not grant you any rights to our intellectual property except the limited right to use the Service as described herein.
            </p>
            <p>
              "NagaasRetail", "GPS Fleet Tracker", and related names and logos are trademarks of NagaasRetail Pvt Ltd. You must not use these marks without our prior written permission.
            </p>
          </Section>

          <Section title="8. Service Availability and Modifications">
            <p>
              We aim to provide the Service 24/7, but do not guarantee uninterrupted availability. Scheduled maintenance will be communicated in advance where possible. We reserve the right to modify, suspend, or discontinue the Service (or any feature) at any time, with or without notice.
            </p>
            <p>
              We are not liable for any loss or damage caused by temporary unavailability of the Service due to factors beyond our reasonable control, including internet outages, third-party service failures, or force majeure events.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, NagaasRetail Pvt Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or business opportunities, arising from your use of the Service.
            </p>
            <p>
              Our total aggregate liability to you for any claim arising out of or related to these Terms or the Service shall not exceed the subscription fees paid by you in the three (3) months immediately preceding the event giving rise to the claim.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              We may suspend or terminate your access to the Service at any time if you breach these Terms, fail to renew your subscription, or engage in fraudulent or illegal activity. Upon termination, your right to use the Service ceases immediately.
            </p>
            <p>
              You may cancel your account at any time by contacting us. Cancellation will take effect at the end of the current subscription period. No refunds are issued for unused periods.
            </p>
          </Section>

          <Section title="11. Governing Law and Dispute Resolution">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts in <strong className="text-foreground">Tamil Nadu, India</strong>.
            </p>
            <p>
              Before initiating legal proceedings, you agree to attempt to resolve any dispute informally by contacting us at <strong className="text-foreground">legal@nagaasretail.com</strong>. We will endeavour to resolve disputes within 30 days of receipt.
            </p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>
              We may update these Terms from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of the Service after changes take effect constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.
            </p>
          </Section>

          <Section title="13. Contact Us">
            <p>If you have any questions about these Terms, please contact:</p>
            <div className="pl-2 space-y-1">
              <p><strong className="text-foreground">NagaasRetail Pvt Ltd</strong></p>
              <p>Tamil Nadu, India</p>
              <p>Email: <strong className="text-foreground">support@nagaasretail.com</strong></p>
              <p>Website: <strong className="text-foreground">nistagps.com</strong></p>
            </div>
          </Section>
        </div>

        <Separator />

        <p className="text-center text-xs text-muted-foreground pb-4">
          © 2025 NagaasRetail Pvt Ltd. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
