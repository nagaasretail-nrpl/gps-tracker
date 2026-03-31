import { Switch, Route, useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileTileNav } from "@/components/mobile-tile-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LogOut, AlertTriangle } from "lucide-react";
import type { User } from "@shared/schema";
import Login from "@/pages/login";
import Tracking from "@/pages/tracking";
import Dashboard from "@/pages/dashboard";
import History from "@/pages/history";
import Geofences from "@/pages/geofences";
import Routes from "@/pages/routes";
import Pois from "@/pages/pois";
import Reports from "@/pages/reports";
import Vehicles from "@/pages/vehicles";
import TrackActivity from "@/pages/track";
import Activities from "@/pages/activities";
import Statistics from "@/pages/stats";
import Trips from "@/pages/trips";
import Profile from "@/pages/profile";
import AdminUsers from "@/pages/admin-users";
import AdminSettings from "@/pages/admin-settings";
import Renew from "@/pages/renew";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import InstallPage from "@/pages/install";
import ParkingReport from "@/pages/parking-report";
import AlertSettings from "@/pages/alert-settings";
import VehicleAppearance from "@/pages/vehicle-appearance";
import AdminDevices from "@/pages/admin-devices";
import NotFound from "@/pages/not-found";

type UserWithoutPassword = Omit<User, "password">;

// Routes that bypass allowedMenus restrictions — always visible for all authenticated users.
const ALWAYS_ACCESSIBLE_ROUTES = new Set(["/geofences", "/pois", "/parking-report", "/alert-settings", "/vehicle-appearance"]);

// "/" (live tracking) is not in PROTECTED_ROUTES — always accessible, safe fallback.
// "/dashboard" uses legacy key "/" (same as the stored allowedMenus value).
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/track": ["/track"],
  "/activities": ["/activities"],
  "/stats": ["/stats"],
  "/tracking": ["/tracking"],
  "/dashboard": ["/"],
  "/vehicles": ["/vehicles"],
  "/trips": ["/trips"],
  "/history": ["/history"],
  "/geofences": ["/geofences"],
  "/routes": ["/routes"],
  "/pois": ["/pois"],
  "/reports": ["/reports"],
  "/parking-report": ["/parking-report"],
  "/profile": ["/profile"],
};

function RouteGuard({ user, userLoaded, path, component: Component }: {
  user: UserWithoutPassword | null;
  userLoaded: boolean;
  path: string;
  component: React.ComponentType;
}) {
  const [, navigate] = useLocation();

  // Wait until user data is resolved before making access decisions
  if (!userLoaded) {
    return null;
  }

  if (!user || user.role === "admin") {
    return <Component />;
  }

  // Always accessible routes bypass per-user menu restrictions entirely
  if (ALWAYS_ACCESSIBLE_ROUTES.has(path)) {
    return <Component />;
  }

  const allowedMenus = user.allowedMenus;
  // null or empty array both mean unrestricted (no specific menus configured)
  if (allowedMenus == null || allowedMenus.length === 0) {
    return <Component />;
  }

  const requiredMenu = PROTECTED_ROUTES[path];
  if (requiredMenu && !requiredMenu.some((r) => allowedMenus.includes(r))) {
    // "/tracking" is never in PROTECTED_ROUTES so it is always reachable
    navigate("/tracking");
    return null;
  }

  return <Component />;
}

function MainRoutes({ currentUser, userFetched }: { currentUser: UserWithoutPassword | null; userFetched: boolean }) {
  const guard = (path: string, Component: React.ComponentType) => () => (
    <RouteGuard user={currentUser} userLoaded={userFetched} path={path} component={Component} />
  );

  return (
    <Switch>
      <Route path="/" component={Tracking} />
      <Route path="/dashboard" component={guard("/dashboard", Dashboard)} />
      <Route path="/track" component={guard("/track", TrackActivity)} />
      <Route path="/activities" component={guard("/activities", Activities)} />
      <Route path="/stats" component={guard("/stats", Statistics)} />
      <Route path="/tracking" component={guard("/tracking", Tracking)} />
      <Route path="/trips" component={guard("/trips", Trips)} />
      <Route path="/history" component={guard("/history", History)} />
      <Route path="/geofences" component={guard("/geofences", Geofences)} />
      <Route path="/routes" component={guard("/routes", Routes)} />
      <Route path="/pois" component={guard("/pois", Pois)} />
      <Route path="/reports" component={guard("/reports", Reports)} />
      <Route path="/parking-report" component={guard("/parking-report", ParkingReport)} />
      <Route path="/vehicles" component={guard("/vehicles", Vehicles)} />
      <Route path="/profile" component={guard("/profile", Profile)} />
      <Route path="/alert-settings" component={guard("/alert-settings", AlertSettings)} />
      <Route path="/vehicle-appearance" component={guard("/vehicle-appearance", VehicleAppearance)} />
      <Route path="/admin-users" component={AdminUsers} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route path="/admin-devices" component={AdminDevices} />
      <Route path="/renew" component={() =>
        currentUser ? (
          <Renew
            user={currentUser}
            onRenewed={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            }}
          />
        ) : null
      } />
      <Route component={NotFound} />
    </Switch>
  );
}

