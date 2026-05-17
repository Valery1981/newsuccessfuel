"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useTypesCarburantActifs } from "@/hooks/useTypesCarburant";
import {
  buildPrixCarburantConfirmSummary,
  getPrixDejaEnregistreAujourdhuiWarning,
  hasPrixCarburantPourDate,
  PRIX_CARBURANT_CONFIRM_WARNINGS,
} from "@/lib/prixCarburant";
import {
  prixCarburantService,
  type PrixCarburantRow,
} from "@/services/prixCarburantService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";

const schema = z
  .object({
    station_id: z.string().min(1, "Station obligatoire"),
    type_carburant_id: z.string().uuid("Type de carburant obligatoire"),
    prix_vente: z.number().positive("Le prix de vente doit être > 0"),
    marge_litre: z.number().positive("La marge doit être > 0"),
  })
  .refine((data) => data.marge_litre < data.prix_vente, {
    message: "La marge doit être strictement inférieure au prix de vente",
    path: ["marge_litre"],
  });

type FormData = z.infer<typeof schema>;

const formatMontant = (n: number | null | undefined): string =>
  n == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
};

export function PrixCarburantPage() {
  const { entreprise } = useAuthStore();
  const entrepriseId = entreprise?.id;
  const queryClient = useQueryClient();
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const { data: typesCarburant } = useTypesCarburantActifs();

  const { data: stations } = useQuery({
    queryKey: ["stations", entrepriseId],
    queryFn: () => stationService.getStationsByEntreprise(entrepriseId!),
    enabled: !!entrepriseId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historique, isLoading } = useQuery({
    queryKey: ["prix-carburant", selectedStationId],
    queryFn: () => prixCarburantService.getHistorique(selectedStationId),
    enabled: !!selectedStationId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      station_id: "",
      type_carburant_id: "",
      prix_vente: 0,
      marge_litre: 0,
    },
  });

  const prixVente = useWatch({ control, name: "prix_vente" });
  const marge = useWatch({ control, name: "marge_litre" });
  const prixAchatCalc = Number(prixVente) - Number(marge);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const tc = (typesCarburant ?? []).find(
        (t) => t.id === data.type_carburant_id,
      );
      return prixCarburantService.create({
        station_id: data.station_id,
        type_carburant_id: data.type_carburant_id,
        type_carburant: tc?.label,
        prix_vente: data.prix_vente,
        marge_litre: data.marge_litre,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["prix-carburant", selectedStationId],
      });
      toast.success("Nouveau prix enregistré");
      setConfirmOpen(false);
      setPendingData(null);
      reset({
        station_id: selectedStationId,
        type_carburant_id: "",
        prix_vente: 0,
        marge_litre: 0,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const historiqueFiltre: PrixCarburantRow[] = historique ?? [];

  const confirmSummary = useMemo(() => {
    if (!pendingData) return null;
    const station = (stations ?? []).find((s) => s.id === pendingData.station_id);
    const typeLabel =
      (typesCarburant ?? []).find((t) => t.id === pendingData.type_carburant_id)
        ?.label ?? "—";
    return buildPrixCarburantConfirmSummary({
      stationNom: station?.nom ?? "—",
      typeLabel,
      prixVente: pendingData.prix_vente,
      margeLitre: pendingData.marge_litre,
    });
  }, [pendingData, stations, typesCarburant]);

  const extraWarning = useMemo(() => {
    if (!pendingData) return null;
    const today = new Date().toISOString().split("T")[0];
    const hasToday = hasPrixCarburantPourDate(
      historiqueFiltre,
      pendingData.type_carburant_id,
      today,
    );
    return getPrixDejaEnregistreAujourdhuiWarning(hasToday);
  }, [pendingData, historiqueFiltre]);

  const openConfirmDialog = (data: FormData) => {
    setPendingData(data);
    setConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    if (pendingData) mutation.mutate(pendingData);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Prix Carburant"
        description="Historisation obligatoire — tout changement crée une nouvelle entrée datée (§6.5)"
      />

      {/* Sélection station */}
      <Card>
        <CardHeader>
          <CardTitle>Station</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedStationId}
            onValueChange={(v: string | null) => {
              const newVal = v ?? "";
              setSelectedStationId(newVal);
              setValue("station_id", newVal);
            }}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Sélectionner une station..." />
            </SelectTrigger>
            <SelectContent>
              {(stations ?? []).map((s: { id: string; nom: string }) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedStationId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Formulaire nouveau prix */}
          <Card>
            <CardHeader>
              <CardTitle>Nouveau prix</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(openConfirmDialog)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>
                    Type de carburant{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v: string | null) =>
                      setValue("type_carburant_id", v ?? "")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(typesCarburant ?? []).map((tc) => (
                        <SelectItem key={tc.id} value={tc.id}>
                          {tc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type_carburant_id && (
                    <p className="text-destructive text-xs">
                      {errors.type_carburant_id.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Prix de vente <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...register("prix_vente", { valueAsNumber: true })}
                    />
                    {errors.prix_vente && (
                      <p className="text-destructive text-xs">
                        {errors.prix_vente.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Marge au litre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...register("marge_litre", { valueAsNumber: true })}
                    />
                    {errors.marge_litre && (
                      <p className="text-destructive text-xs">
                        {errors.marge_litre.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Prix d'achat calculé — lecture seule */}
                <div className="bg-muted rounded-md p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Prix d&apos;achat (calculé automatiquement)
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatMontant(
                      Number.isFinite(prixAchatCalc) ? prixAchatCalc : null,
                    )}
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || mutation.isPending}
                  className="w-full"
                >
                  {isSubmitting || mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer le nouveau prix"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des prix</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement…</p>
              ) : historiqueFiltre.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Aucun prix enregistré pour cette station
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">PV</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">PA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historiqueFiltre.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {formatDate(row.created_at ?? row.date_effet)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {(typesCarburant ?? []).find(
                              (t) => t.id === row.type_carburant_id,
                            )?.label ??
                              row.type_carburant ??
                              "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {formatMontant(row.prix_vente)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {formatMontant(row.marge_litre)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {formatMontant(row.prix_achat)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingData(null);
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              Confirmer le nouveau prix carburant
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground">
                {confirmSummary && (
                  <div className="rounded-md border bg-muted/50 p-3 space-y-2 text-foreground">
                    <p>
                      <span className="text-muted-foreground">Station :</span>{" "}
                      <strong>{confirmSummary.stationNom}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Carburant :</span>{" "}
                      <strong>{confirmSummary.typeLabel}</strong>
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Date d&apos;effet :
                      </span>{" "}
                      <strong>{confirmSummary.dateEffetLabel}</strong>
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs tabular-nums">
                      <div>
                        <span className="block text-muted-foreground font-sans">
                          Prix vente
                        </span>
                        {formatMontant(confirmSummary.prixVente)}
                      </div>
                      <div>
                        <span className="block text-muted-foreground font-sans">
                          Marge/L
                        </span>
                        {formatMontant(confirmSummary.margeLitre)}
                      </div>
                      <div>
                        <span className="block text-muted-foreground font-sans">
                          Prix achat
                        </span>
                        {formatMontant(confirmSummary.prixAchat)}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-medium text-foreground mb-2">
                    Avant de continuer, veuillez noter :
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {PRIX_CARBURANT_CONFIRM_WARNINGS.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                    {extraWarning && (
                      <li className="text-amber-600 dark:text-amber-400">
                        {extraWarning}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                "Confirmer et enregistrer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
