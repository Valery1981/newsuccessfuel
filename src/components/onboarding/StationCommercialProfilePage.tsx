"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  Droplets,
  Flame,
  Loader2,
  ParkingSquare,
  Store,
  Wrench,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";

interface ServiceOption {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "boutique" | "service";
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    key: "has_marchandises_generales",
    label: "Marchandises générales",
    icon: Store,
    category: "boutique",
  },
  {
    key: "has_lubrifiants",
    label: "Lubrifiants",
    icon: Droplets,
    category: "boutique",
  },
  { key: "has_gpl", label: "GPL", icon: Flame, category: "boutique" },
  { key: "has_lavage", label: "Lavage auto", icon: Car, category: "service" },
  {
    key: "has_parking",
    label: "Parking",
    icon: ParkingSquare,
    category: "service",
  },
  {
    key: "has_vulcanisation",
    label: "Vulcanisation",
    icon: Wrench,
    category: "service",
  },
];

export function StationCommercialProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { entreprise } = useAuthStore();
  const stationIdFromUrl = searchParams.get("station_id") ?? "";
  const [selectedStationId, setSelectedStationId] =
    useState<string>(stationIdFromUrl);
  const [services, setServices] = useState<Record<string, boolean>>({
    has_boutique: false,
    has_marchandises_generales: false,
    has_lubrifiants: false,
    has_gpl: false,
    has_lavage: false,
    has_parking: false,
    has_vulcanisation: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const toggleService = (key: string) => {
    setServices((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      // Auto-enable boutique if any boutique item is checked
      const hasBoutique = SERVICE_OPTIONS.filter(
        (s) => s.category === "boutique",
      ).some((s) => updated[s.key]);
      updated.has_boutique = hasBoutique;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedStationId) {
      toast.error("Veuillez sélectionner une station");
      return;
    }

    setIsSaving(true);
    try {
      await stationService.updateStation(selectedStationId, services);
      await stationService.setOnboardingStep(selectedStationId, "complete");
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Profil commercial enregistré !");
      router.push("/validation");
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
            Boutique & Services
          </CardTitle>
          <CardDescription className="text-slate-300">
            Cochez les activités présentes dans votre station
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Boutique */}
          <div>
            <h3 className="text-slate-300 text-sm font-medium mb-3">
              Boutique
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SERVICE_OPTIONS.filter((s) => s.category === "boutique").map(
                (option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleService(option.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      services[option.key]
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/30"
                    }`}
                  >
                    <option.icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">
                      {option.label}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-slate-300 text-sm font-medium mb-3">
              Services
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SERVICE_OPTIONS.filter((s) => s.category === "service").map(
                (option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleService(option.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      services[option.key]
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/30"
                    }`}
                  >
                    <option.icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">
                      {option.label}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              `/pistolets${selectedStationId ? `?station_id=${selectedStationId}` : ""}`,
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
            "Terminer la configuration →"
          )}
        </Button>
      </div>
    </div>
  );
}
