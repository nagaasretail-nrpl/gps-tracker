import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public-layout";
import {
  Server, MapPin, MessageSquare, Smartphone, Monitor,
  Activity, Clock, Bell, Wifi, Battery, ChevronRight,
  Download,
} from "lucide-react";

type AppKey = "gps-server" | "gps-tracker" | "sms-gateway" | "android" | "ios";

interface AppData {
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  platform: string;
  features: string[];
  setupSteps: { title: string; desc: string }[];
  downloadLabel: string;
  downloadNote: string;
}

const APPS: Record<AppKey, AppData> = {
  "gps-server": {
    name: "GPS Server Mobile",
    tagline: "Full fleet dashboard in your pocket",
    description:
      "GPS Server Mobile is the companion mobile client for the NistaGPS platform. Monitor your entire fleet from your phone — live positions, vehicle status, geofence alerts, and history playback — exactly as you would on the web dashboard.",
    icon: Server,
    platform: "Android & iOS",
    features: [
      "Live map with real-time vehicle positions",
      "Vehicle status badges (moving, parked, idle, offline)",
      "History playback for any date range",
      "Geofence management and alert history",
      "Push notifications for all alert types",
      "Multi-vehicle fleet view with clustering",
      "Dark and light mode support",
      "Offline map caching for poor signal areas",
    ],
    setupSteps: [
      { title: "Install the app", desc: "Download GPS Server Mobile from the Play Store (Android) or App Store (iOS)." },
      { title: "Enter server URL", desc: "On first launch, enter your NistaGPS server URL: https://nistagps.com" },
      { title: "Log in", desc: "Use the same phone number and password as your web account." },
      { title: "Allow notifications", desc: "Grant notification permission so you receive real-time fleet alerts." },
    ],
    downloadLabel: "Available on Android & iOS",
    downloadNote: "Requires an active NistaGPS account. Compatible with Android 8+ and iOS 14+.",
  },
  "gps-tracker": {
    name: "GPS Tracker",
    tagline: "Turn your phone into a GPS tracking device",
    description:
      "GPS Tracker transforms any Android or iOS device into a live GPS transmitter. Use a spare phone as a low-cost tracker in a vehicle, or carry it yourself for personal tracking. The app transmits location to your NistaGPS account in real time.",
    icon: MapPin,
    platform: "Android & iOS",
    features: [
      "Transmit live GPS location to your NistaGPS account",
      "Configurable update interval (10s to 5min)",
      "Runs in the background — no need to keep the screen on",
      "Low battery impact with location batching",
      "Works on mobile data or Wi-Fi",
      "Auto-reconnect on network loss",
      "Shows your own position on the map",
      "Appears in the fleet dashboard as a standard vehicle",
    ],
    setupSteps: [
      { title: "Install the app", desc: "Download GPS Tracker from the Play Store or App Store." },
      { title: "Enter your account details", desc: "Log in with your NistaGPS phone number and password." },
      { title: "Select an object", desc: "Choose which registered vehicle in your account this device represents." },
      { title: "Start tracking", desc: "Tap Start. Your location will appear on the NistaGPS map immediately." },
    ],
    downloadLabel: "Available on Android & iOS",
    downloadNote: "Compatible with Android 7+ and iOS 13+. Location permission (Always) is required for background tracking.",
  },
  "sms-gateway": {
    name: "SMS Gateway",
    tagline: "Use your Android phone as an SMS bridge",
    description:
      "SMS Gateway turns an Android phone into a two-way SMS bridge for your GPS trackers. Send configuration commands to your devices via SMS through the NistaGPS dashboard, and receive SMS alerts — all routed through a real SIM card for maximum reliability.",
    icon: MessageSquare,
    platform: "Android only",
    features: [
      "Send SMS commands to any registered device from the web dashboard",
      "Receive SMS replies from devices and display them in the app",
      "Works with any Android phone with an active SIM",
      "Auto-forwards incoming SMS to the NistaGPS server",
      "Log of all sent and received messages",
      "Useful for devices without data SIM — command via SMS",
      "Supports bulk SMS to multiple devices simultaneously",
    ],
    setupSteps: [
      { title: "Install on an Android phone", desc: "Download SMS Gateway from the Play Store. Requires an Android device with SMS and call permissions." },
      { title: "Insert a SIM card", desc: "The SIM in this phone will be used to send and receive SMS. Ensure it has an active SMS plan." },
      { title: "Log in and connect", desc: "Log in with your NistaGPS admin credentials. The app registers as the gateway for your account." },
      { title: "Configure in admin panel", desc: "In the NistaGPS admin settings, set this phone's number as the SMS gateway number." },
    ],
    downloadLabel: "Android only",
    downloadNote: "Android 8+ required. SMS and phone call permissions are mandatory. Not available on iOS due to platform SMS restrictions.",
  },
  "android": {
    name: "Android Apps",
    tagline: "Full NistaGPS experience on Android",
    description:
      "All three NistaGPS mobile apps are available on Android — GPS Server Mobile for fleet monitoring, GPS Tracker for device-style tracking, and SMS Gateway for command routing. Install all three or just the ones you need.",
    icon: Smartphone,
    platform: "Android",
    features: [
      "GPS Server Mobile — fleet monitoring dashboard",
      "GPS Tracker — personal / vehicle tracking mode",
      "SMS Gateway — Android-only SMS bridge",
      "Background location support on Android 8+",
      "Home screen widget for live vehicle count",
      "Works on phones, tablets, and Android Auto",
      "No Google account required — direct APK sideload available",
    ],
    setupSteps: [
      { title: "Open Google Play Store", desc: "Search for 'NistaGPS' or use the links below." },
      { title: "Install the app(s)", desc: "Install GPS Server Mobile and/or GPS Tracker depending on your use case." },
      { title: "Grant permissions", desc: "Location (Always), Notification, and for SMS Gateway — SMS and Phone permissions." },
      { title: "Log in", desc: "Use your NistaGPS account credentials. Your fleet data loads automatically." },
    ],
    downloadLabel: "Available on Google Play",
    downloadNote: "Minimum Android 7.0 (API 24). GPS Server Mobile and GPS Tracker: Android 7+. SMS Gateway: Android 8+.",
  },
  "ios": {
    name: "iOS Apps",
    tagline: "NistaGPS on iPhone and iPad",
    description:
      "GPS Server Mobile and GPS Tracker are available for iPhone and iPad. Track your fleet, replay history, and manage geofences from any iOS device. The NistaGPS PWA also installs directly from Safari without using the App Store.",
    icon: Monitor,
    platform: "iOS",
    features: [
      "GPS Server Mobile — full fleet dashboard for iPhone and iPad",
      "GPS Tracker — turn your iPhone into a tracking device",
      "Progressive Web App (PWA) — installable from Safari without App Store",
      "Background location with iOS background modes",
      "Push notifications via APNs",
      "Face ID / Touch ID support",
      "Works on iPhone 8+ and iPad (6th gen+)",
      "iOS 14+ required for all features",
    ],
    setupSteps: [
      { title: "Open the App Store", desc: "Search for 'NistaGPS' or scan the QR code on this page." },
      { title: "Install GPS Server Mobile", desc: "Available for iPhone and iPad. Tap Get and install." },
      { title: "Or use the PWA", desc: "Open nistagps.com in Safari, tap the Share button, and choose 'Add to Home Screen' for a native-like app without App Store." },
      { title: "Log in and grant permissions", desc: "Allow location access (Always) and notifications when prompted." },
    ],
    downloadLabel: "Available on the App Store",
    downloadNote: "iOS 14+ required for full feature support. SMS Gateway is not available on iOS.",
  },
};

