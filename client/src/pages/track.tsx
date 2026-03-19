import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Timer, TrendingUp, Mountain, Footprints, MapPin } from "lucide-react";
import { MapComponent } from "@/components/map-component";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GeoPoint {
  lat: number;
  lng: number;
  alt: number | null;
  speed: number | null;
  time: number;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TrackActivity() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activitySaved, setActivitySaved] = useState(false);

  const pointsRef = useRef<GeoPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastAltRef = useRef<number | null>(null);

  const saveActivity = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const startedAt = startTimeRef.current
        ? new Date(startTimeRef.current).toISOString()
        : now;
      return apiRequest("POST", "/api/activities", {
        type: "route",
        startTime: startedAt,
        endTime: now,
        distance: distance.toFixed(4),
        duration: String(duration),
        elevationGain: elevationGain.toFixed(1),
        averageSpeed: duration > 0 ? ((distance / duration) * 3600).toFixed(2) : "0",
        maxSpeed: pointsRef.current.length > 0
          ? Math.max(...pointsRef.current.map(p => p.speed ?? 0)).toFixed(2)
          : "0",
        calories: String(Math.round(distance * 60)),
        notes: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setActivitySaved(true);
      toast({ title: "Activity saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save activity", variant: "destructive" });
    },
  });

  const stopRecording = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleStartStop = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoError(null);
    setActivitySaved(false);
    setDistance(0);
    setCurrentSpeed(0);
    setElevationGain(0);
    setDuration(0);
    setRoutePoints([]);
    pointsRef.current = [];
    lastAltRef.current = null;
    startTimeRef.current = Date.now();

    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, altitude, speed } = pos.coords;
        const point: GeoPoint = { lat, lng, alt: altitude, speed, time: Date.now() };

        setCurrentPos([lat, lng]);
        setRoutePoints((prev) => [...prev, [lat, lng]]);

        if (pointsRef.current.length > 0) {
          const prev = pointsRef.current[pointsRef.current.length - 1];
          const seg = haversine(prev.lat, prev.lng, lat, lng);
          setDistance((d) => d + seg);
        }

        if (altitude !== null && lastAltRef.current !== null && altitude > lastAltRef.current) {
          setElevationGain((e) => e + (altitude - lastAltRef.current!));
        }
        if (altitude !== null) lastAltRef.current = altitude;

        setCurrentSpeed(speed !== null ? speed * 3.6 : 0);

        pointsRef.current.push(point);
      },
      (err) => {
        setGeoError(`GPS error: ${err.message}`);
        stopRecording();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, [isRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const mapCenter: [number, number] = currentPos ?? [20.5937, 78.9629];
  const mapZoom = currentPos ? 16 : 5;

  const liveRoutePolylines = routePoints.length >= 2
    ? [{ vehicleId: "live-route", coords: routePoints, color: "#FF6B35" }]
    : [];

  const fakePoisForMap = currentPos
    ? [{ id: "me", name: "You", latitude: String(currentPos[0]), longitude: String(currentPos[1]), category: "custom", description: `${currentSpeed.toFixed(1)} km/h` }]
    : [];

  const showSummary = !isRecording && duration > 0 && !activitySaved;

  return (
    <div className="flex flex-col gap-4 p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Track Activity</h1>
          <p className="text-sm text-muted-foreground">Record your route using your device GPS</p>
        </div>
        <div className="flex items-center gap-2">
          {isRecording ? (
            <Badge variant="default" className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
              Recording
            </Badge>
          ) : (
            <Badge variant="outline">Ready</Badge>
          )}
          {geoError && <Badge variant="destructive">GPS error</Badge>}
        </div>
      </div>

      {geoError && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-2">
          {geoError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-distance">{distance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">kilometers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-duration">{formatDuration(duration)}</div>
            <p className="text-xs text-muted-foreground mt-1">hours:min:sec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-speed">{currentSpeed.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">km/h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elevation</CardTitle>
            <Mountain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-elevation">{elevationGain.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">meters gained</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Live Map
            {currentPos && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MapComponent
            key={isRecording ? "recording" : "idle"}
            vehicles={[]}
            locations={[]}
            routePolylines={liveRoutePolylines}
            pois={fakePoisForMap as any}
            center={mapCenter}
            zoom={mapZoom}
            className="h-80 rounded-b-md"
          />
        </CardContent>
      </Card>

      {/* Start / Stop */}
      <div className="flex justify-center">
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          onClick={handleStartStop}
          data-testid="button-start-stop"
          className="min-w-40"
        >
          {isRecording ? (
            <><Square className="mr-2 h-5 w-5" />Stop Recording</>
          ) : (
            <><Play className="mr-2 h-5 w-5" />Start Recording</>
          )}
        </Button>
      </div>

      {/* Post-activity Summary */}
      {showSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Distance</span>
                <span className="font-medium">{distance.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Duration</span>
                <span className="font-medium">{formatDuration(duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Speed</span>
                <span className="font-medium">
                  {duration > 0 ? ((distance / duration) * 3600).toFixed(1) : "0"} km/h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elevation Gain</span>
                <span className="font-medium">{elevationGain.toFixed(0)} m</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDuration(0);
                    setDistance(0);
                    setCurrentSpeed(0);
                    setElevationGain(0);
                    setRoutePoints([]);
                    pointsRef.current = [];
                  }}
                >
                  Discard
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => saveActivity.mutate()}
                  disabled={saveActivity.isPending}
                >
                  {saveActivity.isPending ? "Saving…" : "Save Activity"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
