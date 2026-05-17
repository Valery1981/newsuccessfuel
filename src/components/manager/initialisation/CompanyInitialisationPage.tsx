"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, CircleHelp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { assertCompteUsage } from "@/lib/comptabilite/compteMetadata";
import {
  aggregateBoutiqueParCompteStock,
  aggregateCuvesParCompteStock,
  calculerValeurStock,
  comptesToLignesANouveau,
  type InitialisationModule,
} from "@/lib/initialisationCompta";
import {
  getCuveDisplayVolume,
  mapStagingBoutiqueToState,
  mapStagingComptesToState,
  mapStagingCuvesToState,
  mapStagingPistoletsToState,
} from "@/lib/initialisationHydration";
import { formatCurrency, interpolateVolume } from "@/lib/utils";
import { cuveService } from "@/services/cuveService";
import { initialisationEcrituresService } from "@/services/initialisationEcrituresService";
import { initialisationService } from "@/services/initialisationService";
import { pistoletService } from "@/services/pistoletService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";

// ── Types ───────────────────────────────────────────────────────────

type InitialisationRow = Database["public"]["Tables"]["initialisation"]["Row"];
type StationRow = Database["public"]["Tables"]["stations"]["Row"];
// APEX 2026-05-15-02 : cuveService.getCuvesByStation joint les calibrages
type CuveRow = Database["public"]["Tables"]["cuves"]["Row"] & {
  calibrages?: Array<{ hauteur_cm: number; volume_litres: number }>;
};
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

interface DetteCompteAccount {
  account_id: string;
  label: string;
}

export interface AccountsBundle {
  treasury: TreasuryAccount[];
  receivable: TiersAccount[];
  payable: TiersAccount[];
  dettes_comptes: DetteCompteAccount[];
  fixed_assets: FixedAssetAccount[];
}

// ── Helpers ───────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("fr-MG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseAmt = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) || n < 0 ? 0 : n;
};

const INIT_PERIMETRE_HELP =
  "Cuves, index pistolets et stock boutique : par station. Trésorerie, créances, dettes et immobilisations : niveau entreprise (écritures centralisées, sans station).";

function BilanSynthèseLigne({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-foreground shrink-0">
        {fmt(value)}
      </span>
    </div>
  );
}

function BilanSynthèseBloc({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
          {title}
        </p>
        {note ? (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{note}</p>
        ) : null}
      </div>
      <div className="space-y-0 pl-2.5 border-l border-border/50">{children}</div>
    </div>
  );
}

