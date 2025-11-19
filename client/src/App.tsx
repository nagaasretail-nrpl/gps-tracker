import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/track" component={TrackActivity} />
      <Route path="/activities" component={Activities} />
      <Route path="/stats" component={Statistics} />
      <Route path="/tracking" component={Tracking} />
      <Route path="/history" component={History} />
      <Route path="/geofences" component={Geofences} />
      <Route path="/routes" component={Routes} />
      <Route path="/pois" component={Pois} />
      <Route path="/reports" component={Reports} />
      <Route path="/vehicles" component={Vehicles} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between h-16 px-4 border-b bg-card">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
