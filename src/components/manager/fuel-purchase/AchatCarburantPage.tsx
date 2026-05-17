"use client";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { AchatBLRecap } from "@/components/manager/fuel-purchase/AchatBLRecap";
import { ComptabiliserStockAchatDialog } from "@/components/manager/fuel-purchase/ComptabiliserStockAchatDialog";
import {
  ReceptionCarburantForm,
  type CompartimentAffectationState,
  type CuveJaugeFormState,
} from "@/components/manager/fuel-purchase/ReceptionCarburantForm";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTypesCarburantActifs } from "@/hooks/useTypesCarburant";
import { buildBLPrintHtml, openPrintWindow } from "@/lib/printUtils";
import { formatCurrency, formatDate } from "@/lib/utils";
import { achatCarburantService } from "@/services/achatCarburantService";
import { cuveService } from "@/services/cuveService";
import { stationService } from "@/services/stationService";
import { tiersService } from "@/services/tiersService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Plus,
  Printer,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculerMontantLigneAchatCarburant,
  PRIX_CARBURANT_ACHAT_MANQUANT,
} from "@/lib/prixCarburant";
import {
  LigneBCFormRow,
  type LigneBCState,
} from "@/components/manager/fuel-purchase/LigneBCFormRow";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const supabase = createClient();

// ============================
// ÉTAPE 1 : BON DE COMMANDE
// ============================
interface AchatCarburant {
  id: string;
  numero_bc: string;
  numero_bl?: string | null;
  fournisseur_id: string;
  statut: string;
  date_commande: string;
  date_livraison?: string | null;
  montant_facture: number;
  total_paye: number;
  mouvemente: boolean;
  comptabilise: boolean;
  fournisseur_nom?: string;
}

