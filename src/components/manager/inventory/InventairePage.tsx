"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  inventaireService,
  type Inventaire,
  type LigneInventaireBoutique,
  type LigneInventaireCarburant,
} from "@/services/inventaireService";
import { stationService } from "@/services/stationService";
import { tiersService } from "@/services/tiersService";
import { useAuthStore } from "@/stores/authStore";
import type { InventaireType, MotifEcart } from "@/types/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Eye,
  Loader2,
  Plus,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// ── Types locaux ───────────────────────────────────────────────────────────────

interface LigneCarburantLocal extends LigneInventaireCarburant {
  jauge_input: string;
  volume_calcule: number | null;
  calcul_en_cours: boolean;
}

interface LigneBoutiqueLocal extends LigneInventaireBoutique {
  quantite_input: string;
  motif_input: MotifEcart | "";
  motif_detail_input: string;
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  if (statut === "regularise")
    return (
      <Badge className="bg-green-600 text-white text-xs">Régularisé</Badge>
    );
  if (statut === "enregistre")
    return (
      <Badge className="bg-orange-500 text-white text-xs">Enregistré</Badge>
    );
  return <Badge className="bg-blue-600 text-white text-xs">En cours</Badge>;
}

function EcartBadge({ ecart }: { ecart: number | null }) {
  if (ecart === null) return <span className="text-muted-foreground">—</span>;
  if (Math.abs(ecart) < 0.001)
    return <span className="text-green-600 font-medium">0</span>;
  return (
    <span
      className={
        ecart < 0 ? "text-red-600 font-medium" : "text-blue-600 font-medium"
      }
    >
      {ecart > 0 ? "+" : ""}
      {formatNumber(ecart, 3)}
    </span>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export interface InventairePageProps {
  /** Onglet initial — permet aux routes /inventaire-carburant et /inventaire-boutique de pointer directement (§6.4) */
  initialTab?: InventaireType;
}

export function InventairePage({
  initialTab = "carburant",
}: InventairePageProps = {}) {
  const { compte, entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<InventaireType>(initialTab);
  const [dialogNouvel, setDialogNouvel] = useState(false);
  const [dialogFormulaire, setDialogFormulaire] = useState(false);
  const [dialogRegularisation, setDialogRegularisation] = useState(false);
  const [inventaireSelectionne, setInventaireSelectionne] =
    useState<Inventaire | null>(null);

  // Formulaire nouvel inventaire
  const [stationChoisie, setStationChoisie] = useState("");

  // Lignes édition
  const [lignesCarburant, setLignesCarburant] = useState<LigneCarburantLocal[]>(
    [],
  );
  const [lignesBoutique, setLignesBoutique] = useState<LigneBoutiqueLocal[]>(
    [],
  );

  // Régularisation
  const [lignesRegCarb, setLignesRegCarb] = useState<
    Record<string, { motif: MotifEcart | ""; responsable_id: string }>
  >({});
  const [lignesRegBout, setLignesRegBout] = useState<
    Record<
      string,
      { motif: MotifEcart | ""; motif_detail: string; responsable_id: string }
    >
  >({});

  // ── Données ──────────────────────────────────────────────────────────────────

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const stationIds = (stations ?? []).map((s) => s.id);

  const { data: inventaires, isLoading } = useQuery({
    queryKey: ["inventaires", stationIds.join(","), activeTab],
    queryFn: () =>
      stationIds.length > 0
        ? inventaireService.getInventairesByStations(stationIds, activeTab)
        : [],
    enabled: stationIds.length > 0,
  });

  const { data: employes } = useQuery({
    queryKey: ["employes", entreprise?.id],
    queryFn: () => (entreprise ? tiersService.getEmployes(entreprise.id) : []),
    enabled: !!entreprise?.id,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const creerInventaireMutation = useMutation({
    mutationFn: async () => {
      if (!stationChoisie) throw new Error("Sélectionnez une station");
      const inv = await inventaireService.creerInventaire({
        station_id: stationChoisie,
        type: activeTab,
        created_by: compte?.session_id ?? null,
      });
      if (activeTab === "carburant") {
        await inventaireService.initialiserLignesCarburant(
          inv.id,
          stationChoisie,
        );
      } else {
        await inventaireService.initialiserLignesBoutique(
          inv.id,
          stationChoisie,
        );
      }
      return inv;
    },
    onSuccess: async (inv) => {
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
      setDialogNouvel(false);
      toast.success("Inventaire créé");
      await ouvrirFormulaire(inv);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const enregistrerMutation = useMutation({
    mutationFn: async () => {
      if (!inventaireSelectionne)
        throw new Error("Aucun inventaire sélectionné");
      if (activeTab === "carburant") {
        for (const l of lignesCarburant) {
          if (l.volume_calcule !== null) {
            await inventaireService.updateLigneCarburant(l.id, {
              jauge_reelle_cm: Number(l.jauge_input),
              volume_reel_litres: l.volume_calcule,
            });
          }
        }
      } else {
        for (const l of lignesBoutique) {
          if (l.quantite_input !== "") {
            await inventaireService.updateLigneBoutique(l.id, {
              quantite_reelle: Number(l.quantite_input),
              motif: l.motif_input || null,
              motif_detail: l.motif_detail_input || null,
            });
          }
        }
      }
      await inventaireService.enregistrerInventaire(inventaireSelectionne.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
      setDialogFormulaire(false);
      toast.success("Inventaire enregistré");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const regulariserMutation = useMutation({
    mutationFn: async () => {
      if (!inventaireSelectionne || !compte)
        throw new Error("Session invalide");
      if (activeTab === "carburant") {
        for (const [id, vals] of Object.entries(lignesRegCarb)) {
          if (!vals.motif) continue;
          await inventaireService.regulariserLigneCarburant(id, {
            motif: vals.motif as MotifEcart,
            responsable_id: vals.responsable_id || null,
          });
        }
      } else {
        for (const [id, vals] of Object.entries(lignesRegBout)) {
          if (!vals.motif) continue;
          await inventaireService.regulariserLigneBoutique(id, {
            motif: vals.motif as MotifEcart,
            motif_detail: vals.motif_detail || null,
            responsable_id: vals.responsable_id || null,
          });
        }
      }
      await inventaireService.cloturerRegularisation(
        inventaireSelectionne.id,
        compte.session_id ?? "",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
      setDialogRegularisation(false);
      toast.success("Inventaire régularisé");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // ── Actions ───────────────────────────────────────────────────────────────────

  const ouvrirFormulaire = useCallback(async (inv: Inventaire) => {
    setInventaireSelectionne(inv);
    if (inv.type === "carburant") {
      const lignes = await inventaireService.getLignesCarburant(inv.id);
      setLignesCarburant(
        lignes.map((l) => ({
          ...l,
          jauge_input: l.jauge_reelle_cm?.toString() ?? "",
          volume_calcule: l.volume_reel_litres,
          calcul_en_cours: false,
        })),
      );
    } else {
      const lignes = await inventaireService.getLignesBoutique(inv.id);
      setLignesBoutique(
        lignes.map((l) => ({
          ...l,
          quantite_input: l.quantite_reelle?.toString() ?? "",
          motif_input: (l.motif as MotifEcart | null) ?? "",
          motif_detail_input: l.motif_detail ?? "",
        })),
      );
    }
    setDialogFormulaire(true);
  }, []);

  const ouvrirRegularisation = useCallback(async (inv: Inventaire) => {
    setInventaireSelectionne(inv);
    if (inv.type === "carburant") {
      const lignes = await inventaireService.getLignesCarburant(inv.id);
      const init: typeof lignesRegCarb = {};
      for (const l of lignes) {
        init[l.id] = {
          motif: (l.motif as MotifEcart | null) ?? "",
          responsable_id: l.responsable_id ?? "",
        };
      }
      setLignesRegCarb(init);
    } else {
      const lignes = await inventaireService.getLignesBoutique(inv.id);
      const init: typeof lignesRegBout = {};
      for (const l of lignes) {
        init[l.id] = {
          motif: (l.motif as MotifEcart | null) ?? "",
          motif_detail: l.motif_detail ?? "",
          responsable_id: l.responsable_id ?? "",
        };
      }
      setLignesRegBout(init);
    }
    setDialogRegularisation(true);
  }, []);

  const handleJaugeChange = useCallback(
    async (idx: number, value: string) => {
      setLignesCarburant((prev) =>
        prev.map((l, i) =>
          i === idx ? { ...l, jauge_input: value, calcul_en_cours: true } : l,
        ),
      );
      const ligne = lignesCarburant[idx];
      if (!ligne || value === "") {
        setLignesCarburant((prev) =>
          prev.map((l, i) =>
            i === idx
              ? { ...l, volume_calcule: null, calcul_en_cours: false }
              : l,
          ),
        );
        return;
      }
      try {
        const vol = await inventaireService.getVolumeFromJauge(
          ligne.cuve_id,
          Number(value),
        );
        setLignesCarburant((prev) =>
          prev.map((l, i) =>
            i === idx
              ? { ...l, volume_calcule: vol, calcul_en_cours: false }
              : l,
          ),
        );
      } catch {
        setLignesCarburant((prev) =>
          prev.map((l, i) =>
            i === idx
              ? { ...l, volume_calcule: null, calcul_en_cours: false }
              : l,
          ),
        );
      }
    },
    [lignesCarburant],
  );

  if (isLoading) return <PageLoading />;

  const inventairesFiltres = (inventaires ?? []).filter(
    (inv) => inv.type === activeTab,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Inventaires"
        description="Gérez les inventaires physiques de stock"
        actions={
          <Button
            onClick={() => {
              setStationChoisie("");
              setDialogNouvel(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvel inventaire
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as InventaireType)}
      >
        <TabsList>
          <TabsTrigger value="carburant">Carburant</TabsTrigger>
          <TabsTrigger value="boutique">Boutique</TabsTrigger>
        </TabsList>

        {(["carburant", "boutique"] as const).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            {inventairesFiltres.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Aucun inventaire"
                description="Créez votre premier inventaire physique"
                action={{
                  label: "Nouvel inventaire",
                  onClick: () => {
                    setStationChoisie("");
                    setDialogNouvel(true);
                  },
                }}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventairesFiltres.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.station_nom ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(
                                inv.date_inventaire,
                                "dd/MM/yyyy HH:mm",
                              )}
                            </TableCell>
                            <TableCell>
                              <StatutBadge statut={inv.statut} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {inv.statut === "en_cours" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => ouvrirFormulaire(inv)}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Saisir
                                  </Button>
                                )}
                                {inv.statut === "enregistre" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      onClick={() => ouvrirFormulaire(inv)}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Voir
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs text-orange-600 border-orange-300"
                                      onClick={() => ouvrirRegularisation(inv)}
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Régulariser
                                    </Button>
                                  </>
                                )}
                                {inv.statut === "regularise" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs"
                                    onClick={() => ouvrirFormulaire(inv)}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Voir
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
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog Nouvel inventaire */}
      <Dialog open={dialogNouvel} onOpenChange={setDialogNouvel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel inventaire {activeTab}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Station *</Label>
              <Select
                value={stationChoisie}
                onValueChange={(v) => setStationChoisie(v ?? "")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une station">
                    {(stations ?? []).find((s) => s.id === stationChoisie)?.nom}
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
            <Button
              className="w-full"
              onClick={() => creerInventaireMutation.mutate()}
              disabled={!stationChoisie || creerInventaireMutation.isPending}
            >
              {creerInventaireMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Créer et saisir l&apos;inventaire
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Formulaire saisie */}
      <Dialog open={dialogFormulaire} onOpenChange={setDialogFormulaire}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Inventaire {inventaireSelectionne?.type} —{" "}
              {inventaireSelectionne?.station_nom} —{" "}
              <StatutBadge statut={inventaireSelectionne?.statut ?? ""} />
            </DialogTitle>
          </DialogHeader>

          {inventaireSelectionne?.type === "carburant" ? (
            <FormulaireCarburant
              lignes={lignesCarburant}
              readonly={inventaireSelectionne.statut !== "en_cours"}
              onJaugeChange={handleJaugeChange}
            />
          ) : (
            <FormulaireBoutique
              lignes={lignesBoutique}
              readonly={inventaireSelectionne?.statut !== "en_cours"}
              onChange={setLignesBoutique}
            />
          )}

          {inventaireSelectionne?.statut === "en_cours" && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => enregistrerMutation.mutate()}
                disabled={enregistrerMutation.isPending}
              >
                {enregistrerMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <CheckCircle className="w-4 h-4 mr-2" />
                Enregistrer l&apos;inventaire
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Régularisation */}
      <Dialog
        open={dialogRegularisation}
        onOpenChange={setDialogRegularisation}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Régularisation — {inventaireSelectionne?.station_nom}
            </DialogTitle>
          </DialogHeader>

          {inventaireSelectionne?.type === "carburant" ? (
            <RegularisationCarburant
              inventaireId={inventaireSelectionne.id}
              lignesReg={lignesRegCarb}
              employes={employes ?? []}
              onChangeLigne={(id, vals) =>
                setLignesRegCarb((prev) => ({ ...prev, [id]: vals }))
              }
            />
          ) : (
            <RegularisationBoutique
              inventaireId={inventaireSelectionne?.id ?? ""}
              lignesReg={lignesRegBout}
              employes={employes ?? []}
              onChangeLigne={(id, vals) =>
                setLignesRegBout((prev) => ({ ...prev, [id]: vals }))
              }
            />
          )}

          <div className="flex justify-end mt-4">
            <Button
              onClick={() => regulariserMutation.mutate()}
              disabled={regulariserMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {regulariserMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Clôturer la régularisation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function FormulaireCarburant({
  lignes,
  readonly,
  onJaugeChange,
}: {
  lignes: LigneCarburantLocal[];
  readonly: boolean;
  onJaugeChange: (idx: number, value: string) => void;
}) {
  if (lignes.length === 0)
    return (
      <p className="text-sm text-muted-foreground mt-4">
        Aucune cuve trouvée pour cette station.
      </p>
    );
  return (
    <div className="overflow-x-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuve</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Stock théorique (L)</TableHead>
            <TableHead>Jauge réelle (cm)</TableHead>
            <TableHead>Volume réel (L)</TableHead>
            <TableHead>Écart (L)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.map((ligne, idx) => {
            const ecart =
              ligne.volume_calcule !== null
                ? ligne.volume_calcule - ligne.stock_theorique_litres
                : null;
            return (
              <TableRow key={ligne.id}>
                <TableCell className="font-medium">
                  {ligne.cuve_nom ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {ligne.type_carburant ?? "—"}
                </TableCell>
                <TableCell>
                  {formatNumber(ligne.stock_theorique_litres, 3)}
                </TableCell>
                <TableCell>
                  {readonly ? (
                    <span>{ligne.jauge_input || "—"}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24"
                        value={ligne.jauge_input}
                        onChange={(e) => onJaugeChange(idx, e.target.value)}
                        placeholder="cm"
                      />
                      {ligne.calcul_en_cours && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {ligne.volume_calcule !== null
                    ? formatNumber(ligne.volume_calcule, 3)
                    : "—"}
                </TableCell>
                <TableCell>
                  <EcartBadge ecart={ecart} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FormulaireBoutique({
  lignes,
  readonly,
  onChange,
}: {
  lignes: LigneBoutiqueLocal[];
  readonly: boolean;
  onChange: React.Dispatch<React.SetStateAction<LigneBoutiqueLocal[]>>;
}) {
  if (lignes.length === 0)
    return (
      <p className="text-sm text-muted-foreground mt-4">
        Aucun article en stock trouvé pour cette station.
      </p>
    );
  return (
    <div className="overflow-x-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Unité</TableHead>
            <TableHead>Stock théorique</TableHead>
            <TableHead>Quantité réelle</TableHead>
            <TableHead>Écart</TableHead>
            <TableHead>Motif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignes.map((ligne, idx) => {
            const qteReelle =
              ligne.quantite_input !== "" ? Number(ligne.quantite_input) : null;
            const ecart =
              qteReelle !== null ? qteReelle - ligne.stock_theorique : null;
            const hasEcart = ecart !== null && Math.abs(ecart) >= 0.001;
            return (
              <TableRow key={ligne.id}>
                <TableCell className="font-medium">
                  {ligne.article_nom ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {ligne.article_unite ?? "—"}
                </TableCell>
                <TableCell>{formatNumber(ligne.stock_theorique, 3)}</TableCell>
                <TableCell>
                  {readonly ? (
                    <span>{ligne.quantite_input || "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.001"
                      className="w-28"
                      value={ligne.quantite_input}
                      onChange={(e) =>
                        onChange((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, quantite_input: e.target.value }
                              : l,
                          ),
                        )
                      }
                      placeholder="Quantité"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <EcartBadge ecart={ecart} />
                </TableCell>
                <TableCell>
                  {hasEcart && !readonly ? (
                    <Select
                      value={ligne.motif_input}
                      onValueChange={(v) =>
                        onChange((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, motif_input: v as MotifEcart }
                              : l,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="w-32 text-xs">
                        <SelectValue placeholder="Motif" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="justifie">Justifié</SelectItem>
                        <SelectItem value="excedent">Excédent</SelectItem>
                        <SelectItem value="infonde">Infondé</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {ligne.motif_input || "—"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RegularisationCarburant({
  inventaireId,
  lignesReg,
  employes,
  onChangeLigne,
}: {
  inventaireId: string;
  lignesReg: Record<string, { motif: MotifEcart | ""; responsable_id: string }>;
  employes: Array<{ id: string; nom: string }>;
  onChangeLigne: (
    id: string,
    vals: { motif: MotifEcart | ""; responsable_id: string },
  ) => void;
}) {
  const { data: lignes } = useQuery({
    queryKey: ["lignes-inv-carb", inventaireId],
    queryFn: () => inventaireService.getLignesCarburant(inventaireId),
  });

  const lignesAvecEcart = (lignes ?? []).filter(
    (l) =>
      l.volume_reel_litres !== null &&
      Math.abs(l.volume_reel_litres - l.stock_theorique_litres) >= 0.001,
  );

  if (lignesAvecEcart.length === 0)
    return (
      <p className="text-sm text-muted-foreground mt-4">
        Aucun écart à régulariser.
      </p>
    );

  return (
    <div className="overflow-x-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuve</TableHead>
            <TableHead>Écart (L)</TableHead>
            <TableHead>Valeur écart</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead>Responsable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignesAvecEcart.map((l) => {
            const ecart =
              (l.volume_reel_litres ?? 0) - l.stock_theorique_litres;
            const valeur = Math.abs(ecart) * (l.cmup ?? 0);
            const reg = lignesReg[l.id] ?? { motif: "", responsable_id: "" };
            return (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  {l.cuve_nom ?? "—"} — {l.type_carburant}
                </TableCell>
                <TableCell>
                  <EcartBadge ecart={ecart} />
                </TableCell>
                <TableCell>{formatCurrency(valeur)}</TableCell>
                <TableCell>
                  <Select
                    value={reg.motif}
                    onValueChange={(v) =>
                      onChangeLigne(l.id, {
                        ...reg,
                        motif: (v ?? "") as MotifEcart | "",
                      })
                    }
                  >
                    <SelectTrigger className="w-32 text-xs">
                      <SelectValue placeholder="Motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="justifie">Justifié</SelectItem>
                      <SelectItem value="excedent">Excédent</SelectItem>
                      <SelectItem value="infonde">Infondé</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {reg.motif === "infonde" ? (
                    <Select
                      value={reg.responsable_id}
                      onValueChange={(v) =>
                        onChangeLigne(l.id, { ...reg, responsable_id: v ?? "" })
                      }
                    >
                      <SelectTrigger className="w-40 text-xs">
                        <SelectValue placeholder="Responsable">
                          {
                            employes.find((e) => e.id === reg.responsable_id)
                              ?.nom
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {employes.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RegularisationBoutique({
  inventaireId,
  lignesReg,
  employes,
  onChangeLigne,
}: {
  inventaireId: string;
  lignesReg: Record<
    string,
    { motif: MotifEcart | ""; motif_detail: string; responsable_id: string }
  >;
  employes: Array<{ id: string; nom: string }>;
  onChangeLigne: (
    id: string,
    vals: {
      motif: MotifEcart | "";
      motif_detail: string;
      responsable_id: string;
    },
  ) => void;
}) {
  const { data: lignes } = useQuery({
    queryKey: ["lignes-inv-bout", inventaireId],
    queryFn: () => inventaireService.getLignesBoutique(inventaireId),
  });

  const lignesAvecEcart = (lignes ?? []).filter(
    (l) =>
      l.quantite_reelle !== null &&
      Math.abs(l.quantite_reelle - l.stock_theorique) >= 0.001,
  );

  if (lignesAvecEcart.length === 0)
    return (
      <p className="text-sm text-muted-foreground mt-4">
        Aucun écart à régulariser.
      </p>
    );

  return (
    <div className="overflow-x-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Écart</TableHead>
            <TableHead>Valeur écart</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead>Détail</TableHead>
            <TableHead>Responsable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lignesAvecEcart.map((l) => {
            const ecart = (l.quantite_reelle ?? 0) - l.stock_theorique;
            const valeur = Math.abs(ecart) * (l.cmup ?? 0);
            const reg = lignesReg[l.id] ?? {
              motif: "",
              motif_detail: "",
              responsable_id: "",
            };
            return (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  {l.article_nom ?? "—"}
                </TableCell>
                <TableCell>
                  <EcartBadge ecart={ecart} />
                </TableCell>
                <TableCell>{formatCurrency(valeur)}</TableCell>
                <TableCell>
                  <Select
                    value={reg.motif}
                    onValueChange={(v) =>
                      onChangeLigne(l.id, {
                        ...reg,
                        motif: (v ?? "") as MotifEcart | "",
                      })
                    }
                  >
                    <SelectTrigger className="w-32 text-xs">
                      <SelectValue placeholder="Motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="justifie">Justifié</SelectItem>
                      <SelectItem value="excedent">Excédent</SelectItem>
                      <SelectItem value="infonde">Infondé</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    className="w-32 text-xs"
                    placeholder="Périmé, cassé…"
                    value={reg.motif_detail}
                    onChange={(e) =>
                      onChangeLigne(l.id, {
                        ...reg,
                        motif_detail: e.target.value,
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  {reg.motif === "infonde" ? (
                    <Select
                      value={reg.responsable_id}
                      onValueChange={(v) =>
                        onChangeLigne(l.id, { ...reg, responsable_id: v ?? "" })
                      }
                    >
                      <SelectTrigger className="w-40 text-xs">
                        <SelectValue placeholder="Responsable">
                          {
                            employes.find((e) => e.id === reg.responsable_id)
                              ?.nom
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {employes.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
