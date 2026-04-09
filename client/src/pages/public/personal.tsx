import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import { MapPin, Activity, Clock, BarChart3, Shield, Smartphone, ChevronRight } from "lucide-react";

const PERSONAL_FEATURES = [
  {
    icon: Activity,
    title: "Activity Tracking",
    desc: "Track walks, runs, hikes, and drives directly from your phone. Automatic session recording with start/stop.",
  },
  {
    icon: Clock,
    title: "Route History",
    desc: "Every trip and activity stored with a full replay. See where you've been, how fast you moved, and elevation changes.",
  },
  {
    icon: BarChart3,
    title: "Statistics",
    desc: "Distance, speed, elevation gain, moving time — detailed analytics for every journey you take.",
  },
  {
    icon: Shield,
    title: "Personal Geofences",
    desc: "Set home, office, or any custom zones and get notified when you arrive or leave.",
  },
  {
    icon: Smartphone,
    title: "Phone as Tracker",
    desc: "Use the GPS Tracker app on your Android or iOS device to transmit your location — no hardware needed.",
  },
  {
    icon: MapPin,
    title: "Points of Interest",
    desc: "Save important locations with custom icons and names — visible on your personal map.",
  },
];

export default function PersonalPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b bg-card py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-medium mb-5">
            Personal Account
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            GPS tracking for individuals
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Not running a fleet? Use your personal NistaGPS account to track your own movement, record activities, and monitor your own vehicles — all on a single map.
          </p>
          <Link href="/login">
            <Button size="lg" data-testid="personal-cta-button">
              Create Personal Account
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* What it is */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">One account, many uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A personal NistaGPS account gives you the same real-time map, history playback, and geofencing tools as the fleet version — scaled down to an individual level.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Track a single vehicle (your car or bike), record fitness activities with the GPS Tracker app, or simply keep a log of your daily commutes and trips.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Your data is private, secured under your account, and accessible from any browser or the mobile app.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {PERSONAL_FEATURES.slice(0, 4).map((f) => (
              <div key={f.title} className="p-4 rounded-md border bg-card">
                <f.icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full feature list */}
      <section className="py-16 bg-card border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Everything included in a personal account</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PERSONAL_FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-5 rounded-md border bg-background"
                data-testid={`personal-feature-${f.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Difference vs fleet */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">Personal vs Fleet</h2>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm" data-testid="table-personal-vs-fleet">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Feature</th>
                <th className="text-center px-4 py-3 font-semibold text-primary">Personal</th>
                <th className="text-center px-4 py-3 font-semibold">Fleet</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ["Live map tracking", true, true],
                ["History playback", true, true],
                ["Geofencing", true, true],
                ["Push alerts", true, true],
                ["Multiple vehicles", false, true],
                ["Driver management", false, true],
                ["Team access / sub-users", false, true],
                ["Maintenance records", false, true],
                ["Expense tracking", false, true],
                ["Advanced reports suite", false, true],
                ["Admin control panel", false, true],
              ].map(([feat, personal, fleet]) => (
                <tr key={String(feat)} className="bg-background hover-elevate">
                  <td className="px-4 py-3 text-muted-foreground">{feat}</td>
                  <td className="px-4 py-3 text-center">
                    {personal ? (
                      <span className="text-primary font-bold">Yes</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fleet ? (
                      <span className="font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login">
            <Button data-testid="personal-bottom-cta">Get Started Free</Button>
          </Link>
          <Link href="/hosted">
            <Button variant="outline" data-testid="personal-fleet-link">View Fleet Plans</Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
