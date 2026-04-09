import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import {
  MapPin, Activity, Shield, BarChart3, Bell, Clock,
  Smartphone, ChevronRight, Server, Zap, Globe, Lock,
} from "lucide-react";

const FEATURES = [
  {
    icon: MapPin,
    title: "Real-Time Tracking",
    desc: "See every vehicle's live position on an interactive map, updated every few seconds via direct TCP/IP connection to your devices.",
  },
  {
    icon: Shield,
    title: "Geofencing",
    desc: "Draw zones on the map and receive instant alerts when vehicles enter or exit. Supports polygon and circle boundaries.",
  },
  {
    icon: Clock,
    title: "History Playback",
    desc: "Replay any vehicle's route for any time period with time-proportional animation, speed graph, and stop detection.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Mileage, speed, idle time, fuel consumption, zone visits, and parking summaries — all exportable to CSV.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Speed violations, extended parking, idle engine, geofence events — delivered in real time via push notifications.",
  },
  {
    icon: Activity,
    title: "Trip Detection",
    desc: "Automatic trip segmentation with start/end addresses, distance, duration, and average speed for every journey.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    desc: "PWA-based app works on any smartphone browser. Companion iOS and Android apps available for field teams.",
  },
  {
    icon: Zap,
    title: "Live WebSocket Feed",
    desc: "Sub-second location updates pushed directly to your browser. No polling — pure real-time streaming.",
  },
  {
    icon: Lock,
    title: "Role-Based Access",
    desc: "Admin, user, and sub-user roles with per-vehicle and per-menu access control. Multi-tenant ready.",
  },
];

const PLANS = [
  {
    name: "Basic",
    price: "₹149",
    per: "/ vehicle / month",
    desc: "For small fleets getting started with GPS tracking.",
    features: ["Up to 10 vehicles", "Real-time tracking", "History (30 days)", "Basic reports", "Email alerts"],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "₹99",
    per: "/ vehicle / month",
    desc: "For growing fleets that need advanced reporting and control.",
    features: ["Up to 100 vehicles", "All Basic features", "Geofencing", "Advanced reports", "Push notifications", "Trip analytics"],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Fleet",
    price: "₹79",
    per: "/ vehicle / month",
    desc: "For large operations requiring full admin control.",
    features: ["Unlimited vehicles", "All Pro features", "Driver management", "Maintenance tracking", "Expenses module", "Dedicated support", "Custom branding"],
    cta: "Contact Us",
  },
];

const MOBILE_APPS = [
  {
    name: "GPS Server Mobile",
    desc: "The full fleet tracking dashboard optimised for mobile. Monitor your entire fleet on the go.",
    href: "/mobile/gps-server",
    icon: Server,
  },
  {
    name: "GPS Tracker",
    desc: "Turn any Android or iOS device into a GPS tracking device. Perfect for personal use or as a backup tracker.",
    href: "/mobile/gps-tracker",
    icon: MapPin,
  },
  {
    name: "SMS Gateway",
    desc: "Use an Android phone as an SMS bridge to send and receive commands to your tracking devices.",
    href: "/mobile/sms-gateway",
    icon: Smartphone,
  },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-medium mb-6">
              <Globe className="w-3 h-3" />
              White-label GPS tracking software
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5">
              GPS Fleet Tracking,{" "}
              <span className="text-primary">Built for India</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Real-time vehicle tracking, geofencing, history playback, and fleet analytics — all on one platform. Supports GT06, Teltonika, Queclink, and 30+ device protocols.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto" data-testid="hero-button-get-started">
                  Get Started Free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="hero-button-features">
                  See All Features
                </Button>
              </Link>
            </div>
          </div>

          {/* Product mockup placeholder */}
          <div className="mt-14 rounded-lg border bg-card shadow-lg overflow-hidden max-w-4xl mx-auto">
            <div className="bg-muted/60 border-b px-4 py-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              <span className="ml-2 text-xs text-muted-foreground">nistagps.com/tracking</span>
            </div>
            <div className="aspect-[16/7] bg-gradient-to-br from-card to-muted flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-primary/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Live Fleet Map</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Real-time positions for your entire fleet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "30+", label: "Device protocols" },
              { value: "<1s", label: "Update latency" },
              { value: "99.9%", label: "Uptime SLA" },
              { value: "24/7", label: "Fleet visibility" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-primary" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything your fleet needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete platform covering live tracking, history, geofencing, reports, alerts, maintenance, and billing — under one login.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-md border bg-card flex flex-col gap-3"
                data-testid={`feature-card-${f.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/features">
              <Button variant="outline" data-testid="button-all-features">
                View All Features
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 bg-card border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple, per-vehicle pricing</h2>
            <p className="text-muted-foreground">Pay only for the vehicles you track. No setup fees. No hidden charges.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-md border p-6 flex flex-col gap-4 ${plan.highlight ? "border-primary ring-1 ring-primary" : ""}`}
                data-testid={`plan-card-${plan.name.toLowerCase()}`}
              >
                {plan.highlight && (
                  <div className="inline-flex self-start">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">Most Popular</span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                </div>
                <div>
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{plan.per}</span>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                    data-testid={`button-plan-cta-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </section>

      {/* Mobile apps section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Mobile applications</h2>
            <p className="text-muted-foreground">Three companion apps for different roles in your fleet operation.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {MOBILE_APPS.map((app) => (
              <Link key={app.href} href={app.href}>
                <div
                  className="p-6 rounded-md border bg-card hover-elevate cursor-pointer h-full flex flex-col gap-3"
                  data-testid={`mobile-app-card-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <app.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{app.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{app.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium">
                    Learn more <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to track your fleet?
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Get started in minutes. Connect your trackers, add your vehicles, and watch your fleet on the map in real time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                data-testid="cta-banner-button-start"
              >
                Start Free Trial
              </Button>
            </Link>
            <Link href="/getting-started">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
                data-testid="cta-banner-button-guide"
              >
                View Setup Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