export function AchatCarburantPage() {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeMainTab, setActiveMainTab] = useState("liste");
  const [nouvelAchatStep, setNouvelAchatStep] = useState<1 | 2 | 3 | 4>(1);
  const [currentAchatId, setCurrentAchatId] = useState<string | null>(null);
  const [currentNumeroBc, setCurrentNumeroBc] = useState<string>("");
  const [previewComptaAchat, setPreviewComptaAchat] =
    useState<AchatCarburant | null>(null);
  const [detailAchatId, setDetailAchatId] = useState<string | null>(null);
  const [selectedFournisseurId, setSelectedFournisseurId] =
    useState<string>("");

  // Lignes BC
  const { data: typesCarburant } = useTypesCarburantActifs();

  const [dateCommande, setDateCommande] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const [lignesBC, setLignesBC] = useState<LigneBCState[]>([
    {
      station_id: "",
      produit: "",
      quantite_commandee: "",
      prix_unitaire: "",
    },
  ]);

  const handleLigneBCChange = useCallback(
    (idx: number, patch: Partial<LigneBCState>) => {
      setLignesBC((prev) =>
        prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)),
      );
    },
    [],
  );

  const montantBCEstimatif = useMemo(
    () =>
      lignesBC.reduce(
        (acc, l) =>
          acc +
          calculerMontantLigneAchatCarburant(
            Number(l.quantite_commandee) || 0,
            Number(l.prix_unitaire) || 0,
          ),
        0,
      ),
    [lignesBC],
  );

  const lignesBCValidesPourCreation = useMemo(
    () =>
      lignesBC.filter(
        (l) =>
          l.station_id &&
          l.produit &&
          Number(l.quantite_commandee) > 0 &&
          Number(l.prix_unitaire) > 0,
      ),
    [lignesBC],
  );

  const lignesBCAvecPrixManquant = useMemo(
    () =>
      lignesBC.some(
        (l) =>
          l.station_id &&
          l.produit &&
          Number(l.quantite_commandee) > 0 &&
          !(Number(l.prix_unitaire) > 0),
      ),
    [lignesBC],
  );

  // Paiements
  const [paiementsBC, setPaiementsBC] = useState([
    { tresorerie_id: "", montant: "", reference: "" },
  ]);
  const [datePrelevement, setDatePrelevement] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [receptionCamionId, setReceptionCamionId] = useState("");
  const [receptionDateLivraison, setReceptionDateLivraison] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [receptionNumeroBl, setReceptionNumeroBl] = useState("");
  const [receptionCompartiments, setReceptionCompartiments] = useState<
    CompartimentAffectationState[]
  >([]);
  const [receptionJaugesParCuve, setReceptionJaugesParCuve] = useState<
    Record<string, CuveJaugeFormState>
  >({});

  const resetNouvelAchat = useCallback(() => {
    setNouvelAchatStep(1);
    setCurrentAchatId(null);
    setCurrentNumeroBc("");
    setSelectedFournisseurId("");
    setDateCommande(new Date().toISOString().split("T")[0]);
    setLignesBC([
      {
        station_id: "",
        produit: "",
        quantite_commandee: "",
        prix_unitaire: "",
      },
    ]);
    setPaiementsBC([{ tresorerie_id: "", montant: "", reference: "" }]);
    setDatePrelevement(new Date().toISOString().split("T")[0]);
    setReceptionCamionId("");
    setReceptionDateLivraison(new Date().toISOString().split("T")[0]);
    setReceptionNumeroBl("");
    setReceptionCompartiments([]);
    setReceptionJaugesParCuve({});
  }, []);

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ["fournisseurs-carburant", entreprise?.id],
    queryFn: () =>
      entreprise ? tiersService.getFournisseurs(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("tresoreries")
        .select("id, libelle, type")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!entreprise?.id,
  });

  const { data: camions } = useQuery({
    queryKey: ["camions", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("camions")
        .select("id, numero_immat, capacite_totale, is_active")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!entreprise?.id,
  });

  const { data: achats, isLoading } = useQuery<AchatCarburant[]>({
    queryKey: ["achats-carburant", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const list = await achatCarburantService.list(entreprise.id);
      return list.map((a) => ({
        ...a,
        statut: a.statut ?? "commande",
      })) as AchatCarburant[];
    },
    enabled: !!entreprise?.id,
  });

  const { data: detailAchat } = useQuery({
    queryKey: ["achat-carburant-detail", detailAchatId],
    queryFn: () => achatCarburantService.getDetail(detailAchatId!),
    enabled: !!detailAchatId,
  });

  const { data: detailNouvelAchat } = useQuery({
    queryKey: ["achat-carburant-detail", currentAchatId],
    queryFn: () => achatCarburantService.getDetail(currentAchatId!),
    enabled: !!currentAchatId && nouvelAchatStep === 4,
  });

  const { data: previewComptaLignes } = useQuery({
    queryKey: ["preview-compta-stock", previewComptaAchat?.id],
    queryFn: () =>
      achatCarburantService.buildPreviewComptaStock(previewComptaAchat!.id),
    enabled: !!previewComptaAchat?.id,
  });

  const creerBCMutation = useMutation({
    mutationFn: async (fournisseurId: string) => {
      if (!fournisseurId) throw new Error("Sélectionnez un fournisseur");
      if (!entreprise) throw new Error("Session invalide");
      if (lignesBCAvecPrixManquant) throw new Error(PRIX_CARBURANT_ACHAT_MANQUANT);

      const lignesValides = lignesBCValidesPourCreation.map((l) => {
        const tc = (typesCarburant ?? []).find((t) => t.id === l.produit);
        return {
          station_id: l.station_id,
          type_carburant_id: l.produit,
          type_carburant_label: tc?.label ?? l.produit,
          quantite_commandee: Number(l.quantite_commandee),
          prix_achat_unitaire: Number(l.prix_unitaire),
        };
      });

      return achatCarburantService.createBonCommande({
        entrepriseId: entreprise.id,
        fournisseurId,
        dateCommande,
        createdBy: compte?.session_id ?? null,
        lignes: lignesValides,
      });
    },
    onSuccess: (achat) => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      setCurrentAchatId(achat.id);
      setCurrentNumeroBc(achat.numero_bc);
      setNouvelAchatStep(2);
      toast.success(`BC ${achat.numero_bc} créé. Passez à l'étape Paiement.`);
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  const enregistrerPaiementMutation = useMutation({
    mutationFn: async () => {
      if (!currentAchatId || !entreprise || !selectedFournisseurId) {
        throw new Error("Session invalide");
      }
      const paiementsValides = paiementsBC
        .filter((p) => p.tresorerie_id && Number(p.montant) > 0)
        .map((p) => ({
          tresorerie_id: p.tresorerie_id,
          montant: Number(p.montant),
          date_paiement: datePrelevement,
          reference: p.reference || currentNumeroBc,
        }));

      await achatCarburantService.enregistrerPaiements({
        achatId: currentAchatId,
        entrepriseId: entreprise.id,
        fournisseurId: selectedFournisseurId,
        numeroBc: currentNumeroBc,
        createdBy: compte?.session_id ?? null,
        paiements: paiementsValides,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      setNouvelAchatStep(3);
      toast.success("Paiement enregistré. Passez à la Réception.");
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  const enregistrerReceptionMutation = useMutation({
    mutationFn: async () => {
      if (!currentAchatId || !entreprise) throw new Error("Session invalide");
      if (!receptionCamionId) throw new Error("Sélectionnez le camion");
      if (receptionCompartiments.length === 0) {
        throw new Error("Ajoutez au moins un compartiment affecté");
      }

      const compartimentsInput = receptionCompartiments.map((l) => {
        if (!l.compartiment_id || !l.station_id || !l.cuve_id) {
          throw new Error("Chaque compartiment doit avoir station et cuve");
        }
        const volNom = Number(l.volume_nominal);
        if (!(volNom > 0)) throw new Error("Volume nominal obligatoire");
        return {
          compartiment_id: l.compartiment_id,
          station_id: l.station_id,
          cuve_id: l.cuve_id,
          type_carburant_id: l.type_carburant_id,
          volume_nominal: volNom,
        };
      });

      const cuveIds = [...new Set(compartimentsInput.map((c) => c.cuve_id))];
      const jaugesCuves = await Promise.all(
        cuveIds.map(async (cuveId) => {
          const jauge = receptionJaugesParCuve[cuveId];
          if (!jauge) {
            throw new Error("Jauge avant/après obligatoire pour chaque cuve");
          }
          const comp = compartimentsInput.find((c) => c.cuve_id === cuveId)!;
          const jA = Number(jauge.jauge_avant_cm);
          const jAp = Number(jauge.jauge_apres_cm);
          const volumeAvant = await cuveService.getVolumeFromJauge(cuveId, jA);
          const volumeApres = await cuveService.getVolumeFromJauge(cuveId, jAp);
          return {
            cuve_id: cuveId,
            station_id: comp.station_id,
            type_carburant_id: comp.type_carburant_id,
            jauge_avant_cm: jA,
            jauge_apres_cm: jAp,
            volume_avant_litres: volumeAvant,
            volume_apres_litres: volumeApres,
          };
        }),
      );

      return achatCarburantService.enregistrerReception({
        achatId: currentAchatId,
        entrepriseId: entreprise.id,
        camionId: receptionCamionId,
        dateLivraison: receptionDateLivraison,
        numeroBl: receptionNumeroBl,
        compartiments: compartimentsInput,
        jaugesCuves,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      queryClient.invalidateQueries({
        queryKey: ["achat-carburant-detail", currentAchatId],
      });
      setNouvelAchatStep(4);
      toast.success("Réception enregistrée. Vérifiez le BL/Facture.");
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  const mouvementerMutation = useMutation({
    mutationFn: async (achatId: string) => {
      if (!entreprise) throw new Error("Session invalide");
      await achatCarburantService.mouvementerStock({
        achatId,
        entrepriseId: entreprise.id,
        sessionId: compte?.session_id ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      toast.success("Stock mouvementé — CMUP recalculé, jauges mises à jour");
    },
    onError: (e) =>
      toast.error("Erreur mouventation : " + (e as Error).message),
  });

  const comptabiliserMutation = useMutation({
    mutationFn: async (achatId: string) => {
      if (!entreprise) throw new Error("Session invalide");
      await achatCarburantService.comptabiliser({
        achatId,
        entrepriseId: entreprise.id,
        createdBy: compte?.session_id ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      toast.success("Achat comptabilisé — Grand Livre mis à jour");
      setPreviewComptaAchat(null);
    },
    onError: (e) =>
      toast.error("Erreur comptabilisation : " + (e as Error).message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Achat Carburant"
        description="Flux : Bon de Commande → Paiement → Réception → BL/Facture"
        actions={
          <Button
            onClick={() => {
              resetNouvelAchat();
              setActiveMainTab("nouveau");
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvel achat
          </Button>
        }
      />

      <Tabs
        value={activeMainTab}
        onValueChange={setActiveMainTab}
        className="mt-6"
      >
        <TabsList>
          <TabsTrigger value="liste">Liste BL/Factures</TabsTrigger>
          <TabsTrigger value="nouveau">Nouvel achat</TabsTrigger>
        </TabsList>

        {/* LISTE DES ACHATS */}
        <TabsContent value="liste" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° BC</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Date commande</TableHead>
                      <TableHead>Date livraison</TableHead>
                      <TableHead>Montant facture</TableHead>
                      <TableHead>Payé</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(achats ?? []).map((achat) => (
                      <TableRow key={achat.id}>
                        <TableCell className="font-mono text-sm">
                          {achat.numero_bc}
                        </TableCell>
                        <TableCell>{achat.fournisseur_nom ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(achat.date_commande)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {achat.date_livraison
                            ? formatDate(achat.date_livraison)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(achat.montant_facture)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(achat.total_paye)}
                        </TableCell>
                        <TableCell>
                          <AchatStatusBadge achat={achat} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => setDetailAchatId(achat.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Détails
                            </Button>
                            {achat.statut === "recu" && !achat.mouvemente && (
                              <PermissionGate permission="traitement_achat_carburant_mouvementer">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() =>
                                    mouvementerMutation.mutate(achat.id)
                                  }
                                  disabled={mouvementerMutation.isPending}
                                >
                                  Mouvementer
                                </Button>
                              </PermissionGate>
                            )}
                            {achat.mouvemente && !achat.comptabilise && (
                              <PermissionGate permission="traitement_achat_carburant_comptabiliser">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => setPreviewComptaAchat(achat)}
                                  disabled={comptabiliserMutation.isPending}
                                >
                                  Comptabiliser
                                </Button>
                              </PermissionGate>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="no-print"
                              disabled={
                                !achat.mouvemente || !achat.comptabilise
                              }
                              title={
                                !achat.mouvemente || !achat.comptabilise
                                  ? "Disponible après mouventation et comptabilisation"
                                  : "Imprimer BL/Facture"
                              }
                              onClick={() =>
                                openPrintWindow(
                                  `BL ${achat.numero_bc}`,
                                  buildBLPrintHtml({
                                    ...achat,
                                    entreprise_nom: entreprise?.nom,
                                  }),
                                )
                              }
                            >
                              <Printer className="w-3 h-3" />
                            </Button>
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

        {/* NOUVEL ACHAT — 4 ÉTAPES */}
        <TabsContent value="nouveau" className="mt-4">
          {/* Progress steps */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { step: 1, icon: ShoppingCart, label: "Bon de Commande" },
              { step: 2, icon: CreditCard, label: "Paiement" },
              { step: 3, icon: Truck, label: "Réception" },
              { step: 4, icon: FileText, label: "BL/Facture" },
            ].map(({ step, icon: Icon, label }) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    nouvelAchatStep >= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{step}</span>
                </div>
                {step < 4 && (
                  <div
                    className={`h-0.5 w-6 sm:w-12 ${nouvelAchatStep > step ? "bg-primary" : "bg-muted"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ÉTAPE 1 — BON DE COMMANDE */}
          {nouvelAchatStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Étape 1 — Bon de Commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Date commande *</Label>
                  <Input
                    type="date"
                    value={dateCommande}
                    onChange={(e) => setDateCommande(e.target.value)}
                    className="mt-1 max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Prix d&apos;achat issu de Structure → Prix carburant (actif
                    à cette date).
                  </p>
                </div>

                <div>
                  <Label>Fournisseur *</Label>
                  <Select
                    value={selectedFournisseurId}
                    onValueChange={(v: string | null) =>
                      setSelectedFournisseurId(v ?? "")
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner le fournisseur partenaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {(fournisseurs ?? []).map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Lignes de commande</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLignesBC((l) => [
                          ...l,
                          {
                            station_id: "",
                            produit: "",
                            quantite_commandee: "",
                            prix_unitaire: "",
                          },
                        ])
                      }
                    >
                      + Ligne
                    </Button>
                  </div>
                  {lignesBC.map((ligne, idx) => (
                    <LigneBCFormRow
                      key={idx}
                      ligne={ligne}
                      idx={idx}
                      dateReference={dateCommande}
                      stations={(stations ?? []).map((s) => ({
                        id: s.id,
                        nom: s.nom,
                      }))}
                      typesCarburant={(typesCarburant ?? []).map((t) => ({
                        id: t.id,
                        label: t.label,
                      }))}
                      onChange={handleLigneBCChange}
                    />
                  ))}
                  {montantBCEstimatif > 0 ? (
                    <p className="text-sm font-medium text-right pt-2 border-t">
                      Montant estimatif BC :{" "}
                      {formatCurrency(montantBCEstimatif)}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() =>
                      creerBCMutation.mutate(selectedFournisseurId)
                    }
                    disabled={
                      !selectedFournisseurId ||
                      lignesBCValidesPourCreation.length === 0 ||
                      lignesBCAvecPrixManquant ||
                      creerBCMutation.isPending
                    }
                  >
                    {creerBCMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Créer le Bon de Commande
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE 2 — PAIEMENT */}
          {nouvelAchatStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Étape 2 — Paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Date prélèvement *</Label>
                  <Input
                    type="date"
                    value={datePrelevement}
                    onChange={(e) => setDatePrelevement(e.target.value)}
                    className="mt-1 max-w-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Modes de paiement *</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPaiementsBC((p) => [
                          ...p,
                          { tresorerie_id: "", montant: "", reference: "" },
                        ])
                      }
                    >
                      + Mode paiement
                    </Button>
                  </div>
                  {paiementsBC.map((paie, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                      <Select
                        value={paie.tresorerie_id}
                        onValueChange={(v) =>
                          setPaiementsBC((p) =>
                            p.map((pi, i) =>
                              i === idx
                                ? { ...pi, tresorerie_id: v ?? "" }
                                : pi,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mode paiement">
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
                        placeholder="Montant"
                        value={paie.montant}
                        onChange={(e) =>
                          setPaiementsBC((p) =>
                            p.map((pi, i) =>
                              i === idx
                                ? { ...pi, montant: e.target.value }
                                : pi,
                            ),
                          )
                        }
                      />
                      <Input
                        placeholder="Référence chèque/virement"
                        value={paie.reference}
                        onChange={(e) =>
                          setPaiementsBC((p) =>
                            p.map((pi, i) =>
                              i === idx
                                ? { ...pi, reference: e.target.value }
                                : pi,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  <p className="text-sm text-muted-foreground">
                    Total payé :{" "}
                    <strong>
                      {formatCurrency(
                        paiementsBC.reduce(
                          (a, p) => a + (Number(p.montant) || 0),
                          0,
                        ),
                      )}
                    </strong>
                  </p>
                </div>
                <Button
                  onClick={() => enregistrerPaiementMutation.mutate()}
                  disabled={enregistrerPaiementMutation.isPending}
                  className="w-full"
                >
                  {enregistrerPaiementMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Enregistrer le paiement → Étape Réception
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE 3 — RÉCEPTION */}
          {nouvelAchatStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Étape 3 — Réception (jauges avant/après dépotage)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Compartiments = volumes nominaux livrés. Jauge avant/après =
                  une seule fois par cuve (contrôle indicatif).
                </p>
                <ReceptionCarburantForm
                  camionId={receptionCamionId}
                  onChangeCamion={setReceptionCamionId}
                  camions={(camions ?? []).map((c) => ({
                    id: c.id,
                    numero_immat: c.numero_immat,
                    capacite_totale: c.capacite_totale,
                  }))}
                  dateLivraison={receptionDateLivraison}
                  onDateLivraisonChange={setReceptionDateLivraison}
                  numeroBl={receptionNumeroBl}
                  onNumeroBlChange={setReceptionNumeroBl}
                  compartiments={receptionCompartiments}
                  onCompartimentsChange={setReceptionCompartiments}
                  jaugesParCuve={receptionJaugesParCuve}
                  onJaugesParCuveChange={setReceptionJaugesParCuve}
                  stations={(stations ?? []).map((s) => ({
                    id: s.id,
                    nom: s.nom,
                  }))}
                  typesCarburant={(typesCarburant ?? []).map((t) => ({
                    id: t.id,
                    label: t.label,
                  }))}
                />
                <Button
                  onClick={() => enregistrerReceptionMutation.mutate()}
                  disabled={
                    enregistrerReceptionMutation.isPending ||
                    !receptionCamionId ||
                    receptionCompartiments.length === 0
                  }
                  className="w-full"
                >
                  {enregistrerReceptionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Confirmer la réception → BL/Facture
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ÉTAPE 4 — BL/FACTURE */}
          {nouvelAchatStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Étape 4 — BL/Facture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detailNouvelAchat ? (
                  <AchatBLRecap detail={detailNouvelAchat} />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                )}
                <p className="text-sm text-muted-foreground">
                  Depuis la liste : <strong>Mouvementer stock</strong> puis{" "}
                  <strong>Comptabiliser</strong>. Impression BL disponible après
                  les deux étapes.
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setActiveMainTab("liste");
                    resetNouvelAchat();
                  }}
                >
                  Retour à la liste
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {previewComptaAchat && (
        <ComptabiliserStockAchatDialog
          open={!!previewComptaAchat}
          onOpenChange={(open) => !open && setPreviewComptaAchat(null)}
          description={`BC ${previewComptaAchat.numero_bc}${previewComptaAchat.numero_bl ? ` — BL ${previewComptaAchat.numero_bl}` : ""}${previewComptaAchat.fournisseur_nom ? ` — ${previewComptaAchat.fournisseur_nom}` : ""}`}
          lignes={previewComptaLignes ?? []}
          onConfirm={() => comptabiliserMutation.mutate(previewComptaAchat.id)}
          isPending={comptabiliserMutation.isPending}
        />
      )}

      <Dialog
        open={!!detailAchatId}
        onOpenChange={(open) => !open && setDetailAchatId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail achat carburant</DialogTitle>
          </DialogHeader>
          {detailAchat ? (
            <AchatBLRecap detail={detailAchat} />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function AchatStatusBadge({ achat }: { achat: AchatCarburant }) {
  if (achat.comptabilise)
    return (
      <Badge className="bg-green-600 text-white text-xs">Comptabilisé</Badge>
    );
  if (achat.mouvemente)
    return <Badge className="bg-blue-600 text-white text-xs">Mouvementé</Badge>;
  if (achat.statut === "recu")
    return (
      <Badge variant="secondary" className="text-xs">
        Livré
      </Badge>
    );
  if (achat.statut === "paye")
    return (
      <Badge variant="outline" className="text-xs">
        Payé
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-xs border-amber-500 text-amber-700"
    >
      Commandé
    </Badge>
  );
}
