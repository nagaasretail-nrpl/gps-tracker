import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, MapPin } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Hosted", href: "/hosted" },
  { label: "Personal", href: "/personal" },
  { label: "Devices", href: "/devices" },
  { label: "Getting Started", href: "/getting-started" },
];

const FOOTER_PRODUCT = [
  { label: "Features", href: "/features" },
  { label: "Hosted Plans", href: "/hosted" },
  { label: "Personal Account", href: "/personal" },
  { label: "Supported Devices", href: "/devices" },
  { label: "Getting Started", href: "/getting-started" },
  { label: "Troubleshooting", href: "/troubleshooting" },
];

const FOOTER_MOBILE = [
  { label: "GPS Server Mobile", href: "/mobile/gps-server" },
  { label: "GPS Tracker", href: "/mobile/gps-tracker" },
  { label: "SMS Gateway", href: "/mobile/sms-gateway" },
  { label: "Android", href: "/mobile/android" },
  { label: "iOS", href: "/mobile/ios" },
];

const FOOTER_LEGAL = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Troubleshooting", href: "/troubleshooting" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">NistaGPS</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover-elevate ${
                    location === link.href
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="nav-link-login">
                  Sign In
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" data-testid="nav-button-get-started">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md hover-elevate"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover-elevate"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Link href="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full" data-testid="mobile-nav-sign-in">
                  Sign In
                </Button>
              </Link>
              <Link href="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button size="sm" className="w-full" data-testid="mobile-nav-get-started">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/home" className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-base">NistaGPS</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professional GPS fleet tracking software. Real-time location, geofencing, history, reports and more.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Nagaas Retail Private Limited
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-sm font-semibold mb-3">Product</p>
              <ul className="space-y-2">
                {FOOTER_PRODUCT.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Apps */}
            <div>
              <p className="text-sm font-semibold mb-3">Mobile Apps</p>
              <ul className="space-y-2">
                {FOOTER_MOBILE.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-sm font-semibold mb-3">Legal & Support</p>
              <ul className="space-y-2">
                {FOOTER_LEGAL.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Nagaas Retail Private Limited. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              nistagps.com
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
