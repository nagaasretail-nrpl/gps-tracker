import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild data-testid="button-back-privacy">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">Nagaas Retail Private Limited · Last updated: January 2025</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <Section title="1. Introduction">
            <p>
              <strong className="text-foreground">Nagaas Retail Private Limited</strong> ("Company", "we", "us", "our") operates the GPS Fleet Tracker platform accessible at <strong className="text-foreground">nistagps.com</strong>. We are committed to protecting your personal information and your right to privacy.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. It applies to all users including fleet operators, administrators, drivers, and sub-users. By using the Service, you consent to the practices described in this Policy.
            </p>
            <p>
              This Policy is compliant with the <strong className="text-foreground">Information Technology Act, 2000</strong> and the <strong className="text-foreground">Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> of India.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong className="text-foreground">A. Personal Information</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Identity:</strong> Name, as provided during registration</li>
              <li><strong className="text-foreground">Contact:</strong> Mobile phone number (used as login identifier)</li>
              <li><strong className="text-foreground">Account credentials:</strong> Password (stored as a bcrypt hash — never in plain text)</li>
              <li><strong className="text-foreground">Profile:</strong> Department, avatar, preferences (if provided)</li>
            </ul>
            <p><strong className="text-foreground">B. Vehicle and Location Data</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>GPS coordinates (latitude, longitude, altitude) of registered vehicles</li>
              <li>Speed, heading, and accuracy readings from GPS devices</li>
              <li>Trip history, distance travelled, idle time, and stop records</li>
              <li>Geofence entry/exit events and speed violation alerts</li>
              <li>Device IMEI numbers and SIM phone numbers on GPS trackers</li>
            </ul>
            <p><strong className="text-foreground">C. Payment Information</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Payment transactions are processed by <strong className="text-foreground">Razorpay</strong>. We do not store card numbers, bank account details, or UPI credentials on our servers</li>
              <li>We store only the Razorpay Order ID and Payment ID for transaction records</li>
              <li>Subscription renewal amounts and renewal dates are stored for account management</li>
            </ul>
            <p><strong className="text-foreground">D. Usage and Technical Data</strong></p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Browser type, operating system, and IP address (in server logs)</li>
              <li>Session cookies required for authentication (HttpOnly, not accessible to JavaScript)</li>
              <li>API request logs for diagnostics and security</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Provide, operate, and maintain the GPS Fleet Tracker Service</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Process subscription payments and renewals via Razorpay</li>
              <li>Display real-time vehicle locations and fleet analytics on your dashboard</li>
              <li>Generate trip reports, geofence alerts, and speed violation notifications</li>
              <li>Manage user roles, permissions, and allowed menu access</li>
              <li>Communicate service updates, security alerts, or policy changes</li>
              <li>Comply with legal obligations and enforce our Terms and Conditions</li>
              <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
            </ul>
            <p>
              We do <strong className="text-foreground">not</strong> use your data for targeted advertising, profiling, or sale to third parties.
            </p>
          </Section>

          <Section title="4. Third-Party Services and Data Sharing">
            <p>We share your data with the following third parties solely to provide the Service:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong className="text-foreground">Razorpay Payment Gateway</strong> — Payment processing. Razorpay receives your name, phone number, and payment amount during checkout. Razorpay's Privacy Policy applies to data processed by them: <span className="break-all">https://razorpay.com/privacy/</span>
              </li>
              <li>
                <strong className="text-foreground">Google Maps Platform</strong> — Map rendering for vehicle location display (if configured). Google may process IP address and map tile requests. Google's Privacy Policy applies: <span className="break-all">https://policies.google.com/privacy</span>
              </li>
              <li>
                <strong className="text-foreground">Neon (PostgreSQL Database)</strong> — Our database infrastructure provider. Data is stored in encrypted databases. Neon acts as a data processor under our instructions.
              </li>
            </ul>
            <p>
              We may disclose your information if required by law, court order, or government authority, or to protect the rights, property, or safety of Nagaas Retail Private Limited, our users, or others.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your data for the following periods:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Account data:</strong> Retained for the duration of your account plus 90 days after closure</li>
              <li><strong className="text-foreground">Vehicle location history:</strong> Retained for up to 12 months on active accounts</li>
              <li><strong className="text-foreground">Payment records:</strong> Retained for 7 years as required by Indian financial regulations</li>
              <li><strong className="text-foreground">Server/API logs:</strong> Retained for 30 days for security and diagnostic purposes</li>
            </ul>
            <p>
              After the retention period expires, data is securely deleted or anonymised.
            </p>
          </Section>

          <Section title="6. Cookies and Sessions">
            <p>
              We use <strong className="text-foreground">session cookies</strong> to authenticate your login. These cookies are:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>HttpOnly — not accessible to client-side JavaScript</li>
              <li>Secure — transmitted only over HTTPS in production</li>
              <li>Session-scoped — deleted when you log out or close your browser</li>
            </ul>
            <p>
              We do not use tracking cookies, third-party advertising cookies, or persistent cookies for analytics. We do not use Google Analytics or similar tracking tools.
            </p>
          </Section>

          <Section title="7. Data Security">
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Passwords are hashed using <strong className="text-foreground">bcrypt</strong> — never stored in plain text</li>
              <li>Database connections use TLS encryption</li>
              <li>Payment processing is handled entirely by Razorpay (PCI-DSS compliant)</li>
              <li>Session management uses cryptographically signed session tokens</li>
              <li>HMAC-SHA256 signature verification for payment callbacks</li>
            </ul>
            <p>
              While we take every reasonable precaution, no internet-based system is 100% secure. You use the Service at your own risk and are responsible for maintaining the security of your account credentials.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>Under applicable Indian law, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and associated personal data (subject to legal retention requirements)</li>
              <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format</li>
              <li><strong className="text-foreground">Objection:</strong> Object to processing of your data in certain circumstances</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at <strong className="text-foreground">privacy@nagaasretail.com</strong>. We will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              The Service is not directed to persons under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact us immediately and we will take steps to delete such information.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy periodically. When we make significant changes, we will update the "Last updated" date at the top of this page and notify active users via in-app notice or email where practical. Continued use of the Service after changes constitutes your acceptance of the revised Policy.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>For privacy-related inquiries, data requests, or complaints:</p>
            <div className="pl-2 space-y-1">
              <p><strong className="text-foreground">Nagaas Retail Private Limited — Privacy Officer</strong></p>
              <p>Tamil Nadu, India</p>
              <p>Email: <strong className="text-foreground">privacy@nagaasretail.com</strong></p>
              <p>Support: <strong className="text-foreground">support@nagaasretail.com</strong></p>
              <p>Website: <strong className="text-foreground">nistagps.com</strong></p>
            </div>
          </Section>

          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="font-medium text-foreground mb-1">Related Documents</p>
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              <Link href="/terms" className="text-primary underline underline-offset-2">Terms and Conditions</Link>
            </div>
          </div>
        </div>

        <Separator />

        <p className="text-center text-xs text-muted-foreground pb-4">
          © 2025 Nagaas Retail Private Limited. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
