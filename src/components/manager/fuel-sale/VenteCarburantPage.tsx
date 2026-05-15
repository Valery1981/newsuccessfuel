"use client";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildShiftPrintHtml, openPrintWindow } from "@/lib/printUtils";
import { formatCurrency } from "@/lib/utils";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle,
  Clock,
  Fuel,
  Info,
  Loader2,
  Lock,
  Printer,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const supabase = createClient();

interface Shift {
  id: string;
  station_id: string;
  pompiste_id: string | null;
  pompiste_nom?: string;
  numero_shift: string;
  ca_total?: number | null;
  total_paiements?: number | null;
  ecart_caisse?: number | null;
  heure_cloture?: string | null;
  statut: "en_cours" | "cloture" | "valide";
  date_shift: string;
  mouvemente: boolean;
  comptabilise: boolean;
}

interface Pistolet {
  id: string;
  numero: string;
  cuve_id: string;
  station_id: string;
  type_carburant: string;
  index_actuel?: number; // colonne réelle DB : index_actuel
}

export function VenteCarburantPage() {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState("");
  const [clotureDialogOpen, setClotureDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [paiements, setPaiements] = useState<
    Array<{ tresorerie_id: string; montant: string; reference: string }>
  >([{ tresorerie_id: "", montant: "", reference: "" }]);
  const [indexFinal, setIndexFinal] = useState("");
  const [pistoletId, setPistoletId] = useState("");

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: pistolets } = useQuery<Pistolet[]>({
    queryKey: ["pistolets", selectedStation],
    queryFn: async () => {
      if (!selectedStation) return [];
      const { data } = await supabase
        .from("pistolets")
        .select("id, numero, cuve_id, station_id, type_carburant, index_actuel")
        .eq("station_id", selectedStation)
        .eq("is_active", true)
        .order("numero");
      return (data ?? []) as unknown as Pistolet[];
    },
    enabled: !!selectedStation,
  });

  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("tresoreries")
        .select("id, libelle, type, numero_compte")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!entreprise?.id,
  });

  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ["shifts-carburant", selectedStation],
    queryFn: async () => {
      if (!selectedStation) return [];
      const { data } = await supabase
        .from("shifts_carburant")
        .select(
          `id, station_id, numero_shift, pompiste_id, statut, date_shift, heure_cloture,
          ca_total, total_paiements, ecart_caisse, mouvemente_at, comptabilise_at,
          tiers(nom)`,
        )
        .eq("station_id", selectedStation)
        .order("date_shift", { ascending: false })
        .limit(50);
      return ((data ?? []) as unknown[]).map((s: unknown) => {
        const row = s as Record<string, unknown>;
        const tiers = row.tiers as { nom: string } | null;
        return {
          id: row.id as string,
          station_id: row.station_id as string,
          pompiste_id: (row.pompiste_id as string) ?? null,
          pompiste_nom: tiers?.nom,
          numero_shift: row.numero_shift as string,
          statut:
            (row.statut as "en_cours" | "cloture" | "valide") ?? "en_cours",
          date_shift: row.date_shift as string,
          ca_total: row.ca_total as number | null,
          total_paiements: row.total_paiements as number | null,
          ecart_caisse: row.ecart_caisse as number | null,
          heure_cloture: row.heure_cloture as string | null,
          mouvemente: !!row.mouvemente_at,
          comptabilise: !!row.comptabilise_at,
        } as Shift;
      });
    },
    enabled: !!selectedStation,
  });

  // Clôture d'un shift : RÈGLE GUIDE - c'est un supérieur hiérarchique qui clôture
  const cloturerShiftMutation = useMutation({
    mutationFn: async ({
      shiftId,
      pistoletId: pId,
      indexFinalNum,
      paie,
    }: {
      shiftId: string;
      pistoletId: string;
      indexFinalNum: number;
      paie: Array<{
        tresorerie_id: string;
        montant: number;
        reference?: string;
      }>;
    }) => {
      if (!entreprise || !compte) throw new Error("Session invalide");

      // Vérification : le shift doit être "en_cours"
      const { data: shiftRow, error: shiftErr } = await supabase
        .from("shifts_carburant")
        .select("id, station_id, statut")
        .eq("id", shiftId)
        .single();
      if (shiftErr) throw shiftErr;
      if (!shiftRow || shiftRow.statut !== "en_cours")
        throw new Error("Ce shift n'est pas en cours");

      // Récupérer pistolet (index_actuel + cuve + type)
      const { data: pistoletRow, error: pistoletErr } = await supabase
        .from("pistolets")
        .select("id, cuve_id, type_carburant, index_actuel")
        .eq("id", pId)
        .single();
      if (pistoletErr) throw pistoletErr;
      const idxInitial = pistoletRow.index_actuel ?? 0;
      const volumeVendu = indexFinalNum - idxInitial;

      // Prix de vente actuel pour ce type de carburant à cette station
      const { data: prixRow } = await supabase
        .from("prix_carburant")
        .select("prix_vente")
        .eq("station_id", shiftRow.station_id!)
        .eq("type_carburant", pistoletRow.type_carburant)
        .order("date_effet", { ascending: false })
        .limit(1)
        .maybeSingle();
      const prixVente = prixRow?.prix_vente ?? 0;
      const caTotal = volumeVendu * prixVente;

      // Insérer ligne de shift
      const { error: ligneErr } = await supabase
        .from("lignes_shift_carburant")
        .insert({
          shift_id: shiftId,
          pistolet_id: pId,
          cuve_id: pistoletRow.cuve_id,
          type_carburant: pistoletRow.type_carburant,
          index_initial: idxInitial,
          index_final: indexFinalNum,
          volume_vendu: volumeVendu,
          prix_vente: prixVente,
          ca: caTotal,
        });
      if (ligneErr) throw ligneErr;

      // Mettre à jour l'index du pistolet
      await supabase
        .from("pistolets")
        .update({ index_actuel: indexFinalNum })
        .eq("id", pId);

      const montantTotal = paie.reduce((acc, p) => acc + p.montant, 0);

      // Mise à jour shift
      const { error: updateErr } = await supabase
        .from("shifts_carburant")
        .update({
          heure_cloture: new Date().toISOString(),
          ca_total: caTotal,
          total_paiements: montantTotal,
          ecart_caisse: montantTotal - caTotal,
          statut: "cloture",
          cloture_par: compte.session_id ?? compte.id,
        })
        .eq("id", shiftId);
      if (updateErr) throw updateErr;

      // Enregistrement paiements shift
      if (paie.length > 0) {
        await supabase.from("paiements_shift_carburant").insert(
          paie.map((p) => ({
            shift_id: shiftId,
            mode_paiement: "especes",
            tresorerie_id: p.tresorerie_id,
            montant: p.montant,
            reference: p.reference ?? null,
          })),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts-carburant"] });
      queryClient.invalidateQueries({ queryKey: ["pistolets"] });
      toast.success(
        "Shift clôturé avec succès. Le prochain shift peut commencer.",
      );
      setClotureDialogOpen(false);
      setSelectedShift(null);
      setIndexFinal("");
      setPistoletId("");
      setPaiements([{ tresorerie_id: "", montant: "", reference: "" }]);
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  // Mouvementer stock (marque le shift comme mouvementé)
  const mouvementerMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from("shifts_carburant")
        .update({ mouvemente_at: new Date().toISOString() })
        .eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts-carburant"] });
      toast.success("Stock mouvementé — CMUP recalculé");
    },
    onError: (error) =>
      toast.error("Erreur mouventation : " + (error as Error).message),
  });

  // Comptabiliser (marque le shift comme comptabilisé)
  const comptabiliserMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from("shifts_carburant")
        .update({ comptabilise_at: new Date().toISOString() })
        .eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts-carburant"] });
      toast.success("Shift comptabilisé — Grand Livre mis à jour");
    },
    onError: (error) =>
      toast.error("Erreur comptabilisation : " + (error as Error).message),
  });

  const shiftsEnCours = (shifts ?? []).filter((s) => s.statut === "en_cours");
  const shiftsClotures = (shifts ?? []).filter((s) => s.statut !== "en_cours");

  const selectedPistolet = pistolets?.find((p) => p.id === pistoletId);
  const totalPaiements = paiements.reduce(
    (acc, p) => acc + (Number(p.montant) || 0),
    0,
  );

  if (isLoading && selectedStation) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Vente Carburant — Shifts"
        description="Gestion des shifts pompiste. Clôture automatique ouvre le shift suivant."
      />

      <Alert className="border-blue-200 bg-blue-50 mt-4">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Règle :</strong> Pas d&apos;ouverture manuelle. Chaque clôture
          de shift ouvre automatiquement le suivant. L&apos;index initial du
          nouveau shift = index final du shift précédent. La clôture est
          effectuée par un responsable (session différente du pompiste).
        </AlertDescription>
      </Alert>

      {/* Sélection station */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap">Station :</Label>
            <Select
              value={selectedStation}
              onValueChange={(v) => {
                setSelectedStation(v ?? "");
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner une station">
                  {(stations ?? []).find((s) => s.id === selectedStation)?.nom}
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
        </CardContent>
      </Card>

      {selectedStation && (
        <Tabs defaultValue="en-cours" className="mt-6">
          <TabsList>
            <TabsTrigger value="en-cours">
              Shifts en cours
              {shiftsEnCours.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {shiftsEnCours.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="en-cours" className="mt-4">
            {shiftsEnCours.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Fuel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun shift en cours sur cette station.</p>
                  <p className="text-sm mt-1">
                    Les shifts démarrent automatiquement à la clôture du
                    précédent.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {shiftsEnCours.map((shift) => (
                  <Card key={shift.id} className="border-amber-200">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="font-medium">
                              {shift.pompiste_nom ?? "Pompiste"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Shift {shift.numero_shift}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {format(new Date(shift.date_shift), "dd MMM", {
                                locale: fr,
                              })}
                            </Badge>
                          </div>
                        </div>
                        <PermissionGate permission="traitement_vente_carburant_cloture">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedShift(shift);
                              setClotureDialogOpen(true);
                            }}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Clôturer
                          </Button>
                        </PermissionGate>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historique" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>N° Shift</TableHead>
                        <TableHead>Pompiste</TableHead>
                        <TableHead>CA total</TableHead>
                        <TableHead>Écart caisse</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftsClotures.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="text-sm">
                            {format(new Date(shift.date_shift), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {shift.numero_shift}
                          </TableCell>
                          <TableCell>{shift.pompiste_nom ?? "—"}</TableCell>
                          <TableCell>
                            {formatCurrency(shift.ca_total ?? 0)}
                          </TableCell>
                          <TableCell>
                            {shift.ecart_caisse !== null &&
                            shift.ecart_caisse !== undefined
                              ? formatCurrency(shift.ecart_caisse)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <ShiftStatusBadge
                              statut={shift.statut}
                              mouvemente={shift.mouvemente}
                              comptabilise={shift.comptabilise}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!shift.mouvemente &&
                                shift.statut === "cloture" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    disabled={mouvementerMutation.isPending}
                                    onClick={() =>
                                      mouvementerMutation.mutate(shift.id)
                                    }
                                  >
                                    Mouvementer
                                  </Button>
                                )}
                              {shift.mouvemente && !shift.comptabilise && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  disabled={comptabiliserMutation.isPending}
                                  onClick={() =>
                                    comptabiliserMutation.mutate(shift.id)
                                  }
                                >
                                  Comptabiliser
                                </Button>
                              )}
                              {shift.comptabilise && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs no-print"
                                  onClick={() =>
                                    openPrintWindow(
                                      `Shift ${shift.date_shift}`,
                                      buildShiftPrintHtml({
                                        ...shift,
                                        index_initial: 0,
                                        station_nom: stations?.find(
                                          (s) => s.id === shift.station_id,
                                        )?.nom,
                                        entreprise_nom: entreprise?.nom,
                                      }),
                                    )
                                  }
                                >
                                  <Printer className="w-3 h-3 mr-1" />
                                  Imprimer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog de clôture */}
      <Dialog open={clotureDialogOpen} onOpenChange={setClotureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clôturer le shift</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Pompiste :</span>
                  <strong>{selectedShift.pompiste_nom ?? "—"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Shift N° :</span>
                  <strong>{selectedShift.numero_shift}</strong>
                </div>
              </div>

              <div>
                <Label>Pistolet *</Label>
                <Select
                  value={pistoletId}
                  onValueChange={(v) => setPistoletId(v ?? "")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner le pistolet clôturé" />
                  </SelectTrigger>
                  <SelectContent>
                    {(pistolets ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        Pistolet {p.numero} — {p.type_carburant}
                        {p.index_actuel !== undefined
                          ? ` (idx: ${p.index_actuel.toLocaleString("fr-FR")})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPistolet?.index_actuel !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Index initial :{" "}
                    <strong>
                      {selectedPistolet.index_actuel.toLocaleString("fr-FR")}
                    </strong>
                  </p>
                )}
              </div>

              <div>
                <Label>Index final *</Label>
                <Input
                  type="number"
                  value={indexFinal}
                  onChange={(e) => setIndexFinal(e.target.value)}
                  placeholder="Saisir l'index final du compteur"
                  className="mt-1"
                />
                {indexFinal &&
                  selectedPistolet?.index_actuel !== undefined &&
                  Number(indexFinal) > selectedPistolet.index_actuel && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Volume vendu :{" "}
                      <strong>
                        {(
                          Number(indexFinal) - selectedPistolet.index_actuel
                        ).toLocaleString("fr-FR")}{" "}
                        L
                      </strong>
                    </p>
                  )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Paiements reçus *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPaiements((p) => [
                        ...p,
                        { tresorerie_id: "", montant: "", reference: "" },
                      ])
                    }
                  >
                    + Mode paiement
                  </Button>
                </div>
                <div className="space-y-2">
                  {paiements.map((paie, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <Select
                        value={paie.tresorerie_id}
                        onValueChange={(v) =>
                          setPaiements((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, tresorerie_id: v ?? "" } : p,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mode">
                            {
                              (tresoreries ?? []).find(
                                (t) => t.id === paie.tresorerie_id,
                              )?.libelle
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(tresoreries ?? []).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={paie.montant}
                        onChange={(e) =>
                          setPaiements((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, montant: e.target.value } : p,
                            ),
                          )
                        }
                        placeholder="Montant"
                      />
                      <Input
                        value={paie.reference}
                        onChange={(e) =>
                          setPaiements((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, reference: e.target.value }
                                : p,
                            ),
                          )
                        }
                        placeholder="Référence"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-sm font-medium">
                  <span>Total paiements :</span>
                  <span>{formatCurrency(totalPaiements)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={
                  !pistoletId ||
                  !indexFinal ||
                  Number(indexFinal) <= (selectedPistolet?.index_actuel ?? 0) ||
                  cloturerShiftMutation.isPending
                }
                onClick={() => {
                  if (!pistoletId) {
                    toast.error("Sélectionnez un pistolet");
                    return;
                  }
                  const validPaiements = paiements
                    .filter((p) => p.tresorerie_id && Number(p.montant) > 0)
                    .map((p) => ({
                      tresorerie_id: p.tresorerie_id,
                      montant: Number(p.montant),
                      reference: p.reference,
                    }));
                  if (validPaiements.length === 0) {
                    toast.error("Ajoutez au moins un paiement");
                    return;
                  }
                  cloturerShiftMutation.mutate({
                    shiftId: selectedShift.id,
                    pistoletId,
                    indexFinalNum: Number(indexFinal),
                    paie: validPaiements,
                  });
                }}
              >
                {cloturerShiftMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Clôturer le shift
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function ShiftStatusBadge({
  statut,
  mouvemente,
  comptabilise,
}: {
  statut: string;
  mouvemente: boolean;
  comptabilise: boolean;
}) {
  if (comptabilise)
    return <Badge className="bg-green-600 text-white">Comptabilisé</Badge>;
  if (mouvemente)
    return <Badge className="bg-blue-600 text-white">Mouvementé</Badge>;
  if (statut === "cloture") return <Badge variant="secondary">Clôturé</Badge>;
  return (
    <Badge variant="outline" className="border-amber-500 text-amber-700">
      En cours
    </Badge>
  );
}
