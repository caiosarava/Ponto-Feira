import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { useEffect } from "react";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.location.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.location.create.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate();
      setIsCreateOpen(false);
      setFormData({ name: "", address: "", latitude: "", longitude: "", radius: 100 });
    },
  });

  const updateMutation = trpc.location.update.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = trpc.location.delete.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate();
    },
  });

  const syncMutation = trpc.attendance.syncToSheets.useMutation({
    onSuccess: (data) => {
      alert(`${data.synced} registros sincronizados com sucesso!`);
    },
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: 100,
  });
  const [editData, setEditData] = useState<Record<number, typeof formData>>({});

  useEffect(() => {
    if (locations) {
      const edits: Record<number, typeof formData> = {};
      locations.forEach((loc) => {
        edits[loc.id] = {
          name: loc.name,
          address: loc.address ?? "",
          latitude: loc.latitude,
          longitude: loc.longitude,
          radius: loc.radius,
        };
      });
      setEditData(edits);
    }
  }, [locations]);

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      address: formData.address,
      latitude: formData.latitude,
      longitude: formData.longitude,
      radius: formData.radius,
    });
  };

  const handleUpdate = (id: number) => {
    const data = editData[id];
    if (!data) return;
    updateMutation.mutate({
      id,
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja inativar este local?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-sm">Admin</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Sync to Sheets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Google Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Registros
            </Button>
            {syncMutation.isError && (
              <p className="text-xs text-red-500 mt-2">{syncMutation.error.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Locations list */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locais de Trabalho
            </CardTitle>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Local</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Matriz, Filial SP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="-23.5505"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="-46.6333"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Raio (metros)</Label>
                    <Input
                      type="number"
                      value={formData.radius}
                      onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                      placeholder="100"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations && locations.length > 0 ? (
              locations.map((loc) => (
                <div key={loc.id} className="border rounded-lg p-3 space-y-3">
                  {editingId === loc.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={editData[loc.id]?.name ?? ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              [loc.id]: { ...editData[loc.id], name: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Endereço</Label>
                        <Input
                          value={editData[loc.id]?.address ?? ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              [loc.id]: { ...editData[loc.id], address: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Latitude</Label>
                          <Input
                            value={editData[loc.id]?.latitude ?? ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                [loc.id]: { ...editData[loc.id], latitude: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Longitude</Label>
                          <Input
                            value={editData[loc.id]?.longitude ?? ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                [loc.id]: { ...editData[loc.id], longitude: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Raio (m)</Label>
                        <Input
                          type="number"
                          value={editData[loc.id]?.radius ?? 100}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              [loc.id]: { ...editData[loc.id], radius: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdate(loc.id)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{loc.name}</p>
                          <p className="text-xs text-muted-foreground">{loc.address}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingId(loc.id)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => handleDelete(loc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {loc.latitude}, {loc.longitude}
                        </Badge>
                        <span>Raio: {loc.radius}m</span>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 space-y-2">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhum local cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
