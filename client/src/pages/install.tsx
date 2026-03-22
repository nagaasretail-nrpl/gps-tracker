import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, Share2, Download, ChevronRight, ExternalLink } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface Step {
  text: string;
}

interface PlatformCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  steps: Step[];
}

function PlatformCard({ icon: Icon, title, badge, steps }: PlatformCardProps) {
  return (
    <Card data-testid={`card-platform-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary" className="w-fit text-xs">{badge}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground leading-snug">{step.text}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export default function InstallPage() {
  const { canInstall, promptInstall } = usePWAInstall();
  const [installed, setInstalled] = useState(false);

  const appUrl = window.location.origin;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(appUrl)}&size=220x220&color=1e293b&bgcolor=ffffff&margin=10`;

  const handleInstall = async () => {
    await promptInstall();
    setInstalled(true);
  };

  const platforms: PlatformCardProps[] = [
    {
      icon: Smartphone,
      title: "Android Phone / Tablet",
      badge: "Chrome Browser",
      steps: [
        { text: 'Open this page in Chrome' },
        { text: 'Tap the menu icon (⋮) in the top-right corner' },
        { text: 'Tap "Add to Home Screen"' },
        { text: 'Tap "Install" to confirm' },
      ],
    },
    {
      icon: Share2,
      title: "iPhone / iPad",
      badge: "Safari Browser",
      steps: [
        { text: 'Open this page in Safari (not Chrome)' },
        { text: 'Tap the Share button at the bottom (box with arrow pointing up)' },
        { text: 'Scroll down and tap "Add to Home Screen"' },
        { text: 'Tap "Add" in the top-right corner' },
      ],
    },
    {
      icon: Monitor,
      title: "Windows / Mac Computer",
      badge: "Chrome or Edge",
      steps: [
        { text: 'Open this page in Chrome or Microsoft Edge' },
        { text: 'Look for the install icon in the address bar (computer with arrow)' },
        { text: 'Click "Install" when prompted' },
        { text: 'The app will open in its own window — no browser needed' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <img
            src="/nista-logo.png"
            alt="NistaGPS logo"
            className="h-16 w-16 object-contain"
            data-testid="img-install-logo"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-install-title">
              Install NistaGPS
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Get the app on your phone — works offline, no app store needed
            </p>
          </div>
        </div>

        {/* One-tap install button (Android / Desktop Chrome only) */}
        {canInstall && !installed && (
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              onClick={handleInstall}
              className="gap-2"
              data-testid="button-install-app"
            >
              <Download className="h-4 w-4" />
              Install App Now
            </Button>
            <p className="text-xs text-muted-foreground">Your browser supports one-tap install</p>
          </div>
        )}
        {installed && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm px-4 py-1.5" data-testid="badge-install-done">
              App installed successfully
            </Badge>
          </div>
        )}

        {/* QR Code */}
        <Card data-testid="card-qr-code">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-center">Scan to open on your phone</p>
            <div className="rounded-md overflow-hidden border border-border p-2 bg-white">
              <img
                src={qrUrl}
                alt="QR code to install NistaGPS"
                className="h-[200px] w-[200px] block"
                data-testid="img-qr-code"
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono break-all text-center" data-testid="text-app-url">
              {appUrl}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              asChild
              data-testid="button-open-app"
            >
              <a href={appUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open App
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Platform instructions */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold" data-testid="text-instructions-heading">
            Step-by-step instructions
          </h2>
          {platforms.map(p => (
            <PlatformCard key={p.title} {...p} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2">
          <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1" data-testid="link-back-app">
            Back to app
            <ChevronRight className="h-3 w-3" />
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-install-terms">
            Terms
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-install-privacy">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
