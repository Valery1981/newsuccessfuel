"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cuveService } from "@/services/cuveService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TYPES = [
  { value: "SP95", label: "Essence SP95", compte: "310" as const },
  { value: "SP91", label: "Essence SP91", compte: "310" as const },
  { value: "GO", label: "Gasoil", compte: "320" as const },
  { value: "Petrole", label: "Pétrole lampant", compte: "330" as const },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationPoint {
  hauteur_cm: number;
  volume_litres: number;
  erreur?: string | null;
}

interface CuveDB {
  id: string;
  nom: string;
  type_carburant: string;
  capacite_max: number | null;
  calibrages: { hauteur_cm: number; volume_litres: number }[];
}

// ─── Validation rules (Guide §7) ──────────────────────────────────────────────

function validateCalibrationPoints(
  points: CalibrationPoint[],
  capaciteMax: number | null,
): CalibrationPoint[] {
  const withErrors = points.map((pt, i) => {
    if (pt.hauteur_cm < 1)
      return {
        ...pt,
        erreur: `Hauteur ${pt.hauteur_cm} cm invalide — minimum 1 cm (ligne ${i + 1})`,
      };
    if (i === 0) return { ...pt, erreur: null };
    const prev = points[i - 1];
    if (pt.hauteur_cm === prev.hauteur_cm)
      return {
        ...pt,
        erreur: `Hauteur ${pt.hauteur_cm} cm dupliquée (ligne ${i + 1})`,
      };
    if (pt.hauteur_cm < prev.hauteur_cm)
      return {
        ...pt,
        erreur: `Hauteur ${pt.hauteur_cm} cm < ${prev.hauteur_cm} cm (ligne ${i + 1}) — doit être strictement supérieure`,
      };
    if (pt.volume_litres === prev.volume_litres)
      return {
        ...pt,
        erreur: `Volume ${pt.volume_litres} L dupliqué (ligne ${i + 1})`,
      };
    if (pt.volume_litres <= prev.volume_litres)
      return {
        ...pt,
        erreur: `Volume ${pt.volume_litres} L ≤ ${prev.volume_litres} L (ligne ${i + 1}) — doit être strictement supérieur`,
      };
    return { ...pt, erreur: null };
  });

  return withErrors.map((pt, i, arr) => {
    if (i === arr.length - 1 && capaciteMax && pt.volume_litres < capaciteMax)
      return {
        ...pt,
        erreur: `Dernier volume (${pt.volume_litres} L) < capacité max (${capaciteMax} L) — Règle 1`,
      };
    return pt;
  });
}

// ─── Interval inference ──────────────────────────────────────────────────────

function inferStep(points: CalibrationPoint[]): { dH: number; dV: number } {
  if (points.length < 2) return { dH: 10, dV: 500 };
  const n = Math.min(points.length - 1, 3);
  const start = points.length - 1 - n;
  const intervals: { dH: number; dV: number }[] = [];
  for (let i = start; i < points.length - 1; i++) {
    const dH = points[i + 1].hauteur_cm - points[i].hauteur_cm;
    const dV = points[i + 1].volume_litres - points[i].volume_litres;
    if (dH > 0) intervals.push({ dH, dV });
  }
  if (intervals.length === 0) return { dH: 10, dV: 500 };
  const avgDH = intervals.reduce((s, x) => s + x.dH, 0) / intervals.length;
  const avgDV = intervals.reduce((s, x) => s + x.dV, 0) / intervals.length;
  return { dH: Math.round(avgDH), dV: Math.round(avgDV) };
}

function isCuveCalibrated(cuve: CuveDB): boolean {
  if (cuve.calibrages.length < 2) return false;
  const pts = validateCalibrationPoints(
    cuve.calibrages.map((c) => ({ ...c, erreur: null })),
    cuve.capacite_max,
  );
  return pts.every((p) => !p.erreur);
}

export function FuelTankCalibrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { entreprise } = useAuthStore();

  const stationIdFromUrl = searchParams.get("station_id") ?? "";

  const [newCuve, setNewCuve] = useState({
    nom: "",
    type_carburant: "SP95" as string,
    capacite_max: "",
  });
  const [isCreatingCuve, setIsCreatingCuve] = useState(false);
  const [selectedStationId, setSelectedStationId] =
    useState<string>(stationIdFromUrl);
  const [isContinuing, setIsContinuing] = useState(false);

  const [calibrationDialog, setCalibrationDialog] = useState<{
    open: boolean;
    cuve: CuveDB | null;
    points: CalibrationPoint[];
    isSaving: boolean;
  }>({ open: false, cuve: null, points: [], isSaving: false });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "delete" | "restart" | null;
  }>({ open: false, action: null });

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: cuves = [], refetch: refetchCuves } = useQuery({
    queryKey: ["cuves-with-calibrages", selectedStationId],
    queryFn: () => cuveService.getCuvesByStation(selectedStationId),
    enabled: !!selectedStationId,
  });

  const typedCuves = cuves as unknown as CuveDB[];

  const handleCreateCuve = async () => {
    if (!newCuve.nom.trim()) {
      toast.error("Le nom de la cuve est obligatoire");
      return;
    }
    if (!selectedStationId) {
      toast.error("Veuillez sélectionner une station");
      return;
    }
    setIsCreatingCuve(true);
    try {
      const fuelType = FUEL_TYPES.find(
        (f) => f.value === newCuve.type_carburant,
      );
      await cuveService.createCuve({
        station_id: selectedStationId,
        nom: newCuve.nom,
        type_carburant: newCuve.type_carburant as
          | "SP95"
          | "SP91"
          | "GO"
          | "Petrole",
        compte_stock: fuelType?.compte ?? "310",
        capacite_max: newCuve.capacite_max
          ? Number(newCuve.capacite_max)
          : null,
      });
      setNewCuve({ nom: "", type_carburant: "SP95", capacite_max: "" });
      await refetchCuves();
      toast.success("Cuve ajoutée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur création cuve");
    } finally {
      setIsCreatingCuve(false);
    }
  };

  const handleDeleteCuve = async (cuveId: string, cuveNom: string) => {
    try {
      await cuveService.deleteCuve(cuveId);
      await refetchCuves();
      toast.success(`Cuve "${cuveNom}" supprimée`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur suppression");
    }
  };

  const openCalibrationDialog = useCallback((cuve: CuveDB) => {
    const pts: CalibrationPoint[] =
      cuve.calibrages.length >= 2
        ? cuve.calibrages.map((c) => ({ ...c, erreur: null }))
        : [
            { hauteur_cm: 1, volume_litres: 0, erreur: null },
            { hauteur_cm: 100, volume_litres: 5000, erreur: null },
            { hauteur_cm: 200, volume_litres: 10000, erreur: null },
            { hauteur_cm: 300, volume_litres: 15000, erreur: null },
          ];
    setCalibrationDialog({
      open: true,
      cuve,
      points: validateCalibrationPoints(pts, cuve.capacite_max),
      isSaving: false,
    });
  }, []);

  const updatePoint = (
    idx: number,
    field: "hauteur_cm" | "volume_litres",
    val: number,
  ) => {
    setCalibrationDialog((prev) => {
      const updated = prev.points.map((p, i) =>
        i === idx ? { ...p, [field]: val } : p,
      );
      return {
        ...prev,
        points: validateCalibrationPoints(
          updated,
          prev.cuve?.capacite_max ?? null,
        ),
      };
    });
  };

  const [autoPanel, setAutoPanel] = useState({
    visible: false,
    targetHauteur: "",
    targetVolume: "",
  });

  const addPoint = () => {
    setCalibrationDialog((prev) => {
      const { dH, dV } = inferStep(prev.points);
      const last = prev.points[prev.points.length - 1];
      const pts = [
        ...prev.points,
        {
          hauteur_cm: (last?.hauteur_cm ?? 0) + dH,
          volume_litres: (last?.volume_litres ?? 0) + dV,
          erreur: null,
        },
      ];
      return {
        ...prev,
        points: validateCalibrationPoints(pts, prev.cuve?.capacite_max ?? null),
      };
    });
  };

  const handleAutomate = () => {
    const targetH = Number(autoPanel.targetHauteur);
    const targetV = Number(autoPanel.targetVolume);
    const points = calibrationDialog.points;
    const last = points[points.length - 1];

    if (!targetH || !targetV || isNaN(targetH) || isNaN(targetV)) {
      toast.error("Veuillez saisir une hauteur et un volume finaux valides");
      return;
    }
    if (targetH <= last.hauteur_cm) {
      toast.error(`Hauteur finale doit être > ${last.hauteur_cm} cm`);
      return;
    }
    if (targetV <= last.volume_litres) {
      toast.error(`Volume final doit être > ${last.volume_litres} L`);
      return;
    }

    const { dH, dV } = inferStep(points);
    if (dH <= 0) {
      toast.error(
        "Impossible d'inférer l'intervalle — vérifiez les points existants",
      );
      return;
    }

    const newPoints: CalibrationPoint[] = [...points];
    let curH = last.hauteur_cm + dH;
    let curV = last.volume_litres + dV;
    let steps = 0;
    const MAX = 1000;

    while (curH < targetH - dH / 2 && curV < targetV - dV / 2 && steps < MAX) {
      newPoints.push({
        hauteur_cm: Math.round(curH),
        volume_litres: Math.round(curV),
        erreur: null,
      });
      curH += dH;
      curV += dV;
      steps++;
    }
    newPoints.push({
      hauteur_cm: targetH,
      volume_litres: targetV,
      erreur: null,
    });

    setCalibrationDialog((prev) => ({
      ...prev,
      points: validateCalibrationPoints(
        newPoints,
        prev.cuve?.capacite_max ?? null,
      ),
    }));
    setAutoPanel({ visible: false, targetHauteur: "", targetVolume: "" });
    toast.success(`${steps + 1} point(s) générés automatiquement`);
  };

  const removePoint = (idx: number) => {
    setCalibrationDialog((prev) => {
      const pts = prev.points.filter((_, i) => i !== idx);
      return {
        ...prev,
        points: validateCalibrationPoints(pts, prev.cuve?.capacite_max ?? null),
      };
    });
  };

  const saveCalibration = async () => {
    const { cuve, points } = calibrationDialog;
    if (!cuve) return;
    if (points.length < 2) {
      toast.error("Au moins 2 points de calibrage sont requis");
      return;
    }
    if (points.some((p) => p.erreur)) {
      toast.error("Corrigez les erreurs avant de sauvegarder");
      return;
    }
    setCalibrationDialog((p) => ({ ...p, isSaving: true }));
    try {
      await cuveService.saveCalibrages(
        cuve.id,
        points.map(({ hauteur_cm, volume_litres }) => ({
          hauteur_cm,
          volume_litres,
        })),
      );
      await refetchCuves();
      setCalibrationDialog({
        open: false,
        cuve: null,
        points: [],
        isSaving: false,
      });
      toast.success(`Calibrage de "${cuve.nom}" enregistré`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erreur sauvegarde calibrage",
      );
      setCalibrationDialog((p) => ({ ...p, isSaving: false }));
    }
  };

  const handleContinue = async () => {
    if (!selectedStationId) {
      toast.error("Veuillez sélectionner une station");
      return;
    }
    if (typedCuves.length === 0) {
      toast.error("Créez au moins une cuve avant de continuer");
      return;
    }
    const uncalibrated = typedCuves.filter((c) => !isCuveCalibrated(c));
    if (uncalibrated.length > 0) {
      toast.error(
        `${uncalibrated.length} cuve(s) non calibrée(s) : ${uncalibrated.map((c) => c.nom).join(", ")}`,
      );
      return;
    }
    setIsContinuing(true);
    try {
      await stationService.setOnboardingStep(selectedStationId, "pistolets");
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
      router.push(`/pistolets?station_id=${selectedStationId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setIsContinuing(false);
    }
  };

  const handleDeleteStation = async () => {
    if (!selectedStationId) return;
    try {
      await stationService.deleteStation(selectedStationId);
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Station supprimée");
      router.push("/station");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erreur suppression station",
      );
    }
  };

  const handleRestart = async () => {
    if (!selectedStationId) return;
    try {
      await stationService.deleteStation(selectedStationId);
      await queryClient.invalidateQueries({ queryKey: ["stations"] });
      toast.success("Station supprimée — recommencez la configuration");
      router.push("/station");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const allCalibrated =
    typedCuves.length > 0 && typedCuves.every((c) => isCuveCalibrated(c));

  return (
    <div className="space-y-4">
      {/* ── Station selector + new cuve form ── */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            Cuves &amp; Calibrages
          </CardTitle>
          <CardDescription className="text-slate-300">
            Créez vos cuves puis calibrez chacune d&apos;elles avant de
            continuer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">
              Station <span className="text-red-400">*</span>
            </Label>
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
            <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/2">
              <p className="text-slate-300 text-sm font-medium">
                Ajouter une cuve
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">
                    Nom / N° cuve *
                  </Label>
                  <Input
                    value={newCuve.nom}
                    onChange={(e) =>
                      setNewCuve((p) => ({ ...p, nom: e.target.value }))
                    }
                    placeholder="Ex: Cuve SP95 N°1"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">
                    Type carburant
                  </Label>
                  <Select
                    value={newCuve.type_carburant}
                    onValueChange={(v) =>
                      setNewCuve((p) => ({ ...p, type_carburant: v ?? "SP95" }))
                    }
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">
                    Capacité max (L)
                  </Label>
                  <Input
                    type="number"
                    value={newCuve.capacite_max}
                    onChange={(e) =>
                      setNewCuve((p) => ({
                        ...p,
                        capacite_max: e.target.value,
                      }))
                    }
                    placeholder="Ex: 20000"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-9"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateCuve}
                disabled={isCreatingCuve}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isCreatingCuve ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3 mr-1" />
                )}
                Ajouter la cuve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cuves list ── */}
      {selectedStationId && typedCuves.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              Cuves créées
              <Badge
                className={
                  allCalibrated
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }
                variant="outline"
              >
                {typedCuves.filter((c) => isCuveCalibrated(c)).length}/
                {typedCuves.length} calibrées
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {typedCuves.map((cuve) => {
              const calibrated = isCuveCalibrated(cuve);
              return (
                <div
                  key={cuve.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/4 border border-white/10"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">
                        {cuve.nom}
                      </span>
                      {calibrated ? (
                        <Badge
                          className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0"
                          variant="outline"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Calibrée
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-red-500/20 text-red-400 border-red-500/30 shrink-0"
                          variant="outline"
                        >
                          Non calibrée
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">
                      {FUEL_TYPES.find((f) => f.value === cuve.type_carburant)
                        ?.label ?? cuve.type_carburant}
                      {cuve.capacite_max
                        ? ` — ${cuve.capacite_max.toLocaleString()} L`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      size="sm"
                      variant={calibrated ? "outline" : "default"}
                      onClick={() => openCalibrationDialog(cuve)}
                      className={
                        calibrated
                          ? "border-green-500/30 text-green-400 hover:bg-green-500/10 h-8 text-xs"
                          : "bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs"
                      }
                    >
                      <FlaskConical className="w-3 h-3 mr-1" />
                      {calibrated ? "Recalibrer" : "Calibrer"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteCuve(cuve.id, cuve.nom)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Danger actions ── */}
      {selectedStationId && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDialog({ open: true, action: "restart" })}
            className="text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Recommencer depuis le début
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDialog({ open: true, action: "delete" })}
            className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Supprimer cette station
          </Button>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/entreprise")}
          className="flex-1 border-white/20 text-black hover:bg-white/10"
        >
          ← Retour
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isContinuing || !allCalibrated}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50"
        >
          {isContinuing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Chargement...
            </>
          ) : (
            "Continuer →"
          )}
        </Button>
      </div>

      {/* ═══ CALIBRATION DIALOG ═══ */}
      <Dialog
        open={calibrationDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCalibrationDialog({
              open: false,
              cuve: null,
              points: [],
              isSaving: false,
            });
            setAutoPanel({
              visible: false,
              targetHauteur: "",
              targetVolume: "",
            });
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-400" />
              Calibrage — {calibrationDialog.cuve?.nom}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Règle 1 : dernier volume ≥ capacité max (
              {calibrationDialog.cuve?.capacite_max ?? "—"} L) · Règle 2 :
              volumes strictement croissants · Règle 3 : pas de doublons
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 my-2">
            <div className="bg-white/3 rounded-md overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] text-xs text-slate-400 px-3 py-2 border-b border-white/10 sticky top-0 bg-slate-900/90">
                <span>Hauteur (cm)</span>
                <span>Volume (litres)</span>
                <span />
              </div>
              {calibrationDialog.points.map((pt, idx) => (
                <div
                  key={idx}
                  className={`border-b border-white/5 last:border-0 ${pt.erreur ? "bg-red-500/10" : ""}`}
                >
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-2">
                    <Input
                      type="number"
                      value={pt.hauteur_cm}
                      onChange={(e) =>
                        updatePoint(idx, "hauteur_cm", Number(e.target.value))
                      }
                      min={1}
                      max={300}
                      className={`h-7 text-sm bg-white/10 text-white ${pt.erreur ? "border-red-500" : "border-white/20"}`}
                    />
                    <Input
                      type="number"
                      value={pt.volume_litres}
                      onChange={(e) =>
                        updatePoint(
                          idx,
                          "volume_litres",
                          Number(e.target.value),
                        )
                      }
                      min={0}
                      className={`h-7 text-sm bg-white/10 text-white ${pt.erreur ? "border-red-500" : "border-white/20"}`}
                    />
                    <button
                      onClick={() => removePoint(idx)}
                      disabled={calibrationDialog.points.length <= 2}
                      className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {pt.erreur && (
                    <div className="flex items-start gap-1 text-xs text-red-400 px-3 pb-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{pt.erreur}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={addPoint}
              className="text-amber-400 hover:text-amber-300 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Ajouter un point
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={calibrationDialog.points.length < 5}
              onClick={() =>
                setAutoPanel({
                  visible: true,
                  targetHauteur: "",
                  targetVolume: String(
                    calibrationDialog.cuve?.capacite_max ?? "",
                  ),
                })
              }
              className="text-blue-400 hover:text-blue-300 text-xs disabled:opacity-40"
              title={
                calibrationDialog.points.length < 5
                  ? "Créez au moins 5 points pour activer l'automatisation"
                  : ""
              }
            >
              <Wand2 className="w-3 h-3 mr-1" />
              Automatiser
            </Button>
          </div>

          {autoPanel.visible && (
            <div className="border border-blue-500/30 rounded-lg p-3 bg-blue-500/5 space-y-2">
              <p className="text-blue-400 text-xs font-medium flex items-center gap-1">
                <Wand2 className="w-3 h-3" />
                Génération automatique — point final de la cuve
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">
                    Hauteur finale (cm)
                  </Label>
                  <Input
                    type="number"
                    value={autoPanel.targetHauteur}
                    onChange={(e) =>
                      setAutoPanel((p) => ({
                        ...p,
                        targetHauteur: e.target.value,
                      }))
                    }
                    placeholder="Ex: 300"
                    className="h-7 text-sm bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">
                    Volume final (L)
                  </Label>
                  <Input
                    type="number"
                    value={autoPanel.targetVolume}
                    onChange={(e) =>
                      setAutoPanel((p) => ({
                        ...p,
                        targetVolume: e.target.value,
                      }))
                    }
                    placeholder={String(
                      calibrationDialog.cuve?.capacite_max ?? "Ex: 20000",
                    )}
                    className="h-7 text-sm bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAutomate}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-7 text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Générer les points
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAutoPanel({
                      visible: false,
                      targetHauteur: "",
                      targetVolume: "",
                    })
                  }
                  className="text-slate-400 h-7 text-xs"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setCalibrationDialog({
                  open: false,
                  cuve: null,
                  points: [],
                  isSaving: false,
                })
              }
              className="border-white/20 text-black hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={saveCalibration}
              disabled={
                calibrationDialog.isSaving ||
                calibrationDialog.points.some((p) => !!p.erreur) ||
                calibrationDialog.points.length < 2
              }
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {calibrationDialog.isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Enregistrer le calibrage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CONFIRM DIALOG ═══ */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, action: null });
        }}
      >
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDialog.action === "delete"
                ? "Supprimer la station ?"
                : "Recommencer depuis le début ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirmDialog.action === "delete"
                ? "Cette action est irréversible. La station, ses cuves et tous ses calibrages seront définitivement supprimés."
                : "Toutes les cuves et calibrages seront supprimés. Vous serez redirigé vers les informations de la station."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={
                confirmDialog.action === "delete"
                  ? handleDeleteStation
                  : handleRestart
              }
              className={
                confirmDialog.action === "delete"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }
            >
              {confirmDialog.action === "delete" ? "Supprimer" : "Recommencer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
