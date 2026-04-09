import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import { Server, Shield, Zap, Globe, ChevronRight, CheckCircle2 } from "lucide-react";

const HOSTED_BENEFITS = [
  {
    icon: Server,
    title: "Fully managed infrastructure",
    desc: "We run the TCP/IP listener server, the application server, and the database. No DevOps required on your side.",
  },
  {
    icon: Zap,
    title: "Always-on device connectivity",
    desc: "Dedicated GCP VM listener running 24/7 on port 5023. Your devices connect the moment they have signal.",
  },
  {
    icon: Shield,
    title: "Data security",
    desc: "All data encrypted in transit (TLS) and at rest. Backups retained for 30 days. Your fleet data stays yours.",
  },
  {
    icon: Globe,
    title: "Custom domain & branding",
    desc: "White-label the dashboard with your company logo, colours, and domain. Your fleet, your brand.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "₹149",
    per: "/ vehicle / month",
    minVehicles: 1,
    maxVehicles: 10,
    storage: "30 days history",
    support: "Email support",
    features: [
      "Up to 10 vehicles",
      "Real-time tracking",
      "History (30 days)",
      "Basic reports",
      "Geofencing (5 zones)",
      "Push alerts",
      "PWA mobile access",
    ],
  },
  {
    name: "Pro",
    price: "₹99",
    per: "/ vehicle / month",
    minVehicles: 5,
    maxVehicles: 100,
    storage: "90 days history",
    support: "Priority email + WhatsApp",
    highlight: true,
    features: [
      "Up to 100 vehicles",
      "Everything in Starter",
      "Unlimited geofences",
      "Advanced reports suite",
      "Trip auto-detection",
      "Driver management",
      "Sub-user accounts",
      "CSV export",
    ],
  },
  {
    name: "Fleet",
    price: "₹79",
    per: "/ vehicle / month",
    minVehicles: 50,
    maxVehicles: null,
    storage: "1 year history",
    support: "Dedicated account manager",
    features: [
      "Unlimited vehicles",
      "Everything in Pro",
      "Maintenance tracking",
      "Expense management",
      "Custom branding",
      "API access",
      "Admin control panel",
      "Firewall & security controls",
      "1-year history",
    ],
  },
];

const COMPARISON_ROWS = [
  { label: "Vehicles", starter: "Up to 10", pro: "Up to 100", fleet: "Unlimited" },
  { label: "History retention", starter: "30 days", pro: "90 days", fleet: "1 year" },
  { label: "Geofences", starter: "5 zones", pro: "Unlimited", fleet: "Unlimited" },
  { label: "Real-time tracking", starter: "Yes", pro: "Yes", fleet: "Yes" },
  { label: "Reports", starter: "Basic", pro: "Advanced", fleet: "Advanced + export" },
  { label: "Driver management", starter: "—", pro: "Yes", fleet: "Yes" },
  { label: "Maintenance logs", starter: "—", pro: "—", fleet: "Yes" },
  { label: "Custom branding", starter: "—", pro: "—", fleet: "Yes" },
  { label: "API access", starter: "—", pro: "—", fleet: "Yes" },
  { label: "Support", starter: "Email", pro: "Priority", fleet: "Dedicated" },
];

const SETUP_STEPS = [
  { step: "1", title: "Create account", desc: "Sign up with your phone number. No credit card needed to start the free trial." },
  { step: "2", title: "Add vehicles", desc: "Enter your device IMEI numbers to register each vehicle in the system." },
  { step: "3", title: "Configure devices", desc: "Point your GPS trackers to our server IP and port. Configuration takes 2 minutes per device." },
  { step: "4", title: "Go live", desc: "Watch your vehicles appear on the map in real time. Start monitoring immediately." },
];

export default function HostedPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b bg-card py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-medium mb-5">
            Hosted Software
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Hosted GPS tracking, zero infrastructure
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            NistaGPS runs the entire platform for you — server, database, listener, and web app. You connect your devices, we handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" data-testid="hosted-hero-cta">
                Start Free Trial
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/getting-started">
              <Button size="lg" variant="outline" data-testid="hosted-setup-guide">
                Setup Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOSTED_BENEFITS.map((b) => (
            <div key={b.title} className="p-5 rounded-md border bg-card" data-testid={`hosted-benefit-${b.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                <b.icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-card border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Hosted plans</h2>
            <p className="text-muted-foreground">All plans include 14-day free trial. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-md border bg-background p-6 flex flex-col gap-4 ${plan.highlight ? "border-primary ring-1 ring-primary" : ""}`}
                data-testid={`plan-${plan.name.toLowerCase()}`}
              >
                {plan.highlight && (
                  <span className="self-start bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground ml-1">{plan.per}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min. {plan.minVehicles} vehicle{plan.minVehicles > 1 ? "s" : ""}
                    {plan.maxVehicles ? ` — max ${plan.maxVehicles}` : ""}
                  </p>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                  <div>{plan.storage}</div>
                  <div>{plan.support}</div>
                </div>
                <Link href="/login">
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                    data-testid={`plan-cta-${plan.name.toLowerCase()}`}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">Plan comparison</h2>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm" data-testid="table-plan-comparison">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Feature</th>
                <th className="text-center px-4 py-3 font-semibold">Starter</th>
                <th className="text-center px-4 py-3 font-semibold text-primary">Pro</th>
                <th className="text-center px-4 py-3 font-semibold">Fleet</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="bg-background">
                  <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-center text-sm">{row.starter}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium">{row.pro}</td>
                  <td className="px-4 py-3 text-center text-sm">{row.fleet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Setup steps */}
      <section className="py-16 bg-card border-y">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-10 text-center">Up and running in 4 steps</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SETUP_STEPS.map((s) => (
              <div key={s.step} className="text-center" data-testid={`setup-step-${s.step}`}>
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/getting-started">
              <Button data-testid="hosted-getting-started-link">
                Full Setup Guide
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