export function CompanyInitialisationPage() {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [selectedStation, setSelectedStation] = useState("");

  // ── State declarations (must be before computed values) ──────────────
  const [boutiqueStocks, setBoutiqueStocks] = useState<
    Record<string, { qty: string; value: number }>
  >({});
  const [boutiquePrixAchat, setBoutiquePrixAchat] = useState<
    Record<string, string>
  >({});
  const [tresorerieSoldes, setTresorerieSoldes] = useState<
    Record<string, string>
  >({});
  const [creancesSoldes, setCreancesSoldes] = useState<Record<string, string>>(
    {},
  );
  const [dettesSoldes, setDettesSoldes] = useState<Record<string, string>>({});
  const [dettesComptesSoldes, setDettesComptesSoldes] = useState<
    Record<string, string>
  >({});
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
        ? initialisationService.getBoutiqueInitItems(entreprise.id)
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

  const { data: initialisation, isLoading } =
    useQuery<InitialisationRow | null>({
      queryKey: ["initialisation", entreprise?.id],
      queryFn: () =>
        entreprise
          ? initialisationService.getOrCreateInitialisation(entreprise.id)
          : null,
      enabled: !!entreprise?.id,
    });

  const { data: initStaging } = useQuery({
    queryKey: ["initialisation-staging", initialisation?.id],
    queryFn: () =>
      initialisation
        ? initialisationService.getInitialisationData(initialisation.id)
        : null,
    enabled: !!initialisation?.id,
  });

  const { data: openingBalanceSummary } = useQuery({
    queryKey: ["opening-balance-summary", initialisation?.id],
    queryFn: () =>
      initialisation
        ? initialisationService.getBilanOuverture(initialisation.id)
        : null,
    enabled: !!initialisation?.id,
  });

  const { data: stations } = useQuery<StationRow[]>({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: cuves } = useQuery<CuveRow[]>({
    queryKey: ["cuves", selectedStation],
    queryFn: async () =>
      (await cuveService.getCuvesByStation(
        selectedStation,
      )) as unknown as CuveRow[],
    enabled: !!selectedStation,
  });

  const { data: pistolets } = useQuery<PistoletRow[]>({
    queryKey: ["pistolets", selectedStation],
    queryFn: () => pistoletService.getPistoletsByStation(selectedStation),
    enabled: !!selectedStation,
  });

  const invalidateStaging = () => {
    queryClient.invalidateQueries({ queryKey: ["initialisation-staging"] });
  };

  /** Comptes entreprise : rechargés depuis initialisation_comptes. */
  const [stagingComptesRef, setStagingComptesRef] = useState(initStaging);
  if (initStaging !== stagingComptesRef) {
    setStagingComptesRef(initStaging);
    if (initStaging?.comptes) {
      const mapped = mapStagingComptesToState(initStaging.comptes);
      setTresorerieSoldes(mapped.tresorerieSoldes);
      setCreancesSoldes(mapped.creancesSoldes);
      setDettesSoldes(mapped.dettesSoldes);
      setDettesComptesSoldes(mapped.dettesComptesSoldes);
      setImmobilisations(mapped.immobilisations);
    }
  }

  /** Données station : cuves, pistolets, stock boutique. */
  const [stagingStationRef, setStagingStationRef] = useState({
    initStaging,
    selectedStation,
  });
  if (
    initStaging !== stagingStationRef.initStaging ||
    selectedStation !== stagingStationRef.selectedStation
  ) {
    setStagingStationRef({ initStaging, selectedStation });
    if (initStaging && selectedStation) {
      setCuveJauges(mapStagingCuvesToState(initStaging.cuves, selectedStation));
      setPistoletIndexes(
        mapStagingPistoletsToState(initStaging.pistolets, selectedStation),
      );
      const boutique = mapStagingBoutiqueToState(
        initStaging.stocks,
        selectedStation,
      );
      setBoutiqueStocks(boutique.stocks);
      setBoutiquePrixAchat(boutique.prixAchat);
    }
  }

  /** CMUP initial par défaut (prix carburant) uniquement si pas encore enregistré. */
  useEffect(() => {
    if (!selectedStation || !(cuves ?? []).length || !initStaging) return;
    let cancelled = false;
    (async () => {
      const savedCuveIds = new Set(
        initStaging.cuves
          .filter((r) => r.station_id === selectedStation && r.cuve_id)
          .map((r) => r.cuve_id as string),
      );
      const updates: Record<string, string> = {};
      for (const c of cuves ?? []) {
        if (savedCuveIds.has(c.id)) continue;
        const pa = await initialisationEcrituresService.getPrixAchatCourant(
          selectedStation,
          c.type_carburant,
          c.type_carburant_id ?? null,
        );
        if (pa > 0) updates[c.id] = String(pa);
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setCuveJauges((prev) => {
          const next = { ...prev };
          for (const [id, pa] of Object.entries(updates)) {
            if (!next[id]?.prix_achat) {
              next[id] = {
                jauge_cm: next[id]?.jauge_cm ?? "",
                volume_litres: next[id]?.volume_litres ?? "",
                prix_achat: pa,
              };
            }
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStation, cuves, initStaging]);

  // ── Computed totals ───────────────────────────────────────────────────
  const computedTotals = useMemo(() => {
    // APEX 2026-05-15-02 : volume calculé depuis la jauge via calibrages (Guide §10.2)
    const cuveTotal = (cuves ?? []).reduce((sum, c) => {
      const data = cuveJauges[c.id];
      if (!data) return sum;
      const volume = getCuveDisplayVolume(c.calibrages ?? [], data);
      const cmup = Number(data.prix_achat) || 0;
      return sum + calculerValeurStock(volume, cmup);
    }, 0);

    const boutiqueTotal = (boutiqueItems ?? []).reduce((sum, b) => {
      const data = boutiqueStocks[b.product_id];
      if (!data) return sum;
      const pa =
        parseAmt(boutiquePrixAchat[b.product_id] ?? "") || b.purchase_price || 0;
      return sum + calculerValeurStock(Number(data.qty) || 0, pa);
    }, 0);

    const tresorerieTotal = Object.values(tresorerieSoldes).reduce(
      (sum, v) => sum + parseAmt(v),
      0,
    );
    const creancesTotal = Object.values(creancesSoldes).reduce(
      (sum, v) => sum + parseAmt(v),
      0,
    );
    const dettesTotal =
      Object.values(dettesSoldes).reduce((sum, v) => sum + parseAmt(v), 0) +
      Object.values(dettesComptesSoldes).reduce(
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
    dettesComptesSoldes,
    immobilisations,
    boutiquePrixAchat,
  ]);

  const summary = useMemo(() => {
    const base = openingBalanceSummary ?? computedTotals;
    return {
      fuel: base.fuel ?? 0,
      boutique: base.boutique ?? 0,
      treasury: base.treasury ?? 0,
      receivable: base.receivable ?? 0,
      payable: base.payable ?? 0,
      asset: base.asset ?? 0,
      totalActif: base.totalActif ?? 0,
      totalPassif: base.totalPassif ?? 0,
      capitalNet: base.capitalNet ?? 0,
    };
  }, [openingBalanceSummary, computedTotals]);

  const dateOuverture =
    initialisation?.date_ouverture ??
    new Date().toISOString().split("T")[0];

  const invalidateBilan = () => {
    invalidateStaging();
    queryClient.invalidateQueries({ queryKey: ["opening-balance-summary"] });
    queryClient.invalidateQueries({ queryKey: ["report-grand-livre"] });
    queryClient.invalidateQueries({ queryKey: ["report-balance"] });
  };

  const syncModuleANouveau = async (
    module: InitialisationModule,
    stationId: string | null,
    lignes: ReturnType<typeof comptesToLignesANouveau>,
  ) => {
    if (!initialisation || !entreprise) throw new Error("Session invalide");
    const count = await initialisationEcrituresService.syncANouveau({
      initialisationId: initialisation.id,
      entrepriseId: entreprise.id,
      module,
      stationId,
      dateOuverture,
      createdBy: compte?.session_id ?? null,
      lignes,
    });
    return count;
  };

  const validationMutation = useMutation({
    mutationFn: () => {
      if (!initialisation || !compte || !entreprise)
        throw new Error("Session invalide");
      return initialisationService.validerInitialisation(
        initialisation.id,
        entreprise.id,
        compte.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initialisation"] });
      toast.success(
        "Initialisation verrouillée. Les A Nouveau enregistrés restent dans le Grand Livre.",
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
      if (!initialisation || !entreprise || !selectedStation)
        throw new Error("Session invalide");
      const entries: Array<{
        cuve_id: string;
        station_id: string;
        jauge_initiale_cm: number;
        volume_initial_litres: number;
        prix_achat_initial: number;
        compte_stock: string;
        valeur: number;
      }> = [];

      for (const c of cuves ?? []) {
        const data = cuveJauges[c.id];
        if (!data) continue;
        const jauge = Number(data.jauge_cm) || 0;
        if (jauge <= 0) continue;

        let volume = 0;
        try {
          volume = await cuveService.getVolumeFromJauge(c.id, jauge);
        } catch {
          const calibrages = c.calibrages ?? [];
          volume =
            calibrages.length > 0
              ? interpolateVolume(calibrages, jauge)
              : 0;
        }

        const prixAchat =
          Number(data.prix_achat) > 0
            ? Number(data.prix_achat)
            : await initialisationEcrituresService.getPrixAchatCourant(
                selectedStation,
                c.type_carburant,
                c.type_carburant_id ?? null,
              );

        const valeur = calculerValeurStock(volume, prixAchat);
        if (valeur <= 0) continue;

        entries.push({
          cuve_id: c.id,
          station_id: selectedStation,
          jauge_initiale_cm: jauge,
          volume_initial_litres: volume,
          prix_achat_initial: prixAchat,
          compte_stock: c.compte_stock ?? "310",
          valeur,
        });
      }

      await initialisationService.saveInitialisationCuves(
        initialisation.id,
        selectedStation,
        entries.map(({ compte_stock, valeur, ...row }) => {
          void compte_stock;
          void valeur;
          return row;
        }),
      );

      await initialisationEcrituresService.syncCuvesStock(
        initialisation.id,
        selectedStation,
        entreprise.id,
      );

      const lignes = aggregateCuvesParCompteStock(
        entries.map((e) => ({
          compte_stock: e.compte_stock,
          valeur: e.valeur,
        })),
      );
      const count = await syncModuleANouveau("cuves", selectedStation, lignes);
      return count;
    },
    onSuccess: (count) => {
      toast.success(
        `Cuves enregistrées — ${count ?? 0} écriture(s) A Nouveau dans le Grand Livre`,
      );
      invalidateBilan();
    },
    onError: (error) => toast.error(error.message),
  });

  const saveBoutiqueMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation || !entreprise || !selectedStation)
        throw new Error("Session invalide");
      const staging: Array<{
        article_id: string;
        station_id: string;
        quantite_initiale: number;
        prix_achat_initial: number;
        famille: string;
        valeur: number;
      }> = [];

      for (const b of boutiqueItems ?? []) {
        const stock = boutiqueStocks[b.product_id];
        if (!stock) continue;
        const qty = Number(stock.qty) || 0;
        const pa =
          parseAmt(boutiquePrixAchat[b.product_id] ?? "") ||
          b.purchase_price ||
          0;
        const valeur = calculerValeurStock(qty, pa);
        if (valeur <= 0) continue;
        staging.push({
          article_id: b.product_id,
          station_id: selectedStation,
          quantite_initiale: qty,
          prix_achat_initial: pa,
          famille: b.family_name,
          valeur,
        });
      }

      await initialisationService.saveInitialisationStocksBoutique(
        initialisation.id,
        selectedStation,
        staging.map(({ famille, valeur, ...row }) => {
          void famille;
          void valeur;
          return row;
        }),
      );

      await initialisationEcrituresService.syncStockBoutique(
        initialisation.id,
        selectedStation,
        entreprise.id,
        compte?.session_id ?? null,
      );

      const lignes = aggregateBoutiqueParCompteStock(
        staging.map((s) => ({ famille: s.famille, valeur: s.valeur })),
      );
      return syncModuleANouveau("stock_boutique", selectedStation, lignes);
    },
    onSuccess: (count) => {
      toast.success(
        `Stock boutique enregistré — ${count ?? 0} écriture(s) A Nouveau`,
      );
      invalidateBilan();
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
        onglet: "tresorerie" | "tiers" | "immobilisations" | "autres_dettes";
        tresorerie_id?: string;
        tiers_id?: string;
      }[] = [];

      if (onglet === "tresorerie" && accountsBundle?.treasury) {
        accountsBundle.treasury.forEach((t) => {
          const solde = tresorerieSoldes[t.id];
          if (solde) {
            assertCompteUsage(t.numero_compte, "INITIALISATION_TRESORERIE");
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
            assertCompteUsage(r.account_id, "INITIALISATION_CREANCE");
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

      if (onglet === "dettes" && accountsBundle) {
        accountsBundle.payable.forEach((p) => {
          const solde = dettesSoldes[p.id];
          if (solde) {
            assertCompteUsage(p.account_id, "INITIALISATION_DETTE");
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
        accountsBundle.dettes_comptes.forEach((c) => {
          const solde = dettesComptesSoldes[c.account_id];
          if (solde) {
            assertCompteUsage(c.account_id, "INITIALISATION_DETTE");
            entries.push({
              numero_compte: c.account_id,
              libelle_compte: c.label,
              solde_debit: 0,
              solde_credit: Number(solde),
              onglet: "autres_dettes",
            });
          }
        });
      }

      if (onglet === "immobilisations" && accountsBundle?.fixed_assets) {
        accountsBundle.fixed_assets.forEach((a) => {
          const valeur = immobilisations[a.account_id];
          if (valeur) {
            assertCompteUsage(a.account_id, "INITIALISATION_IMMOBILISATION");
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
        onglet,
        entries,
      );

      const moduleMap: Record<
        "tresorerie" | "creances" | "dettes" | "immobilisations",
        InitialisationModule
      > = {
        tresorerie: "tresorerie",
        creances: "creances",
        dettes: "dettes",
        immobilisations: "immobilisations",
      };

      const lignes = comptesToLignesANouveau(entries);
      return syncModuleANouveau(moduleMap[onglet], null, lignes);
    },
    onSuccess: (count) => {
      toast.success(
        `Comptes enregistrés — ${count ?? 0} écriture(s) A Nouveau`,
      );
      invalidateBilan();
    },
    onError: (error) => toast.error(error.message),
  });

  const savePistoletsMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation || !entreprise || !selectedStation)
        throw new Error("Session invalide");
      const entries = (pistolets ?? [])
        .filter((p) => pistoletIndexes[p.id])
        .map((p) => ({
          pistolet_id: p.id,
          station_id: selectedStation,
          index_initial: Number(pistoletIndexes[p.id]),
        }));
      await initialisationService.saveInitialisationIndexPistolets(
        initialisation.id,
        selectedStation,
        entries,
      );
      await initialisationEcrituresService.syncIndexPistolets(
        initialisation.id,
        selectedStation,
        entreprise.id,
      );
    },
    onSuccess: () => {
      toast.success("Index pistolets enregistrés (opérationnel, sans écriture)");
      invalidateStaging();
    },
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
        description="Chaque Enregistrer met à jour le bilan d'ouverture et le Grand Livre. La validation verrouille définitivement."
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
          Les A Nouveau sont créés à chaque clic sur Enregistrer (onglet par
          onglet). La validation verrouille uniquement l&apos;initialisation —
          aucune nouvelle écriture ni mouvement de stock ne sera généré à ce
          moment.
        </AlertDescription>
      </Alert>

      {/* Station selector */}
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <Label className="shrink-0">Station :</Label>
          <Select
            value={selectedStation}
            onValueChange={(val) => setSelectedStation(val ?? "")}
          >
            <SelectTrigger className="w-64 max-w-full">
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
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="inline-flex shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Aide périmètre station / entreprise"
            >
              <CircleHelp className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              className="max-w-[280px] text-left leading-snug"
            >
              {INIT_PERIMETRE_HELP}
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      {/* APEX 2026-05-15-02 : layout 2 colonnes — droite Tabs, gauche Synthèse sticky (Guide §9) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="order-2 lg:order-1 min-w-0">
          <Tabs defaultValue="pistolets">
            <TabsList className="mb-4 flex h-auto w-full max-w-full flex-col items-stretch gap-2.5 p-2">
              <div className="min-w-0 w-full">
                <p className="mb-1 px-0.5 text-[11px] font-medium text-muted-foreground">
                  Informations station
                </p>
                <div className="flex h-8 w-full max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-md bg-background/50 p-[3px]">
                  <TabsTrigger
                    value="pistolets"
                    className="shrink-0 flex-none px-3"
                  >
                    Index pistolets
                  </TabsTrigger>
                  <TabsTrigger value="cuves" className="shrink-0 flex-none px-3">
                    Cuves
                  </TabsTrigger>
                  <TabsTrigger
                    value="stock-boutique"
                    className="shrink-0 flex-none px-3"
                  >
                    Stock boutique
                  </TabsTrigger>
                </div>
              </div>
              <div className="min-w-0 w-full">
                <p className="mb-1 px-0.5 text-[11px] font-medium text-muted-foreground">
                  Informations entreprise
                </p>
                <div className="flex h-8 w-full max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-md bg-background/50 p-[3px]">
                  <TabsTrigger
                    value="tresorerie"
                    className="shrink-0 flex-none px-3"
                  >
                    Trésorerie
                  </TabsTrigger>
                  <TabsTrigger value="tiers" className="shrink-0 flex-none px-3">
                    Créances
                  </TabsTrigger>
                  <TabsTrigger value="dettes" className="shrink-0 flex-none px-3">
                    Dettes
                  </TabsTrigger>
                  <TabsTrigger
                    value="immobilisations"
                    className="shrink-0 flex-none px-3"
                  >
                    Immobilisations
                  </TabsTrigger>
                </div>
              </div>
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
                          <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Jauge (cm)</Label>
                              <Input
                                type="number"
                                value={cuveJauges[cuve.id]?.jauge_cm ?? ""}
                                onChange={(e) =>
                                  setCuveJauges((prev) => ({
                                    ...prev,
                                    [cuve.id]: {
                                      jauge_cm: e.target.value,
                                      volume_litres:
                                        prev[cuve.id]?.volume_litres ?? "",
                                      prix_achat:
                                        prev[cuve.id]?.prix_achat ?? "",
                                    },
                                  }))
                                }
                                placeholder="0"
                                min={0}
                                max={300}
                                disabled={!!initialisation?.est_validee}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Volume initial (L)
                              </Label>
                              <div className="h-9 px-3 flex items-center rounded-md border bg-muted text-sm font-mono">
                                {(() => {
                                  const data = cuveJauges[cuve.id];
                                  const jauge = Number(data?.jauge_cm) || 0;
                                  if (jauge <= 0) return "—";
                                  if (
                                    !cuve.calibrages ||
                                    cuve.calibrages.length === 0
                                  ) {
                                    const saved = Number(data?.volume_litres);
                                    return saved > 0
                                      ? `${saved.toLocaleString("fr-FR")} L`
                                      : "Cuve non calibrée";
                                  }
                                  const v = getCuveDisplayVolume(
                                    cuve.calibrages,
                                    data,
                                  );
                                  return `${v.toLocaleString("fr-FR")} L`;
                                })()}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                CMUP initial (Ar/L)
                              </Label>
                              <Input
                                type="number"
                                value={cuveJauges[cuve.id]?.prix_achat ?? ""}
                                onChange={(e) =>
                                  setCuveJauges((prev) => ({
                                    ...prev,
                                    [cuve.id]: {
                                      jauge_cm: prev[cuve.id]?.jauge_cm ?? "",
                                      volume_litres:
                                        prev[cuve.id]?.volume_litres ?? "",
                                      prix_achat: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Depuis prix carburant"
                                disabled={!!initialisation?.est_validee}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">
                                Valeur stock initial
                              </Label>
                              <div className="h-9 px-3 flex items-center rounded-md border border-or/40 bg-or/5 text-sm font-mono font-semibold">
                                {(() => {
                                  const data = cuveJauges[cuve.id];
                                  const volume = getCuveDisplayVolume(
                                    cuve.calibrages ?? [],
                                    data,
                                  );
                                  const cmup = Number(data?.prix_achat) || 0;
                                  if (volume <= 0 || cmup <= 0) return "—";
                                  return formatCurrency(
                                    calculerValeurStock(volume, cmup),
                                  );
                                })()}
                              </div>
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
                              value={
                                boutiquePrixAchat[item.product_id] ??
                                String(item.purchase_price || "")
                              }
                              onChange={(e) => {
                                const pa = e.target.value;
                                setBoutiquePrixAchat((prev) => ({
                                  ...prev,
                                  [item.product_id]: pa,
                                }));
                                const qty =
                                  boutiqueStocks[item.product_id]?.qty ?? "0";
                                setBoutiqueStocks((prev) => ({
                                  ...prev,
                                  [item.product_id]: {
                                    qty,
                                    value: calculerValeurStock(
                                      parseAmt(qty),
                                      parseAmt(pa),
                                    ),
                                  },
                                }));
                              }}
                              placeholder="0"
                              min={0}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Quantité initiale</Label>
                            <Input
                              type="number"
                              value={boutiqueStocks[item.product_id]?.qty || ""}
                              onChange={(e) => {
                                const qty = e.target.value;
                                const pa =
                                  parseAmt(
                                    boutiquePrixAchat[item.product_id] ?? "",
                                  ) || item.purchase_price;
                                setBoutiqueStocks((prev) => ({
                                  ...prev,
                                  [item.product_id]: {
                                    qty,
                                    value: calculerValeurStock(
                                      parseAmt(qty),
                                      pa,
                                    ),
                                  },
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
                  {(accountsBundle?.receivable ?? []).filter(
                    (r) => r.type === "client",
                  ).length > 0 ? (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Clients (411)
                    </p>
                  ) : null}
                  {(accountsBundle?.receivable ?? [])
                    .filter((r) => r.type === "client")
                    .map((r: TiersAccount) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                    >
                      <div className="sm:col-span-2">
                        <p className="font-medium">{r.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Compte: {r.account_id}
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
                  {(accountsBundle?.receivable ?? []).filter(
                    (r) => r.type === "employe",
                  ).length > 0 ? (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                      Employés — responsabilité (460)
                    </p>
                  ) : null}
                  {(accountsBundle?.receivable ?? [])
                    .filter((r) => r.type === "employe")
                    .map((r: TiersAccount) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                    >
                      <div className="sm:col-span-2">
                        <p className="font-medium">{r.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Compte: {r.account_id}
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
                  {(accountsBundle?.payable ?? []).filter(
                    (p) => p.type === "fournisseur",
                  ).length > 0 ? (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Fournisseurs (401)
                    </p>
                  ) : null}
                  {(accountsBundle?.payable ?? [])
                    .filter((p) => p.type === "fournisseur")
                    .map((p: TiersAccount) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                      >
                        <div className="sm:col-span-2">
                          <p className="font-medium">{p.label}</p>
                          <p className="text-sm text-muted-foreground">
                            Compte: {p.account_id}
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
                  {(accountsBundle?.payable ?? []).filter(
                    (p) => p.type === "employe",
                  ).length > 0 ? (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                      Employés — rémunérations dues (421)
                    </p>
                  ) : null}
                  {(accountsBundle?.payable ?? [])
                    .filter((p) => p.type === "employe")
                    .map((p: TiersAccount) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                      >
                        <div className="sm:col-span-2">
                          <p className="font-medium">{p.label}</p>
                          <p className="text-sm text-muted-foreground">
                            Compte: {p.account_id}
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
                  {(accountsBundle?.dettes_comptes ?? []).length > 0 ? (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                      Dettes hors tiers (fiscales, sociales, associés…)
                    </p>
                  ) : null}
                  {(accountsBundle?.dettes_comptes ?? []).map((c) => (
                    <div
                      key={c.account_id}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                    >
                      <div className="sm:col-span-2">
                        <p className="font-medium">{c.label}</p>
                        <p className="text-sm text-muted-foreground">
                          Compte: {c.account_id}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Solde initial (crédit, MGA)
                        </Label>
                        <Input
                          type="number"
                          value={dettesComptesSoldes[c.account_id] || ""}
                          onChange={(e) =>
                            setDettesComptesSoldes((prev) => ({
                              ...prev,
                              [c.account_id]: e.target.value,
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
                          <Label className="text-xs">
                            Valeur initiale (MGA)
                          </Label>
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
                    onClick={() =>
                      saveComptesMutation.mutate("immobilisations")
                    }
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
        </div>
        {/* Balance Sheet Summary - Synthèse du bilan d'ouverture (APEX 2026-05-15-02 : colonne gauche sticky) */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-4 self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Synthèse du bilan d&apos;ouverture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Actif
                </p>

                <BilanSynthèseBloc
                  title="Éléments liés aux stations"
                  note="Agrégation de toutes les stations"
                >
                  <BilanSynthèseLigne
                    label="Stock carburant"
                    value={summary.fuel}
                  />
                  <BilanSynthèseLigne
                    label="Stock boutique"
                    value={summary.boutique}
                  />
                </BilanSynthèseBloc>

                <BilanSynthèseBloc title="Éléments liés à l'entreprise">
                  <BilanSynthèseLigne
                    label="Trésoreries"
                    value={summary.treasury}
                  />
                  <BilanSynthèseLigne
                    label="Créances"
                    value={summary.receivable}
                  />
                  <BilanSynthèseLigne
                    label="Immobilisations"
                    value={summary.asset}
                  />
                </BilanSynthèseBloc>

                <div className="flex justify-between items-baseline gap-4 pt-2 border-t border-border font-semibold text-foreground">
                  <span>= Total Actif</span>
                  <span className="font-mono tabular-nums">
                    {fmt(summary.totalActif)}
                  </span>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Passif
                </p>

                <BilanSynthèseBloc title="Éléments liés à l'entreprise">
                  <BilanSynthèseLigne label="Dettes" value={summary.payable} />
                </BilanSynthèseBloc>

                <div className="flex justify-between items-baseline gap-4 pt-2 border-t border-border font-semibold text-foreground">
                  <span>= Total Passif</span>
                  <span className="font-mono tabular-nums">
                    {fmt(summary.totalPassif)}
                  </span>
                </div>
              </section>

              <div
                className={`flex justify-between items-center gap-4 p-4 rounded-lg border ${
                  summary.capitalNet >= 0
                    ? "bg-[var(--grn)]/10 border-[var(--grn)]/40"
                    : "bg-[var(--red)]/10 border-[var(--red)]/40"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`font-semibold text-sm ${
                      summary.capitalNet >= 0
                        ? "text-[var(--grn)]"
                        : "text-[var(--red)]"
                    }`}
                  >
                    Capital Net Initial
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Total Actif − Total Passif
                  </p>
                </div>
                <span
                  className={`font-mono font-bold text-lg tabular-nums shrink-0 ${
                    summary.capitalNet >= 0
                      ? "text-[var(--grn)]"
                      : "text-[var(--red)]"
                  }`}
                >
                  {fmt(summary.capitalNet)}
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* APEX-16-final : Dialog validation avec aperçu A Nouveau (§5.5-23) */}
      <Dialog open={confirmValidate} onOpenChange={setConfirmValidate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Valider l&apos;initialisation ?</DialogTitle>
            <DialogDescription>
              Cette opération est <strong>irréversible</strong>. Les écritures A
              Nouveau ont déjà été enregistrées via les boutons Enregistrer de
              chaque onglet. La validation verrouille uniquement
              l&apos;initialisation (capital net actuel :{" "}
              <strong>{fmt(summary.capitalNet)}</strong>).
            </DialogDescription>
          </DialogHeader>

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
