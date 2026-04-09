import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = [
  {
    title: "Device not connecting",
    items: [
      {
        q: "My device IMEI is not appearing in the system",
        a: "Go to Admin Devices. If your IMEI appears there as 'unknown', it is connecting but hasn't been registered. Copy the IMEI and add it in the Vehicles page. If it doesn't appear at all, check that the device is configured with the correct server IP (34.133.128.65) and port (5023).",
      },
      {
        q: "The device sends data but the vehicle shows as offline",
        a: "Check the device time zone setting. If the device is sending timestamps in UTC+5:30 but your server expects UTC (or vice versa), the system may reject the packet as stale. Also verify that the APN settings on the SIM card are correct for your mobile operator.",
      },
      {
        q: "I get 'payload too short' errors in the logs",
        a: "Some GT06 device variants (such as those sending 0x8a heartbeat packets) send zero-byte GPS payloads intentionally. These are acknowledged correctly and are not a bug — the device is online and the server is responding.",
      },
      {
        q: "My device connects and then immediately disconnects",
        a: "Check that your SIM has a data plan active and that the APN is configured correctly. Also check that the server IP and port are saved persistently (not just temporarily set via SMS). Some devices reset to factory APN on power cycle.",
      },
    ],
  },
  {
    title: "Map and tracking issues",
    items: [
      {
        q: "Vehicles are showing in the wrong location",
        a: "This can happen if the GPS module hasn't acquired satellite fix. The device may transmit its last known position or (0, 0) coordinates. Wait for the vehicle to be in open sky for a few minutes to acquire a fresh fix. Invalid coordinates are automatically filtered out by the server.",
      },
      {
        q: "The map isn't loading or shows a grey background",
        a: "Check your internet connection. If you are behind a corporate firewall, the Google Maps JavaScript API may be blocked. Try from a mobile data connection. If the issue persists, clear your browser cache and reload.",
      },
      {
        q: "Vehicle position is not updating in real time",
        a: "The live map uses a WebSocket connection. If it is disconnected (network interruption, VPN, or firewall), updates will pause. The page will auto-reconnect, but you can also refresh the browser to force a reconnect. Check the vehicle status badge — if it shows 'online', real-time updates are active.",
      },
      {
        q: "History shows gaps or missing points",
        a: "Gaps in history represent periods when the device had no data connection (SIM data exhausted, no signal, or device powered off). Gaps longer than 5 minutes are shown as dotted lines on the history map. This is expected behaviour.",
      },
    ],
  },
  {
    title: "Account and login issues",
    items: [
      {
        q: "I forgot my password",
        a: "Contact your account administrator or the NistaGPS support team to reset your password. Phone-based accounts can be reset by the admin with access to the admin-users panel.",
      },
      {
        q: "My account shows as inactive",
        a: "An inactive account means the subscription has expired or has been suspended. You will be redirected to the renewal page. Pay the outstanding amount via Razorpay to restore access immediately.",
      },
      {
        q: "I can log in but can't see any vehicles",
        a: "Your account may be a sub-user with a restricted vehicle access list. Contact your account administrator to ensure your account has the correct vehicles assigned. Admins can update this in the admin-users panel under 'Allowed Vehicles'.",
      },
      {
        q: "I can't see certain pages in the menu",
        a: "Sub-user accounts can have menus restricted by the admin. The admin can enable additional menus under the user's settings in admin-users.",
      },
    ],
  },
  {
    title: "Reports and alerts",
    items: [
      {
        q: "I'm not receiving push notifications",
        a: "Push notifications require browser permission. Click 'Allow' when the browser asks for notification permission. If you denied it, go to your browser's site settings for nistagps.com and re-enable notifications. Also check that alerts are enabled in Alert Settings.",
      },
      {
        q: "Reports show no data for a date range",
        a: "Ensure the vehicle was active during the selected period. If the device was offline, there will be no location data to report. Also confirm the date range is set to local time, not UTC.",
      },
      {
        q: "Speed alerts are not triggering",
        a: "Verify the speed threshold in Alert Settings is set lower than the vehicle's maximum speed. If the vehicle only briefly exceeds the threshold, the alert fires once and may not repeat until the vehicle drops back below and exceeds again.",
      },
    ],
  },
  {
    title: "Billing and subscription",
    items: [
      {
        q: "My payment went through but the account is still inactive",
        a: "Payment verification can take up to 2 minutes. Refresh the page after a few minutes. If the account is still inactive, contact support with the Razorpay transaction ID so we can manually verify and activate.",
      },
      {
        q: "How do I add more vehicles beyond my plan limit?",
        a: "Upgrade your plan from the Billing section. If you are already on the Fleet (unlimited) plan, contact support to confirm there is no backend limit set on your account.",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full text-left py-4 px-5 flex items-center justify-between gap-3 hover-elevate"
        onClick={() => setOpen(!open)}
        data-testid={`accordion-${q.slice(0, 20).toLowerCase().replace(/\s+/g, '-')}`}
        aria-expanded={open}
      >
        <span className="font-medium text-sm leading-relaxed">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function TroubleshootingPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b bg-card py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Troubleshooting Guide
          </h1>
          <p className="text-muted-foreground text-lg">
            Solutions to the most common issues with devices, maps, accounts, and billing.
          </p>
        </div>
      </section>

      {/* Categories */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
        {CATEGORIES.map((cat) => (
          <section key={cat.title} data-testid={`troubleshoot-category-${cat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <h2 className="text-xl font-bold mb-4">{cat.title}</h2>
            <div className="rounded-md border bg-card overflow-hidden">
              {cat.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Still stuck? */}
      <section className="border-t bg-card py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold mb-3">Still not resolved?</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Check the full documentation for detailed technical guides, or contact our support team with your device IMEI and a description of the issue.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/docs">
              <Button variant="outline" data-testid="troubleshoot-docs-link">
                Browse Documentation
              </Button>
            </Link>
            <Link href="/getting-started">
              <Button data-testid="troubleshoot-setup-link">
                Setup Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
