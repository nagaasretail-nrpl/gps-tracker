import { 
  Map, 
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
  LogOut
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

const personalMenuItems = [
  {
    title: "Track Activity",
    url: "/track",
    icon: Play,
  },
  {
    title: "My Activities",
    url: "/activities",
    icon: Activity,
  },
  {
    title: "Statistics",
    url: "/stats",
    icon: TrendingUp,
  },
];

const fleetMenuItems = [
  {
    title: "Fleet Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Live Tracking",
    url: "/tracking",
    icon: Radio,
  },
  {
    title: "Vehicles",
    url: "/vehicles",
    icon: Car,
  },
  {
    title: "Trips",
    url: "/trips",
    icon: Navigation,
  },
  {
    title: "Location History",
    url: "/history",
    icon: History,
  },
  {
    title: "Geofences",
    url: "/geofences",
    icon: Shield,
  },
  {
    title: "Routes",
    url: "/routes",
    icon: Route,
  },
  {
    title: "Points of Interest",
    url: "/pois",
    icon: MapPin,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
];

const adminMenuItems = [
  {
    title: "User Management",
    url: "/admin-users",
    icon: Users,
  },
];

const userMenuItems = [
  {
    title: "My Profile",
    url: "/profile",
    icon: User,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">GPS Tracker</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Personal + Fleet</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Personal Tracking</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {personalMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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

        <SidebarGroup>
          <SidebarGroupLabel>Fleet Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {fleetMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
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
      </SidebarContent>
    </Sidebar>
  );
}
