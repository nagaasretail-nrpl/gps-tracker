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
  Download,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const nistaLogo = "/nista-logo.png";

type UserWithoutPassword = Omit<UserType, "password">;

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  // menuKey is the allowedMenus permission key. Defaults to url when not set.
  // Fleet Dashboard navigates to /dashboard but its permission key is "/" (legacy).
  menuKey?: string;
}

const personalMenuItems: MenuItem[] = [
  { title: "Track Activity", url: "/track", icon: Play },
  { title: "My Activities", url: "/activities", icon: Activity },
  { title: "Statistics", url: "/stats", icon: TrendingUp },
];

const fleetMenuItems: MenuItem[] = [
  { title: "Fleet Dashboard", url: "/dashboard", icon: BarChart3, menuKey: "/" },
  { title: "Live Tracking", url: "/tracking", icon: Radio },
  { title: "Vehicles", url: "/vehicles", icon: Car },
  { title: "Trips", url: "/trips", icon: Navigation },
  { title: "Location History", url: "/history", icon: History },
  { title: "Geofences", url: "/geofences", icon: Shield },
  { title: "Routes", url: "/routes", icon: Route },
  { title: "Points of Interest", url: "/pois", icon: MapPin },
  { title: "Reports", url: "/reports", icon: FileText },
];

const adminMenuItems: MenuItem[] = [
  { title: "User Management", url: "/admin-users", icon: Users },
  { title: "Settings", url: "/admin-settings", icon: Settings },
];

const userMenuItems: MenuItem[] = [
  { title: "My Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { canInstall, promptInstall } = usePWAInstall();

  const { data: authData } = useQuery<{ user: UserWithoutPassword }>({
    queryKey: ["/api/auth/me"],
  });

  const currentUser = authData?.user;
  const isAdmin = currentUser?.role === "admin";

  const isAllowed = (item: MenuItem): boolean => {
    if (!currentUser || isAdmin) return true;
    const allowed = currentUser.allowedMenus;
    // null or empty array both mean unrestricted (no specific menus configured)
    if (allowed == null || allowed.length === 0) return true;
    const key = item.menuKey ?? item.url;
    return allowed.includes(key);
  };

  const visiblePersonal = personalMenuItems.filter(isAllowed);
  const visibleFleet = fleetMenuItems.filter(isAllowed);
  const visibleUser = userMenuItems.filter(isAllowed);

  const renderGroup = (label: string, items: MenuItem[]) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={location === item.url}
                  data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b">
        <img
          src={nistaLogo}
          alt="NistaGPS"
          className="h-10 w-auto object-contain"
          data-testid="img-nista-logo-sidebar"
        />
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Personal Tracking", visiblePersonal)}
        {renderGroup("Fleet Management", visibleFleet)}
        {renderGroup("Account", visibleUser)}

        {/* Administration: admin only */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      {canInstall && (
        <SidebarFooter className="border-t px-2 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={promptInstall}
                data-testid="button-install-app"
              >
                <Download className="h-4 w-4" />
                <span>Install App</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
