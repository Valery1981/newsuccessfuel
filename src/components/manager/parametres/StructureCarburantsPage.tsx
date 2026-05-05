"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Fuel, Loader2, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const CARBURANT_TYPES = [
  { value: "SP95", label: "Essence SP95", compte: "701" },
  { value: "SP91", label: "Essence SP91", compte: "701" },
  { value: "GO", label: "Gasoil", compte: "702" },
  { value: "Petrole", label: "Pétrole lampant", compte: "703" },
];

interface PrixCarburant {
  id: string;
  station_id: string | null;
  type_carburant: string;
  prix_vente: number;
  marge_litre: number;
  prix_achat: number | null;
  date_effet: string;
}

function EditableCell({
  prix,
  field,
  onSave,
}: {
  prix: PrixCarburant;
  field: "prix_vente" | "marge_litre";
  onSave: (
    id: string,
    field: "prix_vente" | "marge_litre",
    value: number,
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(prix[field]));
  const [saving, setSaving] = useState(false);

  const handleBlur = useCallback(async () => {
    const num = Number(localValue);
    if (!localValue || isNaN(num) || num < 0) {
      setLocalValue(String(prix[field]));
      setEditing(false);
      return;
    }
    if (num === prix[field]) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(prix.id, field, num);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [localValue, prix, field, onSave]);

  if (saving) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (editing) {
    return (
      <Input
        type="number"
        autoFocus
        className="w-28 h-7 text-right text-sm"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setLocalValue(String(prix[field]));
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="flex items-center justify-end gap-1 group w-full cursor-pointer rounded px-1 py-0.5 hover:bg-muted transition-colors"
      onClick={() => {
        setLocalValue(String(prix[field]));
        setEditing(true);
      }}
    >
      <span className={field === "marge_litre" ? "text-green-600" : ""}>
        {formatCurrency(prix[field])}/L
      </span>
      <Check className="w-3 h-3 opacity-0 group-hover:opacity-40 text-muted-foreground" />
    </button>
  );
}

export function StructureCarburantsPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [formData, setFormData] = useState({
    station_id: "",
    type_carburant: "SP95",
    prix_vente: "",
    marge_litre: "",
  });

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: prixList, isLoading } = useQuery({
    queryKey: ["prix-carburant", selectedStationId],
    queryFn: async () => {
      if (!selectedStationId) return [];
      const { data } = await supabase
        .from("prix_carburant")
        .select("*")
        .eq("station_id", selectedStationId)
        .order("date_effet", { ascending: false });
      return (data ?? []) as PrixCarburant[];
    },
    enabled: !!selectedStationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prix_carburant").insert({
        station_id: formData.station_id,
        type_carburant: formData.type_carburant,
        prix_vente: Number(formData.prix_vente),
        marge_litre: Number(formData.marge_litre),
        date_effet: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix-carburant"] });
      toast.success("Prix carburant enregistré !");
      setIsDialogOpen(false);
      setFormData({
        station_id: "",
        type_carburant: "SP95",
        prix_vente: "",
        marge_litre: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "prix_vente" | "marge_litre";
      value: number;
    }) => {
      const updatePayload =
        field === "prix_vente" ? { prix_vente: value } : { marge_litre: value };
      const { error } = await supabase
        .from("prix_carburant")
        .update(updatePayload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix-carburant"] });
      toast.success("Prix mis à jour");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCellSave = useCallback(
    async (id: string, field: "prix_vente" | "marge_litre", value: number) => {
      await updateMutation.mutateAsync({ id, field, value });
    },
    [updateMutation],
  );

  if (isLoading && selectedStationId) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Prix Carburants"
        description="Cliquez sur un prix ou une marge pour l'éditer directement. La sauvegarde est automatique."
        actions={
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau prix
          </Button>
        }
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Définir un prix carburant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Station <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.station_id}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, station_id: v ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {(stations ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type de carburant</Label>
              <Select
                value={formData.type_carburant}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, type_carburant: v ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARBURANT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Prix de vente (MGA/L){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.prix_vente}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, prix_vente: e.target.value }))
                  }
                  placeholder="Ex: 4500"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Marge (MGA/L) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  value={formData.marge_litre}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, marge_litre: e.target.value }))
                  }
                  placeholder="Ex: 150"
                />
              </div>
            </div>
            {formData.prix_vente && formData.marge_litre && (
              <div className="bg-muted rounded-md p-3 text-sm">
                <span className="text-muted-foreground">
                  Prix d&apos;achat calculé :{" "}
                </span>
                <span className="font-medium">
                  {formatCurrency(
                    Number(formData.prix_vente) - Number(formData.marge_litre),
                  )}
                  /L
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  !formData.station_id ||
                  !formData.prix_vente ||
                  !formData.marge_litre ||
                  createMutation.isPending
                }
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Station selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Fuel className="w-5 h-5 text-muted-foreground" />
            <Select
              value={selectedStationId}
              onValueChange={(v) => setSelectedStationId(v ?? "")}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner une station" />
              </SelectTrigger>
              <SelectContent>
                {(stations ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStationId && (
              <p className="text-xs text-muted-foreground">
                Cliquez sur un prix ou une marge pour l&apos;éditer
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedStationId && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Prix vente ✏️</TableHead>
                <TableHead className="text-right">Marge ✏️</TableHead>
                <TableHead className="text-right">
                  Prix achat (calculé)
                </TableHead>
                <TableHead>Date effet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(prixList ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun prix défini pour cette station. Cliquez sur
                    «&nbsp;Nouveau prix&nbsp;».
                  </TableCell>
                </TableRow>
              ) : (
                (prixList ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {CARBURANT_TYPES.find((c) => c.value === p.type_carburant)
                        ?.label ?? p.type_carburant}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        prix={p}
                        field="prix_vente"
                        onSave={handleCellSave}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        prix={p}
                        field="marge_litre"
                        onSave={handleCellSave}
                      />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatCurrency(
                        p.prix_achat ?? p.prix_vente - p.marge_litre,
                      )}
                      /L
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.date_effet}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </PageContainer>
  );
}