export default function MobileAppsPage() {
  const params = useParams<{ app: string }>();
  const appKey = (params.app as AppKey) || "gps-server";
  const app = APPS[appKey] || APPS["gps-server"];
  const Icon = app.icon;

  const otherApps = Object.entries(APPS)
    .filter(([key]) => key !== appKey)
    .slice(0, 3);

  return (
    <PublicLayout>
      {/* App sub-nav */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex items-center gap-1 py-2 min-w-max">
            {Object.entries(APPS).map(([key, a]) => (
              <Link key={key} href={`/mobile/${key}`}>
                <button
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    key === appKey ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover-elevate"
                  }`}
                  data-testid={`mobile-subnav-${key}`}
                >
                  {a.name}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b bg-card py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{app.platform}</p>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">{app.name}</h1>
              <p className="text-primary font-medium mb-3">{app.tagline}</p>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">{app.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-2 gap-10">
        {/* Features */}
        <section data-testid="app-features-list">
          <h2 className="text-lg font-bold mb-4">Features</h2>
          <ul className="space-y-2.5">
            {app.features.map((feat) => (
              <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                {feat}
              </li>
            ))}
          </ul>
        </section>

        {/* Setup */}
        <section data-testid="app-setup-steps">
          <h2 className="text-lg font-bold mb-4">Setup</h2>
          <ol className="space-y-4">
            {app.setupSteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Download CTA */}
      <section className="border-t border-b bg-card py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="font-semibold">{app.downloadLabel}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{app.downloadNote}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button size="sm" data-testid="app-download-button">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download
            </Button>
            <Link href="/login">
              <Button size="sm" variant="outline" data-testid="app-web-button">
                Use Web App
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Other apps */}
      <section className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold mb-6">Other mobile apps</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {otherApps.map(([key, a]) => {
            const OtherIcon = a.icon;
            return (
              <Link key={key} href={`/mobile/${key}`}>
                <div
                  className="p-4 rounded-md border bg-card hover-elevate cursor-pointer"
                  data-testid={`other-app-${key}`}
                >
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <OtherIcon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{a.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.tagline}</p>
                  <div className="flex items-center gap-1 text-primary text-xs mt-2 font-medium">
                    Learn more <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </PublicLayout>
  );
}
