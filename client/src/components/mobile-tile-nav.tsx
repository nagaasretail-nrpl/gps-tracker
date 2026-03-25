import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link } from "wouter";
import {
  Radio,
  History,
  Shield,
  Route,
  MapPin,
  FileText,
  Car,
  BarChart3,
  Activity,
  Play,
  TrendingUp,
  Navigation,
  User,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Download,
  ParkingSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { usePWAInstall } from "@/hooks/usePWAInstall";

type UserWithoutPassword = Omit<UserType, "password">;

interface TileItem {
  title: string;
  url: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  menuKey?: string;
}

const ALL_TILES: TileItem[] = [
  { title: "Map", url: "/tracking", icon: Radio, menuKey: "/tracking" },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, menuKey: "/" },
  { title: "Objects", url: "/vehicles", icon: Car, menuKey: "/vehicles" },
  { title: "Alerts", url: "/activities", icon: Activity, menuKey: "/activities" },
  { title: "Places", url: "/pois", icon: MapPin, menuKey: "/pois" },
  { title: "History", url: "/history", icon: History, menuKey: "/history" },
  { title: "Parking", url: "/parking-report", icon: ParkingSquare, menuKey: "/parking-report" },
  { title: "Reports", url: "/reports", icon: FileText, menuKey: "/reports" },
  { title: "Geofences", url: "/geofences", icon: Shield, menuKey: "/geofences" },
  { title: "Routes", url: "/routes", icon: Route, menuKey: "/routes" },
  { title: "Trips", url: "/trips", icon: Navigation, menuKey: "/trips" },
  { title: "Track", url: "/track", icon: Play, menuKey: "/track" },
  { title: "Statistics", url: "/stats", icon: TrendingUp, menuKey: "/stats" },
  { title: "Profile", url: "/profile", icon: User, menuKey: "/profile" },
  { title: "Users", url: "/admin-users", icon: Users, adminOnly: true },
  { title: "Settings", url: "/admin-settings", icon: Settings, adminOnly: true },
];

interface MobileTileNavProps {
  onLogout: () => void;
}

export function MobileTileNav({ onLogout }: MobileTileNavProps) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  const { data: authData } = useQuery<{ user: UserWithoutPassword }>({
    queryKey: ["/api/auth/me"],
  });
  const { canInstall, promptInstall } = usePWAInstall();

  const currentUser = authData?.user;
  const isAdmin = currentUser?.role === "admin";

  const isAllowed = (tile: TileItem): boolean => {
    if (tile.adminOnly) return isAdmin;
    if (!currentUser || isAdmin) return true;
    const allowed = currentUser.allowedMenus;
    if (allowed == null || allowed.length === 0) return true;
    if (!tile.menuKey) return true;
    return allowed.includes(tile.menuKey);
  };

  const visibleTiles = ALL_TILES.filter(isAllowed);

  const handleLogout = async () => {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    onLogout();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center h-9 w-9 rounded-md hover-elevate"
        data-testid="button-mobile-menu-open"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col bg-muted"
          data-testid="overlay-mobile-menu"
        >
          <div className="flex items-center gap-3 px-4 h-14 bg-primary shrink-0">
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center h-9 w-9 rounded-md text-primary-foreground opacity-90 hover:opacity-100"
              data-testid="button-mobile-menu-close"
              aria-label="Close menu"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <span className="text-primary-foreground font-semibold text-lg">NistaGPS</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="grid grid-cols-3 gap-3">
              {visibleTiles.map((tile) => {
                const isActive = location === tile.url || (tile.url === "/tracking" && location === "/");
                const Icon = tile.icon;
                return (
                  <Link
                    key={tile.url}
                    href={tile.url}
                    onClick={() => setOpen(false)}
                    data-testid={`tile-${tile.title.toLowerCase()}`}
                    className={[
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-md",
                      "bg-background border transition-colors cursor-pointer",
                      "min-h-[88px]",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-7 w-7 shrink-0",
                        isActive ? "text-primary" : "text-foreground/70",
                      ].join(" ")}
                    />
                    <span
                      className={[
                        "text-xs font-medium text-center leading-tight",
                        isActive ? "text-primary" : "text-foreground/80",
                      ].join(" ")}
                    >
                      {tile.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 border-t bg-background px-4 py-3 flex flex-col gap-2">
            {canInstall && (
              <button
                onClick={() => { setOpen(false); promptInstall(); }}
                className="flex items-center gap-2 w-full px-4 py-2 rounded-md border text-sm font-medium hover-elevate"
                data-testid="button-mobile-install"
              >
                <Download className="h-4 w-4" />
                Install App
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-md border text-sm font-medium hover-elevate text-destructive border-destructive/30"
              data-testid="button-mobile-logout"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
            <p className="text-xs text-center text-muted-foreground mt-1">NistaGPS by Nagaas Retail</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
