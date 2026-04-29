import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, History, MapPin, Loader2 } from "lucide-react";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const { data: records, isLoading } = trpc.attendance.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // Group records by date
  const grouped = records?.reduce((acc, record) => {
    const dateStr = new Date(record.createdAt).toLocaleDateString("pt-BR");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(record);
    return acc;
  }, {} as Record<string, typeof records>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-sm">Histórico</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {grouped && Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([date, dayRecords]) => (
            <Card key={date}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{date}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayRecords?.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={record.type === "in" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {record.type === "in" ? "Entrada" : "Saída"}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{formatTime(record.createdAt)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.location?.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(Number(record.distance))}m
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 space-y-3">
            <History className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Registrar Ponto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
