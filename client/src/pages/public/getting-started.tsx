import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import { ChevronRight, MonitorPlay, Settings, Wifi, MapPin } from "lucide-react";

const STEPS = [
  {
    icon: MonitorPlay,
    step: "Step 1",
    title: "Create your account",
    desc: "Sign up with your mobile number. No email required. After signup, you will be taken to the fleet tracking dashboard.",
    details: [
      "Visit nistagps.com and click Get Started",
      "Enter your phone number and set a password",
      "Your account is ready immediately — no verification delay",
      "First login lands you on the live tracking map",
    ],
    tip: "Admin accounts (phone 9843777277) have full access to user management and system settings from day one.",
  },
  {
    icon: Settings,
    step: "Step 2",
    title: "Add your vehicles",
    desc: "Register each vehicle by entering the IMEI number of the GPS tracker installed in it.",
    details: [
      "Go to Vehicles in the sidebar",
      "Click Add Vehicle and enter the device IMEI",
      "Set a name, vehicle type, license plate, and driver name",
      "The vehicle appears on the map as soon as it connects",
    ],
    tip: "The IMEI is printed on the tracker device label or in its documentation. It is typically 15 digits.",
  },
  {
    icon: Wifi,
    step: "Step 3",
    title: "Configure your tracking devices",
    desc: "Point your GPS trackers to the NistaGPS server so they can send location data.",
    details: [
      "Server IP: 34.133.128.65",
      "Port: 5023 (GT06 / standard trackers)",
      "Use the tracker's SMS configuration command or PC software to set the server IP and port",
      "Most GT06-compatible devices use: SERVER,1,34.133.128.65,5023,0#",
    ],
    tip: "Not sure which port to use? Check the Supported Devices page to find your device model's protocol and port.",
    linkLabel: "Supported Devices",
    linkHref: "/devices",
  },
  {
    icon: MapPin,
    step: "Step 4",
    title: "Watch your fleet go live",
    desc: "Within seconds of the device connecting, it appears on the live map. Real-time tracking is now active.",
    details: [
      "Return to the Tracking page",
      "Your vehicle marker appears at its current location",
      "Position updates in real time as the vehicle moves",
      "Set up geofences and alerts in the respective sections",
    ],
    tip: "If a device connects but doesn't appear, check Admin Devices to see if the IMEI is being received. The IMEI may not match the one registered.",
  },
];

const FAQ = [
  {
    q: "How long does it take to set up?",
    a: "Creating an account and registering vehicles takes about 5 minutes. Configuring a device takes 1–2 minutes per tracker depending on the model.",
  },
  {
    q: "Which devices are supported?",
    a: "Any device using the GT06 protocol works out of the box on port 5023. We also support Teltonika, Queclink, Meitrack, and others on dedicated ports.",
  },
  {
    q: "How many vehicles can I add?",
    a: "Your plan determines the maximum number of active vehicles. The Starter plan supports up to 10 vehicles; Pro supports up to 100; Fleet is unlimited.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. All new accounts get a 14-day free trial with full Pro features. No credit card required to start.",
  },
  {
    q: "What happens if a device goes offline?",
    a: "The vehicle marker shows an 'offline' status. When the device reconnects, tracking resumes automatically with no action needed from you.",
  },
  {
    q: "Can I give my staff access to the map?",
    a: "Yes. Create sub-user accounts with restricted access to specific vehicles and menu sections only.",
  },
];

export default function GettingStartedPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b bg-card py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Getting Started with NistaGPS
          </h1>
          <p className="text-muted-foreground text-lg">
            From account creation to live tracking in 4 steps — takes under 10 minutes.
          </p>
        </div>
      </section>

      {/* Steps */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
        {STEPS.map((step, idx) => (
          <section key={step.step} className="grid md:grid-cols-2 gap-8 items-start" data-testid={`step-${idx + 1}`}>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{step.step}</span>
              </div>
              <h2 className="text-xl font-bold mb-2">{step.title}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">{step.desc}</p>
              {step.linkLabel && (
                <Link href={step.linkHref!}>
                  <Button variant="outline" size="sm" data-testid={`step-${idx + 1}-link`}>
                    {step.linkLabel} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="space-y-3">
              <div className="rounded-md border bg-card p-5">
                <ul className="space-y-2">
                  {step.details.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                      <span className="text-muted-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-primary/10 border border-primary/20 px-4 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Tip: </span>{step.tip}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Next steps */}
      <section className="border-t bg-card py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">What to do next</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Set up geofences", desc: "Draw zones around key locations and get instant alerts on entry or exit.", href: "/docs/places/zones" },
              { title: "Configure alerts", desc: "Enable speed, parking, and idle alerts for each vehicle via Alert Settings.", href: "/docs/workspace/user-account-panel" },
              { title: "Run your first report", desc: "Go to Reports and run a mileage or parking summary for any vehicle.", href: "/docs/reports" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className="p-4 rounded-md border bg-background hover-elevate cursor-pointer"
                  data-testid={`next-step-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  <div className="flex items-center gap-1 text-primary text-xs mt-2 font-medium">
                    Read docs <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ.map((item, idx) => (
            <div
              key={idx}
              className="rounded-md border bg-card p-5"
              data-testid={`faq-item-${idx}`}
            >
              <h3 className="font-semibold text-sm mb-2">{item.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">Still have questions?</p>
          <Link href="/troubleshooting">
            <Button variant="outline" data-testid="goto-troubleshooting">
              View Troubleshooting Guide
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
