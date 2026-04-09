import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import {
  MapPin, Activity, Shield, BarChart3, Bell, Clock,
  Smartphone, Zap, Lock, Car, Wrench, DollarSign,
  FileText, Users, Globe, ChevronRight, Database,
} from "lucide-react";

const FEATURE_SECTIONS = [
  {
    category: "Live Tracking",
    icon: MapPin,
    color: "text-primary",
    features: [
      { title: "Real-time map", desc: "See all vehicles simultaneously on an interactive Google Maps base." },
      { title: "WebSocket streaming", desc: "Sub-second position updates pushed from server to browser. No page refresh needed." },
      { title: "Bearing & heading", desc: "Vehicle icons rotate to show direction of travel with smooth animation." },
      { title: "Speed display", desc: "Live speed shown per vehicle marker with colour-coded status." },
      { title: "Ignition status", desc: "Know whether the engine is on or off, with timestamps for each state change." },
      { title: "Cluster view", desc: "Vehicles automatically cluster at low zoom levels for clean map readability." },
    ],
  },
  {
    category: "History & Playback",
    icon: Clock,
    color: "text-primary",
    features: [
      { title: "Date range replay", desc: "Select any date range and replay the vehicle's exact route with time-proportional animation." },
      { title: "Gap detection", desc: "Offline periods automatically shown as dotted segments — never confuse gaps with real travel." },
      { title: "Speed graph", desc: "Chart of speed over time shown alongside the map during replay." },
      { title: "Stop markers", desc: "Parking and stops are marked on the route with duration labels." },
      { title: "Variable playback speed", desc: "Play at 1×, 2×, or 3× speed. Jump to any point with the scrubber." },
      { title: "Interpolated movement", desc: "Smooth continuous marker movement between GPS points using linear interpolation." },
    ],
  },
  {
    category: "Geofencing",
    icon: Shield,
    color: "text-primary",
    features: [
      { title: "Polygon zones", desc: "Draw any polygon shape on the map to define a geofence boundary." },
      { title: "Circle zones", desc: "Set a radius around a point — ideal for depots, customer sites, or restricted areas." },
      { title: "Entry & exit alerts", desc: "Get notified the instant a vehicle crosses a zone boundary in either direction." },
      { title: "Multiple vehicles", desc: "One geofence applies to all vehicles — or configure per-zone rules." },
      { title: "Active/inactive toggle", desc: "Disable geofences without deleting them to temporarily suspend monitoring." },
    ],
  },
  {
    category: "Reports & Analytics",
    icon: BarChart3,
    color: "text-primary",
    features: [
      { title: "Mileage report", desc: "Distance driven per vehicle per day, with odometer-style accumulation." },
      { title: "Speed report", desc: "Max speed, average speed, and speed violation events per vehicle and period." },
      { title: "Idle time report", desc: "Engine-on but zero-movement duration with configurable idle threshold." },
      { title: "Parking report", desc: "Where vehicles parked, for how long, and reverse-geocoded address." },
      { title: "Trip report", desc: "Auto-detected trip segmentation with start/end addresses, distance, duration." },
      { title: "CSV export", desc: "All reports export to CSV for offline analysis or integration with other tools." },
    ],
  },
  {
    category: "Alerts & Events",
    icon: Bell,
    color: "text-primary",
    features: [
      { title: "Speed alerts", desc: "Trigger when a vehicle exceeds a configurable speed threshold." },
      { title: "Parking alerts", desc: "Alert when a vehicle has been stationary longer than a set time." },
      { title: "Idle alerts", desc: "Engine running but vehicle not moving — reduces fuel waste." },
      { title: "Geofence events", desc: "Timestamped log of every zone crossing with coordinates." },
      { title: "Push notifications", desc: "Browser push via Web Push API — receive alerts even when the tab is in the background." },
      { title: "Events log", desc: "Searchable, filterable history of all events with severity levels." },
    ],
  },
  {
    category: "Fleet Management",
    icon: Car,
    color: "text-primary",
    features: [
      { title: "Vehicle profiles", desc: "Name, license plate, fuel type, tank capacity, efficiency, and device IMEI per vehicle." },
      { title: "Custom icons", desc: "Colour-coded markers per vehicle type (car, truck, motorcycle, bus)." },
      { title: "Driver assignment", desc: "Assign a driver to each vehicle with name and contact number." },
      { title: "Status tracking", desc: "Moving, parked, idle, and offline states with timestamps." },
      { title: "Device management", desc: "Track device IMEI, model, and SIM number per vehicle. Monitor unknown devices." },
    ],
  },
  {
    category: "Maintenance & Expenses",
    icon: Wrench,
    color: "text-primary",
    features: [
      { title: "Service records", desc: "Log oil changes, tire replacements, inspections, and any service type." },
      { title: "Odometer reminders", desc: "Set km-based reminders for upcoming service intervals." },
      { title: "Fuel logs", desc: "Record fuel fills with quantity, cost, and odometer reading for efficiency tracking." },
      { title: "Repair costs", desc: "Log repair expenses per vehicle with category and notes." },
      { title: "Cost summary", desc: "Per-vehicle total cost of ownership view across maintenance and fuel." },
    ],
  },
  {
    category: "Access Control",
    icon: Lock,
    color: "text-primary",
    features: [
      { title: "Admin & user roles", desc: "Full admin access or restricted user access — configurable per account." },
      { title: "Sub-users", desc: "Create sub-accounts under a parent user with granular vehicle and menu restrictions." },
      { title: "Vehicle access lists", desc: "Restrict a user to only see specific vehicles in the fleet." },
      { title: "Menu access control", desc: "Show or hide specific modules per user to simplify their view." },
      { title: "Phone-based auth", desc: "Login with phone number — no email required. SMS OTP optional." },
    ],
  },
  {
    category: "Billing & Activation",
    icon: DollarSign,
    color: "text-primary",
    features: [
      { title: "Per-vehicle pricing", desc: "Pay only for active vehicles. Add or remove objects any time." },
      { title: "Razorpay integration", desc: "Secure UPI, card, and net banking payments via Razorpay." },
      { title: "Subscription management", desc: "Monthly or annual plans with automatic renewal reminders." },
      { title: "IMEI activation", desc: "Enter device IMEI to create and activate a vehicle in one step." },
      { title: "Plan tiers", desc: "Basic, Pro, and Fleet plans with different object limits and feature access." },
    ],
  },
  {
    category: "Platform & Integration",
    icon: Globe,
    color: "text-primary",
    features: [
      { title: "30+ device protocols", desc: "GT06, Teltonika FMBXXX, Queclink GL200, Meitrack, Coban, Sinotrack, and more." },
      { title: "GCP VM listener", desc: "Dedicated TCP/IP server on GCP for always-on device connectivity." },
      { title: "REST API", desc: "JSON REST API for integrating with third-party systems." },
      { title: "White-label ready", desc: "Custom branding, logo, and colour scheme via admin control panel." },
      { title: "PWA support", desc: "Installable Progressive Web App on Android and iOS with offline caching." },
      { title: "Dark mode", desc: "Full dark/light mode toggle — adapts to system preference or user choice." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b bg-card py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Full-stack fleet tracking platform
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Every feature your operation needs — live tracking, history, geofencing, reports, maintenance, billing, and admin control — in a single hosted platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" data-testid="features-hero-cta">
                Get Started Free
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/devices">
              <Button size="lg" variant="outline" data-testid="features-devices-link">
                Supported Devices
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick navigation */}
      <section className="border-b bg-background sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex items-center gap-1 py-2 min-w-max">
            {FEATURE_SECTIONS.map((s) => (
              <a
                key={s.category}
                href={`#${s.category.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover-elevate whitespace-nowrap"
              >
                {s.category}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {FEATURE_SECTIONS.map((section) => (
          <section key={section.category} id={section.category.toLowerCase().replace(/\s+/g, '-')}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <section.icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{section.category}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.features.map((f) => (
                <div
                  key={f.title}
                  className="p-4 rounded-md border bg-card"
                  data-testid={`feature-item-${f.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="border-t bg-card py-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Start tracking your fleet today</h2>
          <p className="text-muted-foreground mb-6">
            14-day free trial. Connect your first device and see it live on the map within minutes.
          </p>
          <Link href="/login">
            <Button size="lg" data-testid="features-bottom-cta">
              Create Free Account
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
