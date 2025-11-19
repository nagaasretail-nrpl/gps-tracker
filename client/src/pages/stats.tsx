import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Footprints, Clock, Mountain, Zap, Calendar } from "lucide-react";

export default function Statistics() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Statistics</h1>
        <p className="text-sm text-muted-foreground">
          Your personal activity analytics and achievements
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">43.3 km</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5h 58m</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
            <p className="text-xs text-green-600 mt-1">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
            <p className="text-xs text-green-600 mt-1">+1 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10.2 km/h</div>
            <p className="text-xs text-muted-foreground mt-1">All time average</p>
            <p className="text-xs text-green-600 mt-1">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Elevation</CardTitle>
            <Mountain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">845 m</div>
            <p className="text-xs text-muted-foreground mt-1">Total climbed</p>
            <p className="text-xs text-green-600 mt-1">+25% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Speed</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28.5 km/h</div>
            <p className="text-xs text-muted-foreground mt-1">Personal best</p>
            <p className="text-xs text-muted-foreground mt-1">Evening Cycle</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-xl">🚴</div>
                  <span className="font-medium">Cycling</span>
                </div>
                <span className="text-sm text-muted-foreground">25.3 km (58%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-[#FF6B35] h-2 rounded-full" style={{ width: '58%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-xl">🥾</div>
                  <span className="font-medium">Hiking</span>
                </div>
                <span className="text-sm text-muted-foreground">12.8 km (30%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-xl">🏃</div>
                  <span className="font-medium">Running</span>
                </div>
                <span className="text-sm text-muted-foreground">5.2 km (12%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end justify-around gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const heights = [40, 0, 80, 0, 60, 100, 30];
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-[#FF6B35] rounded-t" style={{ height: `${heights[i]}%` }} />
                    <span className="text-xs text-muted-foreground">{day}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🏆</div>
                <div>
                  <div className="font-medium">First 10km</div>
                  <div className="text-xs text-muted-foreground">Completed your first 10km activity</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">⛰️</div>
                <div>
                  <div className="font-medium">Mountain Climber</div>
                  <div className="text-xs text-muted-foreground">Climbed 500m in elevation</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">📅</div>
                <div>
                  <div className="font-medium">Weekly Streak</div>
                  <div className="text-xs text-muted-foreground">Active 3 days this week</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
