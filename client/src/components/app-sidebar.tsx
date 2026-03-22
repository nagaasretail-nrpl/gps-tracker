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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
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

import nistaLogo from "@assets/image_1774170648070.png";

type UserWithoutPassword = Omit<UserType, "password">;

const personalMenuItems = [
  { title: "Track Activity", url: "/track", icon: Play },
  { title: "My Activities", url: "/activities", icon: Activity },
  { title: "Statistics", url: "/stats", icon: TrendingUp },
];

const fleetMenuItems = [
  { title: "Fleet Dashboard", url: "/", icon: BarChart3 },
  { title: "Live Tracking", url: "/tracking", icon: Radio },
  { title: "Vehicles", url: "/vehicles", icon: Car },
  { title: "Trips", url: "/trips", icon: Navigation },
  { title: "Location History", url: "/history", icon: History },
  { title: "Geofences", url: "/geofences", icon: Shield },
  { title: "Routes", url: "/routes", icon: Route },
  { title: "Points of Interest", url: "/pois", icon: MapPin },
  { title: "Reports", url: "/reports", icon: FileText },
];

const adminMenuItems = [
  { title: "User Management", url: "/admin-users", icon: Users },
  { title: "Settings", url: "/admin-settings", icon: Settings },
];

const userMenuItems = [
  { title: "My Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: authData } = useQuery<{ user: UserWithoutPassword }>({
    queryKey: ["/api/auth/me"],
  });

  const currentUser = authData?.user;
  const isAdmin = currentUser?.role === "admin";

  const isAllowed = (url: string): boolean => {
    if (!currentUser || isAdmin) return true;
    const allowed = currentUser.allowedMenus;
    // null or empty array both mean unrestricted (no specific menus configured)
    if (allowed == null || allowed.length === 0) return true;
    return allowed.includes(url);
  };

  const visiblePersonal = personalMenuItems.filter((i) => isAllowed(i.url));
  const visibleFleet = fleetMenuItems.filter((i) => isAllowed(i.url));
  const visibleUser = userMenuItems.filter((i) => isAllowed(i.url));

  const renderGroup = (label: string, items: typeof personalMenuItems) => {
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
          className="h-10 w-auto object-contain mix-blend-multiply dark:mix-blend-screen"
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
    </Sidebar>
  );
}
