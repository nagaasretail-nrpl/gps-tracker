import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Timer, TrendingUp, Mountain, Footprints } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TrackActivity() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [elevation, setElevation] = useState(0);

  const handleStartStop = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setDuration(0);
      setDistance(0);
      setSpeed(0);
      setElevation(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Track Activity</h1>
        <p className="text-sm text-muted-foreground">
          Record your hikes, runs, bike rides, and outdoor activities
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isRecording && (
          <>
            <Badge variant="default" className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
              <div className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse" />
              Recording
            </Badge>
            <span className="text-sm text-muted-foreground">
              GPS tracking is active
            </span>
          </>
        )}
        {!isRecording && (
          <Badge variant="outline">Ready to track</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-distance">
              {distance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">kilometers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-duration">
              {formatDuration(duration)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">hours:min:sec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-speed">
              {speed.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">km/h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elevation</CardTitle>
            <Mountain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-elevation">
              {elevation.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">meters gained</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Live Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted rounded-md flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">Map will show your live route here</p>
              <p className="text-sm">Integration with mapping library coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          onClick={handleStartStop}
          className={!isRecording ? "bg-[#FF6B35] hover:bg-[#FF6B35]/90" : ""}
          data-testid="button-start-stop"
        >
          {isRecording ? (
            <>
              <Square className="mr-2 h-5 w-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start Recording
            </>
          )}
        </Button>
      </div>

      {!isRecording && duration > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Distance:</span>
                <span className="font-medium">{distance.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Duration:</span>
                <span className="font-medium">{formatDuration(duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Speed:</span>
                <span className="font-medium">{speed.toFixed(1)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Elevation Gain:</span>
                <span className="font-medium">{elevation.toFixed(0)} m</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1">Discard</Button>
                <Button className="flex-1 bg-[#FF6B35] hover:bg-[#FF6B35]/90">Save Activity</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
