import { Switch, Route, useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
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
import NotFound from "@/pages/not-found";

type UserWithoutPassword = Omit<User, "password">;

// "/" (dashboard) is intentionally not in PROTECTED_ROUTES so it is always
// accessible and acts as a safe redirect target for blocked routes.
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/track": ["/track"],
  "/activities": ["/activities"],
  "/stats": ["/stats"],
  "/tracking": ["/tracking"],
  "/vehicles": ["/vehicles"],
  "/trips": ["/trips"],
  "/history": ["/history"],
  "/geofences": ["/geofences"],
  "/routes": ["/routes"],
  "/pois": ["/pois"],
  "/reports": ["/reports"],
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

  const allowedMenus = user.allowedMenus;
  // null or empty array both mean unrestricted (no specific menus configured)
  if (allowedMenus == null || allowedMenus.length === 0) {
    return <Component />;
  }

  const requiredMenu = PROTECTED_ROUTES[path];
  if (requiredMenu && !requiredMenu.some((r) => allowedMenus.includes(r))) {
    navigate("/"); // "/" is always accessible and never in PROTECTED_ROUTES
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
      <Route path="/" component={Dashboard} />
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
      <Route path="/vehicles" component={guard("/vehicles", Vehicles)} />
      <Route path="/profile" component={guard("/profile", Profile)} />
      <Route path="/admin-users" component={AdminUsers} />
      <Route path="/admin-settings" component={AdminSettings} />
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

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const { data: authData, isFetched: userFetched } = useQuery<{ user: UserWithoutPassword }>({
    queryKey: ["/api/auth/me"],
  });

  const currentUser = authData?.user ?? null;

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
        <AppSidebar />
        <div className="flex flex-col flex-1 relative">
          <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                  });
                  onLogout();
                }}
                data-testid="button-logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <MainRoutes currentUser={currentUser} userFetched={userFetched} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PublicOrAuthApp() {
  const [isTermsMatch] = useRoute("/terms");
  const [isPrivacyMatch] = useRoute("/privacy");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip auth check for public pages — show them immediately
    if (isTermsMatch || isPrivacyMatch) {
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
  }, [isTermsMatch, isPrivacyMatch]);

  // Always serve public pages regardless of auth state
  if (isTermsMatch) return <Terms />;
  if (isPrivacyMatch) return <Privacy />;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
