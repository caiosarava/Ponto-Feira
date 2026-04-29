import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  MapPin,
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  History,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { useEffect } from "react";

function getDistanceColor(distance: number, radius: number) {
  const ratio = distance / radius;
  if (ratio <= 0.5) return "text-green-600";
  if (ratio <= 0.8) return "text-yellow-600";
  return "text-red-600";
}

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const { latitude, longitude, accuracy, loading: geoLoading, error: geoError, refresh } = useGeolocation();

  const { data: locations } = trpc.location.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: records } = trpc.attendance.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();

  const registerMutation = trpc.attendance.register.useMutation({
    onSuccess: () => {
      utils.attendance.list.invalidate();
    },
  });

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const selectedLocation = locations?.find((l) => l.id === selectedLocationId);

  const calculateDistance = useCallback(
    (loc: typeof selectedLocation) => {
      if (!latitude || !longitude || !loc) return null;
      const R = 6371000;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(parseFloat(loc.latitude) - latitude);
      const dLon = toRad(parseFloat(loc.longitude) - longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(latitude)) *
          Math.cos(toRad(parseFloat(loc.latitude))) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [latitude, longitude]
  );

  const distance = selectedLocation ? calculateDistance(selectedLocation) : null;
  const isWithinRange = distance !== null && selectedLocation && distance <= selectedLocation.radius;

  const lastRecord = records?.[0];
  const nextType = lastRecord?.type === "in" ? "out" : "in";

  const handleRegister = (type: "in" | "out") => {
    if (!selectedLocationId || !latitude || !longitude) return;
    registerMutation.mutate({
      locationId: selectedLocationId,
      type,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-tight">Ponto Geo</h1>
              <p className="text-xs text-muted-foreground">Registro de Presença</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/history")}>
              <History className="h-5 w-5" />
            </Button>
            {user.role === "admin" && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/admin")}>
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* User greeting */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h2 className="text-lg font-semibold">{user.name ?? user.email ?? "Usuário"}</h2>
        </div>

        {/* Location selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local de Trabalho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations && locations.length > 0 ? (
              <>
                <div className="grid gap-2">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocationId(loc.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        selectedLocationId === loc.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          selectedLocationId === loc.id ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* GPS Status */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">GPS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {geoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : geoError ? (
                      <span className="text-xs text-red-500">Erro</span>
                    ) : (
                      <span className="text-xs text-green-600">Ativo</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refresh}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {geoError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{geoError}</p>
                  </div>
                )}

                {distance !== null && selectedLocation && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Distância</span>
                    <span className={`text-sm font-semibold ${getDistanceColor(distance, selectedLocation.radius)}`}>
                      {Math.round(distance)}m / {selectedLocation.radius}m
                    </span>
                  </div>
                )}

                {accuracy !== null && (
                  <p className="text-xs text-muted-foreground text-center">
                    Precisão do GPS: ±{Math.round(accuracy)}m
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4 space-y-2">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhum local cadastrado</p>
                {user.role === "admin" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                    Cadastrar Local
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Register buttons */}
        {locations && locations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Registrar Ponto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lastRecord && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-xs text-muted-foreground">Último registro</span>
                  <Badge variant={lastRecord.type === "in" ? "default" : "secondary"}>
                    {lastRecord.type === "in" ? "Entrada" : "Saída"} às {formatTime(lastRecord.createdAt)}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="h-auto py-4 flex flex-col gap-1"
                  disabled={
                    geoLoading ||
                    !!geoError ||
                    !isWithinRange ||
                    registerMutation.isPending ||
                    nextType !== "in"
                  }
                  onClick={() => handleRegister("in")}
                >
                  {registerMutation.isPending && registerMutation.variables?.type === "in" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                  <span className="text-sm">Entrada</span>
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  className="h-auto py-4 flex flex-col gap-1"
                  disabled={
                    geoLoading ||
                    !!geoError ||
                    !isWithinRange ||
                    registerMutation.isPending ||
                    nextType !== "out"
                  }
                  onClick={() => handleRegister("out")}
                >
                  {registerMutation.isPending && registerMutation.variables?.type === "out" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  <span className="text-sm">Saída</span>
                </Button>
              </div>

              {!isWithinRange && distance !== null && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    Você está fora do raio permitido ({Math.round(distance)}m / {selectedLocation?.radius}m).
                    Aproxime-se do local para registrar.
                  </p>
                </div>
              )}

              {isWithinRange && (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-600">
                    Você está dentro do raio permitido. Pode registrar o ponto.
                  </p>
                </div>
              )}

              {registerMutation.isError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">
                    {registerMutation.error.message}
                  </p>
                </div>
              )}

              {registerMutation.isSuccess && (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-600">
                    Registro realizado com sucesso!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent records preview */}
        {records && records.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Registros Recentes
                </span>
                <Button variant="ghost" size="sm" className="h-auto py-1" onClick={() => navigate("/history")}>
                  Ver todos
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {records.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={record.type === "in" ? "default" : "secondary"} className="text-xs">
                        {record.type === "in" ? "Entrada" : "Saída"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {record.location?.name}
                      </span>
                    </div>
                    <span className="text-xs font-medium">
                      {formatTime(record.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
