import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Login from "@/pages/login";
import Tracking from "@/pages/tracking";
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
import NotFound from "@/pages/not-found";

function Router({ isAuthenticated, onLoginSuccess }: { isAuthenticated: boolean; onLoginSuccess: () => void }) {
  if (!isAuthenticated) {
    return <Login onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <Switch>
      <Route path="/" component={Tracking} />
      <Route path="/track" component={TrackActivity} />
      <Route path="/activities" component={Activities} />
      <Route path="/stats" component={Statistics} />
      <Route path="/tracking" component={Tracking} />
      <Route path="/trips" component={Trips} />
      <Route path="/history" component={History} />
      <Route path="/geofences" component={Geofences} />
      <Route path="/routes" component={Routes} />
      <Route path="/pois" component={Pois} />
      <Route path="/reports" component={Reports} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin-users" component={AdminUsers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();

  useEffect(() => {
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
  }, [location]);

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

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          {isAuthenticated ? (
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
                          setIsAuthenticated(false);
                        }}
                        data-testid="button-logout"
                        title="Logout"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto">
                    <Router isAuthenticated={isAuthenticated} onLoginSuccess={() => setIsAuthenticated(true)} />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          ) : (
            <Router isAuthenticated={isAuthenticated} onLoginSuccess={() => {
              queryClient.invalidateQueries();
              setIsAuthenticated(true);
            }} />
          )}
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
