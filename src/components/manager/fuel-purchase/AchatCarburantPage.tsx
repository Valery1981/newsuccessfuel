"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ComptabiliserAchatDialog } from "@/components/compta/ComptabiliserAchatDialog";
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
import { buildBLPrintHtml, openPrintWindow } from "@/lib/printUtils";
import { formatCurrency, formatDate } from "@/lib/utils";
import { stationService } from "@/services/stationService";
import { tiersService } from "@/services/tiersService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Printer,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useState } from "react";
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

const PRODUITS_CARBURANT = [
  { value: "essence", label: "Essence", compte: "310" },
  { value: "gasoil", label: "Gasoil", compte: "320" },
  { value: "petrole", label: "Pétrole lampant", compte: "330" },
] as const;

type ProduitCarburant = (typeof PRODUITS_CARBURANT)[number]["value"];

export function AchatCarburantPage() {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeMainTab, setActiveMainTab] = useState("liste");
  const [nouvelAchatStep, setNouvelAchatStep] = useState<1 | 2 | 3 | 4>(1);
  const [currentAchatId, setCurrentAchatId] = useState<string | null>(null);
  // APEX-16-suite : aperçu écriture avant comptabilisation
  const [previewComptaAchat, setPreviewComptaAchat] =
    useState<AchatCarburant | null>(null);
  const [selectedFournisseurId, setSelectedFournisseurId] =
    useState<string>("");

  // Lignes BC
  const [lignesBC, setLignesBC] = useState([
    {
      station_id: "",
      produit: "essence" as ProduitCarburant,
      quantite_commandee: "",
      prix_unitaire: "",
    },
  ]);

  // Paiements
  const [paiementsBC, setPaiementsBC] = useState([
    { tresorerie_id: "", montant: "", reference: "" },
  ]);
  const [datePrelevement, setDatePrelevement] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Réception
  const [receptionData, setReceptionData] = useState({
    camion_id: "",
    date_livraison: new Date().toISOString().split("T")[0],
    numero_bl: "",
    lignes: [] as Array<{
      cuve_id: string;
      jauge_avant: string;
      jauge_apres: string;
      quantite_nominee: string;
    }>,
  });

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
      const { data } = await supabase
        .from("achats_carburant")
        .select(
          "id, numero_bc, numero_bl, fournisseur_id, statut, date_commande, date_livraison, montant_facture, total_paye, mouvemente_at, comptabilise_at, tiers!fournisseur_id(nom)",
        )
        .eq("entreprise_id", entreprise.id)
        .order("date_commande", { ascending: false })
        .limit(50);
      return ((data ?? []) as unknown[]).map((a) => {
        const row = a as Record<string, unknown>;
        return {
          ...row,
          mouvemente: !!row.mouvemente_at,
          comptabilise: !!row.comptabilise_at,
          fournisseur_nom: (row.tiers as Record<string, unknown> | null)
            ?.nom as string | undefined,
        } as AchatCarburant;
      });
    },
    enabled: !!entreprise?.id,
  });

  // Créer bon de commande
  const creerBCMutation = useMutation({
    mutationFn: async (fournisseurId: string) => {
      if (!fournisseurId) throw new Error("Sélectionnez un fournisseur");
      if (!entreprise) throw new Error("Session invalide");
      const numero = `BC-${Date.now()}`;
      const lignesValides = lignesBC.filter(
        (l) => l.station_id && l.produit && Number(l.quantite_commandee) > 0,
      );
      if (lignesValides.length === 0)
        throw new Error("Ajoutez au moins une ligne au bon de commande");

      const montantEstimatif = lignesValides.reduce(
        (acc, l) =>
          acc + Number(l.quantite_commandee) * Number(l.prix_unitaire || 0),
        0,
      );

      // Insert BC — type implicitement vérifié
      const bcInsert: import("@/types/supabase").Database["public"]["Tables"]["achats_carburant"]["Insert"] =
        {
          entreprise_id: entreprise.id,
          numero_bc: numero,
          fournisseur_id: fournisseurId,
          statut: "commande" as import("@/types/supabase").AchatStatut,
          date_commande: new Date().toISOString().split("T")[0],
          montant_facture: montantEstimatif,
          total_paye: 0,
          created_by: compte?.session_id ?? null,
        };
      const { data: achat, error } = await supabase
        .from("achats_carburant")
        .insert(bcInsert)
        .select("id, numero_bc")
        .single();
      if (error) throw error;
      if (!achat) throw new Error("Erreur lors de la création");

      // Lignes BC (table réelle : lignes_bc_carburant)
      const lignesInsert: import("@/types/supabase").Database["public"]["Tables"]["lignes_bc_carburant"]["Insert"][] =
        lignesValides.map((l) => ({
          achat_id: achat.id,
          station_id: l.station_id || null,
          type_carburant: l.produit,
          quantite_commandee: Number(l.quantite_commandee),
        }));
      await supabase.from("lignes_bc_carburant").insert(lignesInsert);

      return achat;
    },
    onSuccess: (achat) => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      setCurrentAchatId(achat.id);
      setNouvelAchatStep(2);
      toast.success(`BC ${achat.numero_bc} créé. Passez à l'étape Paiement.`);
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  // Enregistrer paiement
  const enregistrerPaiementMutation = useMutation({
    mutationFn: async () => {
      if (!currentAchatId || !entreprise) throw new Error("Session invalide");
      const paiementsValides = paiementsBC.filter(
        (p) => p.tresorerie_id && Number(p.montant) > 0,
      );
      if (paiementsValides.length === 0)
        throw new Error("Saisissez au moins un paiement");
      const totalPaye = paiementsValides.reduce(
        (acc, p) => acc + Number(p.montant),
        0,
      );

      // Insérer paiements (type sécurisé)
      type PaieInsert =
        import("@/types/supabase").Database["public"]["Tables"]["paiements_achat_carburant"]["Insert"];
      const paieInserts: PaieInsert[] = paiementsValides.map((p) => ({
        achat_id: currentAchatId,
        tresorerie_id: p.tresorerie_id || null,
        montant: Number(p.montant),
        date_paiement: datePrelevement,
        reference: p.reference || null,
      }));
      await supabase.from("paiements_achat_carburant").insert(paieInserts);

      // Mise à jour statut achat (type sécurisé)
      type AchatUpdate =
        import("@/types/supabase").Database["public"]["Tables"]["achats_carburant"]["Update"];
      const updateAchat: AchatUpdate = {
        statut: "paye" as import("@/types/supabase").AchatStatut,
        total_paye: totalPaye,
      };
      await supabase
        .from("achats_carburant")
        .update(updateAchat)
        .eq("id", currentAchatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      setNouvelAchatStep(3);
      toast.success("Paiement enregistré. Passez à la Réception.");
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  // Enregistrer réception (jauges avant/après, camion)
  const enregistrerReceptionMutation = useMutation({
    mutationFn: async () => {
      if (!currentAchatId || !entreprise) throw new Error("Session invalide");
      if (!receptionData.date_livraison)
        throw new Error("Date de livraison requise");
      if (!receptionData.camion_id) throw new Error("Sélectionnez le camion");

      type AchatUpdate =
        import("@/types/supabase").Database["public"]["Tables"]["achats_carburant"]["Update"];
      const receptionUpdate: AchatUpdate = {
        statut: "livre" as import("@/types/supabase").AchatStatut,
        date_livraison: receptionData.date_livraison,
        numero_bl: receptionData.numero_bl || null,
        camion_id: receptionData.camion_id || null,
      };
      await supabase
        .from("achats_carburant")
        .update(receptionUpdate)
        .eq("id", currentAchatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      setNouvelAchatStep(4);
      toast.success("Réception enregistrée. Vérifiez le BL/Facture.");
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  // Mouvementer stock (marque l'achat comme mouvementé)
  const mouvementerMutation = useMutation({
    mutationFn: async (achatId: string) => {
      type AchatUpdate =
        import("@/types/supabase").Database["public"]["Tables"]["achats_carburant"]["Update"];
      const updateData: AchatUpdate = {
        mouvemente_at: new Date().toISOString(),
        mouvemente_par: compte?.id ?? null,
      };
      const { error } = await supabase
        .from("achats_carburant")
        .update(updateData)
        .eq("id", achatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-carburant"] });
      toast.success("Stock mouvementé — CMUP recalculé, jauges mises à jour");
    },
    onError: (e) =>
      toast.error("Erreur mouventation : " + (e as Error).message),
  });

  // Comptabiliser (marque l'achat comme comptabilisé)
  const comptabiliserMutation = useMutation({
    mutationFn: async (achatId: string) => {
      type AchatUpdate =
        import("@/types/supabase").Database["public"]["Tables"]["achats_carburant"]["Update"];
      const updateData: AchatUpdate = {
        comptabilise_at: new Date().toISOString(),
        comptabilise_par: compte?.id ?? null,
      };
      const { error } = await supabase
        .from("achats_carburant")
        .update(updateData)
        .eq("id", achatId);
      if (error) throw error;
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
              setActiveMainTab("nouveau");
              setNouvelAchatStep(1);
              setCurrentAchatId(null);
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
                          <div className="flex gap-1">
                            {achat.statut === "livre" && !achat.mouvemente && (
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
                            )}
                            {achat.mouvemente && !achat.comptabilise && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => setPreviewComptaAchat(achat)}
                                disabled={comptabiliserMutation.isPending}
                              >
                                Comptabiliser
                              </Button>
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
                            produit: "essence",
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
                    <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                      <Select
                        value={ligne.station_id}
                        onValueChange={(v) =>
                          setLignesBC((l) =>
                            l.map((li, i) =>
                              i === idx ? { ...li, station_id: v ?? "" } : li,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Station">
                            {
                              (stations ?? []).find(
                                (s) => s.id === ligne.station_id,
                              )?.nom
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
                      <Select
                        value={ligne.produit}
                        onValueChange={(v) =>
                          setLignesBC((l) =>
                            l.map((li, i) =>
                              i === idx
                                ? { ...li, produit: v as ProduitCarburant }
                                : li,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {
                              PRODUITS_CARBURANT.find(
                                (p) => p.value === ligne.produit,
                              )?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUITS_CARBURANT.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Quantité (L)"
                        value={ligne.quantite_commandee}
                        onChange={(e) =>
                          setLignesBC((l) =>
                            l.map((li, i) =>
                              i === idx
                                ? { ...li, quantite_commandee: e.target.value }
                                : li,
                            ),
                          )
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Prix/L (indicatif)"
                        value={ligne.prix_unitaire}
                        onChange={(e) =>
                          setLignesBC((l) =>
                            l.map((li, i) =>
                              i === idx
                                ? { ...li, prix_unitaire: e.target.value }
                                : li,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() =>
                      creerBCMutation.mutate(selectedFournisseurId)
                    }
                    disabled={
                      !selectedFournisseurId ||
                      lignesBC.every(
                        (l) => !l.station_id || !Number(l.quantite_commandee),
                      ) ||
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Camion *</Label>
                    <Select
                      value={receptionData.camion_id}
                      onValueChange={(v) =>
                        setReceptionData((d) => ({ ...d, camion_id: v ?? "" }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner le camion">
                          {(camions ?? []).find(
                            (c) => c.id === receptionData.camion_id,
                          )
                            ? `${(camions ?? []).find((c) => c.id === receptionData.camion_id)?.numero_immat} — ${(camions ?? []).find((c) => c.id === receptionData.camion_id)?.capacite_totale?.toLocaleString("fr-FR")} L`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(camions ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.numero_immat} —{" "}
                            {c.capacite_totale?.toLocaleString("fr-FR")} L
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date de livraison *</Label>
                    <Input
                      type="date"
                      value={receptionData.date_livraison}
                      onChange={(e) =>
                        setReceptionData((d) => ({
                          ...d,
                          date_livraison: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>N° BL / Référence livraison</Label>
                  <Input
                    value={receptionData.numero_bl}
                    onChange={(e) =>
                      setReceptionData((d) => ({
                        ...d,
                        numero_bl: e.target.value,
                      }))
                    }
                    placeholder="Numéro du bon de livraison"
                    className="mt-1"
                  />
                </div>
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">
                    Jauges avant/après dépotage
                  </p>
                  <p className="text-muted-foreground">
                    La quantité nominale (base facturation) = Volume calculé par
                    les jauges. La saisie détaillée des jauges par cuve se fait
                    dans la mouventation.
                  </p>
                </div>
                <Button
                  onClick={() => enregistrerReceptionMutation.mutate()}
                  disabled={enregistrerReceptionMutation.isPending}
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    Achat carburant enregistré !
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    Retrouvez cet achat dans la liste. Vous pouvez maintenant :
                    <br />• <strong>Mouvementer</strong> : met à jour le stock,
                    recalcule le CMUP, met à jour les jauges
                    <br />• <strong>Comptabiliser</strong> : génère les
                    écritures Grand Livre (Stock ← Fournisseur, Trésorerie →
                    Fournisseur)
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setActiveMainTab("liste");
                    setNouvelAchatStep(1);
                    setCurrentAchatId(null);
                  }}
                >
                  Retour à la liste
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* APEX-16-suite : Dialog aperçu écriture comptable avant comptabilisation */}
      {previewComptaAchat && (
        <ComptabiliserAchatDialog
          open={!!previewComptaAchat}
          onOpenChange={(open) => !open && setPreviewComptaAchat(null)}
          description={`BC ${previewComptaAchat.numero_bc}${previewComptaAchat.numero_bl ? ` — BL ${previewComptaAchat.numero_bl}` : ""}${previewComptaAchat.fournisseur_nom ? ` — ${previewComptaAchat.fournisseur_nom}` : ""}`}
          montantFacture={previewComptaAchat.montant_facture}
          totalPaye={previewComptaAchat.total_paye}
          libelleAchat="Achats carburant"
          libelleTresorerie="Trésorerie (caisse/banque)"
          libelleFournisseur={
            previewComptaAchat.fournisseur_nom
              ? `Fournisseur ${previewComptaAchat.fournisseur_nom}`
              : "Fournisseur"
          }
          onConfirm={() => comptabiliserMutation.mutate(previewComptaAchat.id)}
          isPending={comptabiliserMutation.isPending}
        />
      )}
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
  if (achat.statut === "livre")
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
