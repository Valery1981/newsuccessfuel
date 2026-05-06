"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { EcriturePreview } from "@/components/compta/EcriturePreview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { cuveService } from "@/services/cuveService";
import { initialisationService } from "@/services/initialisationService";
import { pistoletService } from "@/services/pistoletService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";

// ── Types ───────────────────────────────────────────────────────────

type InitialisationRow = Database["public"]["Tables"]["initialisation"]["Row"];
type StationRow = Database["public"]["Tables"]["stations"]["Row"];
type CuveRow = Database["public"]["Tables"]["cuves"]["Row"];
type PistoletRow = Database["public"]["Tables"]["pistolets"]["Row"];

interface TiersAccount {
  id: string;
  account_id: string;
  label: string;
  type: string;
}

interface TreasuryAccount {
  id: string;
  numero_compte: string;
  libelle: string;
  solde_actuel: number | null;
}

interface FixedAssetAccount {
  account_id: string;
  label: string;
}

export interface AccountsBundle {
  treasury: TreasuryAccount[];
  receivable: TiersAccount[];
  payable: TiersAccount[];
  fixed_assets: FixedAssetAccount[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("fr-MG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseAmt = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) || n < 0 ? 0 : n;
};

export function CompanyInitialisationPage() {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [selectedStation, setSelectedStation] = useState("");

  // ── State declarations (must be before computed values) ──────────────
  const [boutiqueStocks, setBoutiqueStocks] = useState<
    Record<string, { qty: string; value: number }>
  >({});
  const [tresorerieSoldes, setTresorerieSoldes] = useState<
    Record<string, string>
  >({});
  const [creancesSoldes, setCreancesSoldes] = useState<Record<string, string>>(
    {},
  );
  const [dettesSoldes, setDettesSoldes] = useState<Record<string, string>>({});
  const [immobilisations, setImmobilisations] = useState<
    Record<string, string>
  >({});
  const [cuveJauges, setCuveJauges] = useState<
    Record<
      string,
      { jauge_cm: string; volume_litres: string; prix_achat: string }
    >
  >({});
  const [pistoletIndexes, setPistoletIndexes] = useState<
    Record<string, string>
  >({});

  // ── Data queries for new tabs ────────────────────────────────────────
  const { data: boutiqueItems } = useQuery({
    queryKey: ["boutique-init", selectedStation, entreprise?.id],
    queryFn: () =>
      selectedStation && entreprise
        ? initialisationService.getBoutiqueInitItems(selectedStation)
        : [],
    enabled: !!selectedStation && !!entreprise?.id,
  });

  const { data: accountsBundle } = useQuery<AccountsBundle | null>({
    queryKey: ["accounts-bundle", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return null;
      return initialisationService.getInitialisationAccountsBundle(
        entreprise.id,
      );
    },
    enabled: !!entreprise?.id,
  });

  const { data: openingBalanceSummary } = useQuery({
    queryKey: ["opening-balance-summary", entreprise?.id],
    queryFn: () =>
      entreprise ? initialisationService.getOpeningBalanceSummary() : null,
    enabled: !!entreprise?.id,
  });

  const { data: initialisation, isLoading } =
    useQuery<InitialisationRow | null>({
      queryKey: ["initialisation", entreprise?.id],
      queryFn: () =>
        entreprise
          ? initialisationService.getOrCreateInitialisation(entreprise.id)
          : null,
      enabled: !!entreprise?.id,
    });

  const { data: stations } = useQuery<StationRow[]>({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: cuves } = useQuery<CuveRow[]>({
    queryKey: ["cuves", selectedStation],
    queryFn: () => cuveService.getCuvesByStation(selectedStation),
    enabled: !!selectedStation,
  });

  const { data: pistolets } = useQuery<PistoletRow[]>({
    queryKey: ["pistolets", selectedStation],
    queryFn: () => pistoletService.getPistoletsByStation(selectedStation),
    enabled: !!selectedStation,
  });

  // ── Computed totals ───────────────────────────────────────────────────
  const computedTotals = useMemo(() => {
    const cuveTotal = (cuves ?? []).reduce((sum, c) => {
      const data = cuveJauges[c.id];
      if (!data) return sum;
      return (
        sum + (Number(data.volume_litres) || 0) * (Number(data.prix_achat) || 0)
      );
    }, 0);

    const boutiqueTotal = (boutiqueItems ?? []).reduce((sum, b) => {
      const data = boutiqueStocks[b.product_id];
      if (!data) return sum;
      return sum + data.value;
    }, 0);

    const tresorerieTotal = Object.values(tresorerieSoldes).reduce(
      (sum, v) => sum + parseAmt(v),
      0,
    );
    const creancesTotal = Object.values(creancesSoldes).reduce(
      (sum, v) => sum + parseAmt(v),
      0,
    );
    const dettesTotal = Object.values(dettesSoldes).reduce(
      (sum, v) => sum + parseAmt(v),
      0,
    );
    const immobilisationsTotal = Object.values(immobilisations).reduce(
      (sum, v) => sum + parseAmt(v),
      0,
    );

    const totalActif =
      cuveTotal +
      boutiqueTotal +
      tresorerieTotal +
      creancesTotal +
      immobilisationsTotal;
    const totalPassif = dettesTotal;
    const capitalNet = totalActif - totalPassif;

    return {
      fuel: cuveTotal,
      boutique: boutiqueTotal,
      treasury: tresorerieTotal,
      receivable: creancesTotal,
      payable: dettesTotal,
      asset: immobilisationsTotal,
      totalActif,
      totalPassif,
      capitalNet,
    };
  }, [
    cuves,
    cuveJauges,
    boutiqueItems,
    boutiqueStocks,
    tresorerieSoldes,
    creancesSoldes,
    dettesSoldes,
    immobilisations,
  ]);

  const summary = openingBalanceSummary || computedTotals;

  const validationMutation = useMutation({
    mutationFn: () => {
      if (!initialisation || !compte) throw new Error("Session invalide");
      return initialisationService.validerInitialisation(
        initialisation.id,
        compte.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initialisation"] });
      toast.success(
        "Initialisation validée ! Vous pouvez commencer à utiliser l'application.",
      );
      setConfirmValidate(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmValidate(false);
    },
  });

  const saveCuvesMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation) throw new Error("Session invalide");
      const entries = (cuves ?? [])
        .filter((c) => cuveJauges[c.id])
        .map((c) => ({
          cuve_id: c.id,
          station_id: selectedStation,
          jauge_initiale_cm: Number(cuveJauges[c.id].jauge_cm),
          volume_initial_litres: Number(cuveJauges[c.id].volume_litres),
          prix_achat_initial: Number(cuveJauges[c.id].prix_achat),
        }));
      await initialisationService.saveInitialisationCuves(
        initialisation.id,
        entries,
      );
    },
    onSuccess: () => {
      toast.success("Cuves enregistrées");
      queryClient.invalidateQueries({ queryKey: ["opening-balance-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveBoutiqueMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation) throw new Error("Session invalide");
      const entries = (boutiqueItems ?? [])
        .filter((b) => boutiqueStocks[b.product_id])
        .map((b) => ({
          article_id: b.product_id,
          station_id: selectedStation,
          quantite_initiale: Number(boutiqueStocks[b.product_id].qty),
          prix_achat_initial: b.purchase_price,
        }));
      await initialisationService.saveInitialisationStocksBoutique(
        initialisation.id,
        entries,
      );
    },
    onSuccess: () => {
      toast.success("Stock boutique enregistré");
      queryClient.invalidateQueries({ queryKey: ["opening-balance-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const saveComptesMutation = useMutation({
    mutationFn: async (
      onglet: "tresorerie" | "creances" | "dettes" | "immobilisations",
    ) => {
      if (!initialisation) throw new Error("Session invalide");
      const entries: {
        numero_compte: string;
        libelle_compte: string;
        solde_debit: number;
        solde_credit: number;
        onglet: "tresorerie" | "tiers" | "immobilisations";
        tresorerie_id?: string;
        tiers_id?: string;
      }[] = [];

      if (onglet === "tresorerie" && accountsBundle?.treasury) {
        accountsBundle.treasury.forEach((t) => {
          const solde = tresorerieSoldes[t.id];
          if (solde) {
            entries.push({
              numero_compte: t.numero_compte,
              libelle_compte: t.libelle,
              solde_debit: Number(solde),
              solde_credit: 0,
              onglet: "tresorerie",
              tresorerie_id: t.id,
            });
          }
        });
      }

      if (onglet === "creances" && accountsBundle?.receivable) {
        accountsBundle.receivable.forEach((r) => {
          const solde = creancesSoldes[r.id];
          if (solde) {
            entries.push({
              numero_compte: r.account_id,
              libelle_compte: r.label,
              solde_debit: Number(solde),
              solde_credit: 0,
              onglet: "tiers",
              tiers_id: r.id,
            });
          }
        });
      }

      if (onglet === "dettes" && accountsBundle?.payable) {
        accountsBundle.payable.forEach((p) => {
          const solde = dettesSoldes[p.id];
          if (solde) {
            entries.push({
              numero_compte: p.account_id,
              libelle_compte: p.label,
              solde_debit: 0,
              solde_credit: Number(solde),
              onglet: "tiers",
              tiers_id: p.id,
            });
          }
        });
      }

      if (onglet === "immobilisations" && accountsBundle?.fixed_assets) {
        accountsBundle.fixed_assets.forEach((a) => {
          const valeur = immobilisations[a.account_id];
          if (valeur) {
            entries.push({
              numero_compte: a.account_id,
              libelle_compte: a.label,
              solde_debit: Number(valeur),
              solde_credit: 0,
              onglet: "immobilisations",
            });
          }
        });
      }

      await initialisationService.saveInitialisationComptes(
        initialisation.id,
        entries,
      );
    },
    onSuccess: () => {
      toast.success("Comptes enregistrés");
      queryClient.invalidateQueries({ queryKey: ["opening-balance-summary"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const savePistoletsMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation) throw new Error("Session invalide");
      const entries = (pistolets ?? [])
        .filter((p) => pistoletIndexes[p.id])
        .map((p) => ({
          pistolet_id: p.id,
          station_id: selectedStation,
          index_initial: Number(pistoletIndexes[p.id]),
        }));
      await initialisationService.saveInitialisationIndexPistolets(
        initialisation.id,
        entries,
      );
    },
    onSuccess: () => toast.success("Index pistolets enregistrés"),
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <PageLoading />;

  if (initialisation?.est_validee) {
    return (
      <PageContainer>
        <PageHeader title="Initialisation" />
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Initialisation validée</AlertTitle>
          <AlertDescription>
            L&apos;initialisation a été validée le{" "}
            {initialisation.validee_at
              ? new Date(initialisation.validee_at).toLocaleDateString("fr-FR")
              : ""}
            . Capital net calculé :{" "}
            <strong>
              {formatCurrency(initialisation.capital_net_calcule ?? 0)}
            </strong>
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Initialisation"
        description="Saisissez les données de départ de votre entreprise (opération irréversible)"
        actions={
          <Button
            onClick={() => setConfirmValidate(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider l&apos;initialisation
          </Button>
        }
      />

      <Alert className="border-amber-500 bg-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>Action irréversible</AlertTitle>
        <AlertDescription>
          La validation de l&apos;initialisation est irréversible. Elle génère
          les A Nouveau comptables, les entrées de stock initiales et le Capital
          Net. Vérifiez bien toutes les données avant de valider.
        </AlertDescription>
      </Alert>

      {/* Station selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Label>Station :</Label>
            <Select
              value={selectedStation}
              onValueChange={(val) => setSelectedStation(val ?? "")}
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

      <Tabs defaultValue="cuves">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cuves">Cuves</TabsTrigger>
          <TabsTrigger value="pistolets">Index Pistolets</TabsTrigger>
          <TabsTrigger value="stock-boutique">Stock Boutique</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
          <TabsTrigger value="tiers">Créances</TabsTrigger>
          <TabsTrigger value="dettes">Dettes</TabsTrigger>
          <TabsTrigger value="immobilisations">Immobilisations</TabsTrigger>
        </TabsList>

        {/* Tab Cuves */}
        <TabsContent value="cuves">
          <Card>
            <CardHeader>
              <CardTitle>Jauges initiales des cuves</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedStation ? (
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une station pour voir ses cuves
                </p>
              ) : (
                <>
                  {(cuves ?? []).map((cuve) => (
                    <div
                      key={cuve.id}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                    >
                      <div>
                        <Badge className="mb-2">
                          {cuve.nom} ({cuve.type_carburant})
                        </Badge>
                      </div>
                      <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Jauge (cm)</Label>
                          <Input
                            type="number"
                            value={cuveJauges[cuve.id]?.jauge_cm ?? ""}
                            onChange={(e) =>
                              setCuveJauges((prev) => ({
                                ...prev,
                                [cuve.id]: {
                                  ...prev[cuve.id],
                                  jauge_cm: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                            min={0}
                            max={300}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Volume (L)</Label>
                          <Input
                            type="number"
                            value={cuveJauges[cuve.id]?.volume_litres ?? ""}
                            onChange={(e) =>
                              setCuveJauges((prev) => ({
                                ...prev,
                                [cuve.id]: {
                                  ...prev[cuve.id],
                                  volume_litres: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prix achat (MGA/L)</Label>
                          <Input
                            type="number"
                            value={cuveJauges[cuve.id]?.prix_achat ?? ""}
                            onChange={(e) =>
                              setCuveJauges((prev) => ({
                                ...prev,
                                [cuve.id]: {
                                  ...prev[cuve.id],
                                  prix_achat: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => saveCuvesMutation.mutate()}
                    disabled={saveCuvesMutation.isPending}
                  >
                    {saveCuvesMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Enregistrer les cuves
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pistolets */}
        <TabsContent value="pistolets">
          <Card>
            <CardHeader>
              <CardTitle>Index de départ des pistolets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedStation ? (
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une station pour voir ses pistolets
                </p>
              ) : (
                <>
                  {(pistolets ?? []).map((pistolet) => (
                    <div
                      key={pistolet.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{pistolet.numero}</p>
                        <p className="text-sm text-muted-foreground">
                          {pistolet.type_carburant}
                        </p>
                      </div>
                      <div className="w-40">
                        <Input
                          type="number"
                          value={pistoletIndexes[pistolet.id] ?? ""}
                          onChange={(e) =>
                            setPistoletIndexes((prev) => ({
                              ...prev,
                              [pistolet.id]: e.target.value,
                            }))
                          }
                          placeholder="Index initial"
                          min={0}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => savePistoletsMutation.mutate()}
                    disabled={savePistoletsMutation.isPending}
                  >
                    {savePistoletsMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Enregistrer les index
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Stock Boutique */}
        <TabsContent value="stock-boutique">
          <Card>
            <CardHeader>
              <CardTitle>Stock Boutique Initial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedStation ? (
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une station pour voir ses articles boutique
                </p>
              ) : (
                <>
                  {(boutiqueItems ?? []).map((item) => (
                    <div
                      key={item.product_id}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border rounded-lg"
                    >
                      <div className="sm:col-span-2">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.family_name}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix achat (MGA)</Label>
                        <Input
                          type="number"
                          value={item.purchase_price}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantité initiale</Label>
                        <Input
                          type="number"
                          value={boutiqueStocks[item.product_id]?.qty || ""}
                          onChange={(e) => {
                            const qty = e.target.value;
                            const value = parseAmt(qty) * item.purchase_price;
                            setBoutiqueStocks((prev) => ({
                              ...prev,
                              [item.product_id]: { qty, value },
                            }));
                          }}
                          placeholder="0"
                          min={0}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => saveBoutiqueMutation.mutate()}
                    disabled={saveBoutiqueMutation.isPending}
                  >
                    {saveBoutiqueMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Enregistrer le stock boutique
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Trésorerie */}
        <TabsContent value="tresorerie">
          <Card>
            <CardHeader>
              <CardTitle>Soldes Trésorerie Initiaux</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Ces données s&apos;appliquent à l&apos;ensemble de
                  l&apos;entreprise (toutes les stations).
                </p>
              </div>
              {(accountsBundle?.treasury ?? []).map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                >
                  <div className="sm:col-span-2">
                    <p className="font-medium">{t.libelle}</p>
                    <p className="text-sm text-muted-foreground">
                      Compte: {t.numero_compte}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Solde initial (MGA)</Label>
                    <Input
                      type="number"
                      value={tresorerieSoldes[t.id] || ""}
                      onChange={(e) =>
                        setTresorerieSoldes((prev) => ({
                          ...prev,
                          [t.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={() => saveComptesMutation.mutate("tresorerie")}
                disabled={saveComptesMutation.isPending}
              >
                {saveComptesMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Enregistrer les trésoreries
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Créances */}
        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle>Créances Initiales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Ces données s&apos;appliquent à l&apos;ensemble de
                  l&apos;entreprise (toutes les stations).
                </p>
              </div>
              {(accountsBundle?.receivable ?? []).map((r: TiersAccount) => (
                <div
                  key={r.id}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                >
                  <div className="sm:col-span-2">
                    <p className="font-medium">{r.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Compte: {r.account_id} · Type: {r.type}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Solde initial (débit, MGA)
                    </Label>
                    <Input
                      type="number"
                      value={creancesSoldes[r.id] || ""}
                      onChange={(e) =>
                        setCreancesSoldes((prev) => ({
                          ...prev,
                          [r.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={() => saveComptesMutation.mutate("creances")}
                disabled={saveComptesMutation.isPending}
              >
                {saveComptesMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Enregistrer les créances
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Dettes */}
        <TabsContent value="dettes">
          <Card>
            <CardHeader>
              <CardTitle>Dettes Initiales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Ces données s&apos;appliquent à l&apos;ensemble de
                  l&apos;entreprise (toutes les stations).
                </p>
              </div>
              {(accountsBundle?.payable ?? []).map((p: TiersAccount) => (
                <div
                  key={p.id}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                >
                  <div className="sm:col-span-2">
                    <p className="font-medium">{p.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Compte: {p.account_id} · Type: {p.type}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Solde initial (crédit, MGA)
                    </Label>
                    <Input
                      type="number"
                      value={dettesSoldes[p.id] || ""}
                      onChange={(e) =>
                        setDettesSoldes((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>
              ))}
              <Button
                onClick={() => saveComptesMutation.mutate("dettes")}
                disabled={saveComptesMutation.isPending}
              >
                {saveComptesMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Enregistrer les dettes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Immobilisations */}
        <TabsContent value="immobilisations">
          <Card>
            <CardHeader>
              <CardTitle>Immobilisations Initiales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Ces données s&apos;appliquent à l&apos;ensemble de
                  l&apos;entreprise (toutes les stations).
                </p>
              </div>
              {(accountsBundle?.fixed_assets ?? []).map(
                (a: FixedAssetAccount) => (
                  <div
                    key={a.account_id}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                  >
                    <div className="sm:col-span-2">
                      <p className="font-medium">{a.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Compte: {a.account_id}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valeur initiale (MGA)</Label>
                      <Input
                        type="number"
                        value={immobilisations[a.account_id] || ""}
                        onChange={(e) =>
                          setImmobilisations((prev) => ({
                            ...prev,
                            [a.account_id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                        min={0}
                      />
                    </div>
                  </div>
                ),
              )}
              <Button
                onClick={() => saveComptesMutation.mutate("immobilisations")}
                disabled={saveComptesMutation.isPending}
              >
                {saveComptesMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Enregistrer les immobilisations
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Balance Sheet Summary - Synthèse du bilan d'ouverture */}
      <Card className="bg-slate-50 border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">
            Synthèse du bilan d&apos;ouverture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actif */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Actif
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-600 pl-4">
                <span>Stock carburant (toutes stations)</span>
                <span className="font-mono">{fmt(summary.fuel)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 pl-4">
                <span>Stock boutique (toutes stations)</span>
                <span className="font-mono">{fmt(summary.boutique)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 pl-4">
                <span>Trésoreries (entreprise)</span>
                <span className="font-mono">{fmt(summary.treasury)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 pl-4">
                <span>Créances (entreprise)</span>
                <span className="font-mono">{fmt(summary.receivable)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 pl-4">
                <span>Immobilisations (entreprise)</span>
                <span className="font-mono">{fmt(summary.asset)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 mt-2 border-t-2 border-slate-300">
                <span>= Total Actif</span>
                <span className="font-mono">{fmt(summary.totalActif)}</span>
              </div>
            </div>
          </div>

          {/* Passif */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Passif
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-600 pl-4">
                <span>Dettes (entreprise)</span>
                <span className="font-mono">{fmt(summary.payable)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 mt-2 border-t-2 border-slate-300">
                <span>= Total Passif</span>
                <span className="font-mono">{fmt(summary.totalPassif)}</span>
              </div>
            </div>
          </div>

          {/* Capital Net Initial */}
          <div
            className={`flex justify-between items-center p-4 rounded-lg border-2 ${
              summary.capitalNet >= 0
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div>
              <p
                className={`font-bold text-sm ${
                  summary.capitalNet >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                Capital Net Initial
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Total Actif − Total Passif · lecture seule · agrégat entreprise
                (données enregistrées)
              </p>
            </div>
            <span
              className={`font-mono font-extrabold text-xl ${
                summary.capitalNet >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {fmt(summary.capitalNet)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* APEX-16-final : Dialog validation avec aperçu A Nouveau (§5.5-23) */}
      <Dialog open={confirmValidate} onOpenChange={setConfirmValidate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Valider l&apos;initialisation ?</DialogTitle>
            <DialogDescription>
              Cette opération est <strong>irréversible</strong>. Elle génère les
              A Nouveau comptables, les entrées de stock initiales et le Capital
              Net.
            </DialogDescription>
          </DialogHeader>

          <EcriturePreview
            title="Aperçu de l'écriture A Nouveau"
            description="Récapitulatif de l'équation comptable d'ouverture (§6.2 — Actif = Passif + Capital)"
            currency="MGA"
            lignes={[
              {
                libelleCompte:
                  "Actifs (stocks + trésorerie + créances + immo.)",
                debit: initialisation?.capital_net_calcule ?? 0,
                credit: 0,
                libelle: "Total des actifs initiaux",
              },
              {
                libelleCompte: "Capital Net (101 + dettes initiales)",
                debit: 0,
                credit: initialisation?.capital_net_calcule ?? 0,
                libelle: "Contrepartie en capital + passif",
              },
            ]}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmValidate(false)}
              disabled={validationMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => validationMutation.mutate()}
              disabled={validationMutation.isPending}
            >
              {validationMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Oui, valider définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
