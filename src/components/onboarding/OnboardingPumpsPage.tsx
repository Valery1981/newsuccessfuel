"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cuveService } from "@/services/cuveService";
import { pistoletService } from "@/services/pistoletService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";

interface PistoletForm {
  numero: string;
  cuve_id: string;
}

export function OnboardingPumpsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { entreprise } = useAuthStore();
  const stationIdFromUrl = searchParams.get("station_id") ?? "";
  const [selectedStationId, setSelectedStationId] =
    useState<string>(stationIdFromUrl);
  const [pistolets, setPistolets] = useState<PistoletForm[]>([
    { numero: "P1", cuve_id: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: cuves } = useQuery({
    queryKey: ["cuves", selectedStationId],
    queryFn: () => cuveService.getCuvesByStation(selectedStationId),
    enabled: !!selectedStationId,
  });

  const addPistolet = () => {
    setPistolets((prev) => [
      ...prev,
      { numero: `P${prev.length + 1}`, cuve_id: "" },
    ]);
  };

  const removePistolet = (index: number) => {
    setPistolets((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePistolet = (
    index: number,
    field: keyof PistoletForm,
    value: string,
  ) => {
    setPistolets((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const handleSave = async () => {
    if (!selectedStationId) {
      toast.error("Veuillez sélectionner une station");
      return;
    }
    for (const p of pistolets) {
      if (!p.numero.trim()) {
        toast.error("Chaque pistolet doit avoir un numéro");
        return;
      }
      if (!p.cuve_id) {
        toast.error(`Le pistolet "${p.numero}" doit être associé à une cuve`);
        return;
      }
    }

    setIsSaving(true);
    try {
      for (const pistolet of pistolets) {
        const cuve = (cuves ?? []).find((c) => c.id === pistolet.cuve_id);
        await pistoletService.createPistolet({
          station_id: selectedStationId,
          cuve_id: pistolet.cuve_id,
          numero: pistolet.numero,
          type_carburant: cuve?.type_carburant ?? "SP95",
        });
      }

      await stationService.setOnboardingStep(selectedStationId, "boutique");
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success(`${pistolets.length} pistolet(s) créé(s) !`);
      router.push(`/boutique?station_id=${selectedStationId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la sauvegarde",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            Configuration des pistolets
          </CardTitle>
          <CardDescription className="text-slate-300">
            Associez chaque pistolet à sa cuve correspondante
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Station</Label>
            <Select
              value={selectedStationId}
              onValueChange={(v) => setSelectedStationId(v ?? "")}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sélectionner une station">
                  {
                    (stations ?? []).find((s) => s.id === selectedStationId)
                      ?.nom
                  }
                </SelectValue>
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

          {selectedStationId && (
            <div className="space-y-3">
              {pistolets.map((pistolet, index) => (
                <div key={index} className="flex gap-4 ">
                  <div className="flex-1 space-y-2">
                    <Label className="text-slate-300 text-xs">
                      N° Pistolet
                    </Label>
                    <Input
                      value={pistolet.numero}
                      onChange={(e) =>
                        updatePistolet(index, "numero", e.target.value)
                      }
                      placeholder="Ex: P1"
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex-2 space-y-2 w-48">
                    <Label className="text-slate-300 text-xs">
                      Cuve associée
                    </Label>
                    <Select
                      value={pistolet.cuve_id}
                      onValueChange={(v) =>
                        updatePistolet(index, "cuve_id", v ?? "")
                      }
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Cuve...">
                          {
                            (cuves ?? []).find((c) => c.id === pistolet.cuve_id)
                              ?.nom
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(cuves ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nom} ({c.type_carburant})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {pistolets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePistolet(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <button
                onClick={addPistolet}
                className="w-full py-2 border border-dashed border-white/20 rounded-md text-slate-400 hover:border-amber-500 hover:text-amber-400 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-3 h-3" />
                Ajouter un pistolet
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              `/cuves${selectedStationId ? `?station_id=${selectedStationId}` : ""}`,
            )
          }
          className="flex-1 border-white/20 text-white hover:bg-white/10"
        >
          ← Retour
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Continuer →"
          )}
        </Button>
      </div>
    </div>
  );
}