function ExpiryAlertDialog({ user, onDismiss }: { user: UserWithoutPassword; onDismiss: () => void }) {
  const [, navigate] = useLocation();

  const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
  const daysLeft = expiry
    ? Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const expiryStr = expiry
    ? (() => {
        const dd = String(expiry.getDate()).padStart(2, "0");
        const mmm = expiry.toLocaleDateString("en-US", { month: "short" });
        const yyyy = expiry.getFullYear();
        return `${dd}-${mmm}-${yyyy}`;
      })()
    : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="max-w-md" data-testid="dialog-expiry-alert">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            <DialogTitle>Subscription Expiring Soon</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            {daysLeft !== null && expiryStr ? (
              <>
                Your subscription expires in{" "}
                <span className="font-semibold text-foreground">{daysLeft} {daysLeft === 1 ? "day" : "days"}</span>
                {" "}(on <span className="font-semibold text-foreground">{expiryStr}</span>).
              </>
            ) : (
              "Your subscription is expiring soon."
            )}
            {" "}Please renew to avoid any interruption to your GPS fleet tracking.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onDismiss}
            data-testid="button-expiry-remind-later"
          >
            Remind Me Later
          </Button>
          <Button
            onClick={() => { onDismiss(); navigate("/renew"); }}
            data-testid="button-expiry-pay-now"
          >
            Pay Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const { data: authData, isFetched: userFetched } = useQuery<{ user: UserWithoutPassword }>({
    queryKey: ["/api/auth/me"],
  });

  const currentUser = authData?.user ?? null;

  const [showExpiryAlert, setShowExpiryAlert] = useState(false);

  useEffect(() => {
    if (!userFetched || !currentUser) return;
    if (currentUser.role === "admin" || currentUser.status !== "active") return;
    if (!currentUser.subscriptionExpiry) return;
    const expiry = new Date(currentUser.subscriptionExpiry);
    const daysLeft = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft >= 0 && daysLeft <= 30) {
      setShowExpiryAlert(true);
    }
  }, [userFetched, currentUser?.id, currentUser?.role, currentUser?.status, currentUser?.subscriptionExpiry]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Full-screen renew page for inactive non-admin users (no sidebar)
  if (userFetched && currentUser && currentUser.status === "inactive" && currentUser.role !== "admin") {
    return (
      <Renew
        user={currentUser}
        onRenewed={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }}
      />
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        <div className="flex flex-col flex-1 relative min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Mobile: tile nav trigger (hidden on desktop) */}
            <div className="flex md:hidden">
              <MobileTileNav onLogout={() => {
                queryClient.invalidateQueries();
                onLogout();
              }} />
            </div>
            {/* Desktop: sidebar trigger (hidden on mobile) */}
            <div className="hidden md:flex">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate" />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {/* Desktop logout button — hidden on mobile (mobile uses tile nav logout) */}
              <div className="hidden md:flex">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    await fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "include",
                    });
                    queryClient.invalidateQueries();
                    onLogout();
                  }}
                  data-testid="button-logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <MainRoutes currentUser={currentUser} userFetched={userFetched} />
          </main>
        </div>
      </div>
      {showExpiryAlert && currentUser && (
        <ExpiryAlertDialog user={currentUser} onDismiss={() => setShowExpiryAlert(false)} />
      )}
    </SidebarProvider>
  );
}

// PublicOrAuthApp handles public legal routes (/terms, /privacy) before any auth check,
// so unauthenticated users can read legal pages without being redirected to login.
// Auth state is managed here rather than inside a nested Router to keep a single entry point.
function PublicOrAuthApp() {
  const [isTermsMatch] = useRoute("/terms");
  const [isPrivacyMatch] = useRoute("/privacy");
  const [isInstallMatch] = useRoute("/install");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip auth check for public pages — show them immediately
    if (isTermsMatch || isPrivacyMatch || isInstallMatch) {
      setIsLoading(false);
      return;
    }
    // Reset loading before re-checking auth (e.g. when navigating away from legal pages)
    setIsLoading(true);
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [isTermsMatch, isPrivacyMatch, isInstallMatch]);

  // Always serve public pages regardless of auth state
  if (isTermsMatch) return <Terms />;
  if (isPrivacyMatch) return <Privacy />;
  if (isInstallMatch) return <InstallPage />;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <AuthenticatedApp onLogout={() => {
      queryClient.invalidateQueries();
      setIsAuthenticated(false);
    }} />
  ) : (
    <Login onLoginSuccess={() => {
      queryClient.invalidateQueries();
      setIsAuthenticated(true);
    }} />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <PublicOrAuthApp />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
