import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footprints, Clock, TrendingUp, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  name: string;
  type: string;
  startTime: Date;
  distance: number;
  duration: number;
  elevationGain: number;
  avgSpeed: number;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    name: "Morning Run",
    type: "running",
    startTime: new Date(2024, 0, 15, 7, 30),
    distance: 5.2,
    duration: 1800,
    elevationGain: 45,
    avgSpeed: 10.4,
  },
  {
    id: "2",
    name: "Mountain Hike",
    type: "hiking",
    startTime: new Date(2024, 0, 14, 9, 0),
    distance: 12.8,
    duration: 14400,
    elevationGain: 680,
    avgSpeed: 3.2,
  },
  {
    id: "3",
    name: "Evening Cycle",
    type: "cycling",
    startTime: new Date(2024, 0, 13, 18, 0),
    distance: 25.3,
    duration: 5400,
    elevationGain: 120,
    avgSpeed: 16.9,
  },
];

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    running: "🏃",
    hiking: "🥾",
    cycling: "🚴",
    walking: "🚶",
  };
  return icons[type] || "📍";
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

export default function Activities() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">My Activities</h1>
          <p className="text-sm text-muted-foreground">
            View and analyze your recorded activities
          </p>
        </div>
        <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
          New Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockActivities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockActivities.reduce((sum, a) => sum + a.distance, 0).toFixed(1)} km
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(mockActivities.reduce((sum, a) => sum + a.duration, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <Card key={activity.id} className="hover-elevate cursor-pointer" data-testid={`card-activity-${activity.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getActivityIcon(activity.type)}</div>
                  <div>
                    <h3 className="font-semibold text-lg">{activity.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {activity.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(activity.startTime)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{activity.distance.toFixed(1)} km</div>
                    <div className="text-xs text-muted-foreground">Distance</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{formatDuration(activity.duration)}</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{activity.avgSpeed.toFixed(1)} km/h</div>
                    <div className="text-xs text-muted-foreground">Avg Speed</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{activity.elevationGain} m</div>
                    <div className="text-xs text-muted-foreground">Elevation</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockActivities.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Footprints className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No activities yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Start tracking your first activity to see it here
            </p>
            <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
              Track Activity
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
