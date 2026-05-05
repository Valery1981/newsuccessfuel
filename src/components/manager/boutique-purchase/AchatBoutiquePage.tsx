"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  achatBoutiqueService,
  type AchatBoutique,
  type LigneAchatBoutique,
} from "@/services/achatBoutiqueService";
import { articleService } from "@/services/articleService";
import { stationService } from "@/services/stationService";
import { tiersService } from "@/services/tiersService";
import { useAuthStore } from "@/stores/authStore";
import type { AchatStatut } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Eye,
  Loader2,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const supabase = createClient();

// ── Schéma Zod ─────────────────────────────────────────────────────────────────

const ligneSchema = z.object({
  article_id: z.string().min(1, "Article requis"),
  quantite: z.coerce.number().positive("Quantité > 0"),
  prix_achat_unitaire: z.coerce.number().min(0, "Prix ≥ 0"),
});

const achatSchema = z.object({
  station_id: z.string().min(1, "Station requise"),
  fournisseur_non_defini: z.boolean(),
  fournisseur_id: z.string().optional(),
  numero_facture: z.string().optional(),
  date_facture: z.string().min(1, "Date requise"),
  lignes: z.array(ligneSchema).min(1, "Au moins une ligne requise"),
  montant_cash: z.coerce.number().min(0),
  montant_credit: z.coerce.number().min(0),
  echeance_credit: z.string().optional(),
  tresorerie_id: z.string().optional(),
});

type AchatFormData = z.infer<typeof achatSchema>;

// ── Badge statut ───────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: AchatStatut }) {
  const map: Record<AchatStatut, { label: string; className: string }> = {
    commande: { label: "Commande", className: "bg-yellow-500 text-white" },
    brouillon: { label: "Brouillon", className: "bg-gray-500 text-white" },
    paye: { label: "Payé", className: "bg-blue-600 text-white" },
    recu: { label: "Reçu", className: "bg-orange-500 text-white" },
    mouvemente: { label: "Mouvementé", className: "bg-violet-600 text-white" },
    comptabilise: {
      label: "Comptabilisé",
      className: "bg-green-600 text-white",
    },
  };
  const s = map[statut] ?? {
    label: statut,
    className: "bg-gray-400 text-white",
  };
  return <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>;
}

// ── Page principale ────────────────────────────────────────────────────────────

export function AchatBoutiquePage() {
  const { compte, entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  const [dialogNouvel, setDialogNouvel] = useState(false);
  const [dialogDetail, setDialogDetail] = useState(false);
  const [dialogConfirmMouv, setDialogConfirmMouv] = useState<string | null>(
    null,
  );
  const [dialogConfirmCompt, setDialogConfirmCompt] = useState<string | null>(
    null,
  );
  const [achatDetail, setAchatDetail] = useState<{
    achat: AchatBoutique;
    lignes: LigneAchatBoutique[];
  } | null>(null);

  // Filtres
  const [filtreStation, setFiltreStation] = useState<string>("all");
  const [filtreStatut, setFiltreStatut] = useState<string>("all");

  // ── Données ────────────────────────────────────────────────────────────────

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ["fournisseurs", entreprise?.id],
    queryFn: () =>
      entreprise ? tiersService.getFournisseurs(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: articles } = useQuery({
    queryKey: ["articles-boutique", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const all = await articleService.getArticlesByEntreprise(entreprise.id);
      return all.filter(
        (a) => a.famille !== "carburants" && a.famille !== "services",
      );
    },
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

  const stationIds = (stations ?? []).map((s) => s.id);

  const { data: achats, isLoading } = useQuery({
    queryKey: ["achats-boutique", stationIds.join(",")],
    queryFn: () => achatBoutiqueService.getAchatsByStations(stationIds),
    enabled: stationIds.length > 0,
  });

  // ── Form ───────────────────────────────────────────────────────────────────

  const form = useForm<AchatFormData>({
    resolver: zodResolver(achatSchema) as Resolver<AchatFormData>,
    defaultValues: {
      station_id: "",
      fournisseur_non_defini: false,
      fournisseur_id: "",
      numero_facture: "",
      date_facture: new Date().toISOString().split("T")[0],
      lignes: [{ article_id: "", quantite: 0, prix_achat_unitaire: 0 }],
      montant_cash: 0,
      montant_credit: 0,
      echeance_credit: "",
      tresorerie_id: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lignes",
  });

  const watchedLignes = form.watch("lignes");
  const watchedFournisseurNonDefini = form.watch("fournisseur_non_defini");
  const watchedFournisseurId = form.watch("fournisseur_id");
  const watchedMontantCash = form.watch("montant_cash");
  const watchedMontantCredit = form.watch("montant_credit");

  const montantTotal = watchedLignes.reduce(
    (acc, l) =>
      acc + (Number(l.quantite) || 0) * (Number(l.prix_achat_unitaire) || 0),
    0,
  );

  const fournisseurSelectionne = (fournisseurs ?? []).find(
    (f) => f.id === watchedFournisseurId,
  );
  const peutAvoirCredit =
    !watchedFournisseurNonDefini &&
    fournisseurSelectionne?.is_partenaire_carburant === true;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const creerAchatMutation = useMutation({
    mutationFn: async (data: AchatFormData) => {
      if (!entreprise || !compte) throw new Error("Session invalide");
      if (!data.fournisseur_non_defini && !data.fournisseur_id)
        throw new Error("Sélectionnez un fournisseur ou cochez 'non défini'");

      const montantCash = data.fournisseur_non_defini
        ? montantTotal
        : data.montant_cash;
      const montantCredit = data.fournisseur_non_defini
        ? 0
        : peutAvoirCredit
          ? data.montant_credit
          : 0;

      return achatBoutiqueService.creerAchat({
        entreprise_id: entreprise.id,
        station_id: data.station_id,
        fournisseur_id: data.fournisseur_non_defini
          ? null
          : (data.fournisseur_id ?? null),
        fournisseur_non_defini: data.fournisseur_non_defini,
        numero_facture: data.numero_facture ?? null,
        date_facture: data.date_facture,
        montant_cash: montantCash,
        montant_credit: montantCredit,
        echeance_credit:
          montantCredit > 0 ? (data.echeance_credit ?? null) : null,
        tresorerie_id: montantCash > 0 ? (data.tresorerie_id ?? null) : null,
        created_by: compte.session_id ?? null,
        lignes: data.lignes.map((l) => ({
          article_id: l.article_id,
          quantite: l.quantite,
          prix_achat_unitaire: l.prix_achat_unitaire,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-boutique"] });
      setDialogNouvel(false);
      form.reset();
      toast.success("Achat boutique créé");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mouvementerMutation = useMutation({
    mutationFn: (achatId: string) =>
      achatBoutiqueService.mouvementerStock(achatId, compte?.id ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-boutique"] });
      setDialogConfirmMouv(null);
      toast.success("Stock mouvementé — CMUP recalculé");
    },
    onError: (e) => {
      setDialogConfirmMouv(null);
      toast.error((e as Error).message);
    },
  });

  const comptabiliserMutation = useMutation({
    mutationFn: (achatId: string) =>
      achatBoutiqueService.comptabiliser(achatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-boutique"] });
      setDialogConfirmCompt(null);
      toast.success("Achat comptabilisé");
    },
    onError: (e) => {
      setDialogConfirmCompt(null);
      toast.error((e as Error).message);
    },
  });

  // ── Actions ────────────────────────────────────────────────────────────────

  const ouvrirDetail = async (achat: AchatBoutique) => {
    const lignes = await achatBoutiqueService.getLignesAchat(achat.id);
    setAchatDetail({ achat, lignes });
    setDialogDetail(true);
  };

  if (isLoading) return <PageLoading />;

  // Filtrage
  const achatsFiltres = (achats ?? []).filter((a) => {
    if (filtreStation !== "all" && a.station_id !== filtreStation) return false;
    if (filtreStatut !== "all" && a.statut !== filtreStatut) return false;
    return true;
  });

  return (
    <PageContainer>
      <PageHeader
        title="Achats Boutique"
        description="Gérez vos achats de marchandises boutique"
        actions={
          <Button
            onClick={() => {
              form.reset();
              setDialogNouvel(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvel achat
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filtreStation}
          onValueChange={(v) => setFiltreStation(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Toutes les stations">
              {filtreStation !== "all"
                ? (stations ?? []).find((s) => s.id === filtreStation)?.nom
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les stations</SelectItem>
            {(stations ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtreStatut}
          onValueChange={(v) => setFiltreStatut(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="paye">Payé</SelectItem>
            <SelectItem value="recu">Reçu</SelectItem>
            <SelectItem value="mouvemente">Mouvementé</SelectItem>
            <SelectItem value="comptabilise">Comptabilisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {achatsFiltres.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucun achat boutique"
          description="Enregistrez votre premier achat de marchandises"
          action={{
            label: "Nouvel achat",
            onClick: () => {
              form.reset();
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
                    <TableHead>N° interne</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achatsFiltres.map((achat) => (
                    <TableRow key={achat.id}>
                      <TableCell className="font-mono text-xs">
                        {achat.numero_interne ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {achat.date_facture
                          ? formatDate(achat.date_facture)
                          : "—"}
                      </TableCell>
                      <TableCell>{achat.station_nom ?? "—"}</TableCell>
                      <TableCell>
                        {achat.fournisseur_non_defini
                          ? "Non défini"
                          : (achat.fournisseur_nom ?? "—")}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(achat.montant_total)}
                      </TableCell>
                      <TableCell>
                        <StatutBadge statut={achat.statut} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => ouvrirDetail(achat)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {achat.statut === "brouillon" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-violet-700 border-violet-300"
                              onClick={() => setDialogConfirmMouv(achat.id)}
                              disabled={mouvementerMutation.isPending}
                            >
                              <PackageCheck className="w-3 h-3 mr-1" />
                              Mouvementer
                            </Button>
                          )}
                          {achat.statut === "mouvemente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-green-700 border-green-300"
                              onClick={() => setDialogConfirmCompt(achat.id)}
                              disabled={comptabiliserMutation.isPending}
                            >
                              <BookOpen className="w-3 h-3 mr-1" />
                              Comptabiliser
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

      {/* Dialog Nouvel achat */}
      <Dialog open={dialogNouvel} onOpenChange={setDialogNouvel}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel achat boutique</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                creerAchatMutation.mutate(data),
              )}
              className="space-y-5 mt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_facture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date facture *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="station_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Station *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner">
                              {
                                (stations ?? []).find(
                                  (s) => s.id === field.value,
                                )?.nom
                              }
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(stations ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fournisseur */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fnd"
                    checked={watchedFournisseurNonDefini}
                    onChange={(e) => {
                      form.setValue("fournisseur_non_defini", e.target.checked);
                      if (e.target.checked) {
                        form.setValue("fournisseur_id", "");
                        form.setValue("montant_credit", 0);
                      }
                    }}
                    className="rounded"
                  />
                  <Label htmlFor="fnd">
                    Fournisseur non défini (cash automatique)
                  </Label>
                </div>
                {!watchedFournisseurNonDefini && (
                  <FormField
                    control={form.control}
                    name="fournisseur_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fournisseur</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un fournisseur">
                                {
                                  (fournisseurs ?? []).find(
                                    (f) => f.id === (field.value ?? ""),
                                  )?.nom
                                }
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(fournisseurs ?? []).map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.nom}
                                {f.is_partenaire_carburant
                                  ? " ★ partenaire"
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="numero_facture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° facture fournisseur</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: FAC-2026-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lignes articles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-medium">
                    Lignes articles *
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      append({
                        article_id: "",
                        quantite: 0,
                        prix_achat_unitaire: 0,
                      })
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_120px_140px_36px] gap-2 items-start"
                    >
                      <FormField
                        control={form.control}
                        name={`lignes.${idx}.article_id`}
                        render={({ field: f }) => (
                          <FormItem>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <FormControl>
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Article">
                                    {
                                      (articles ?? []).find(
                                        (a) => a.id === f.value,
                                      )?.nom
                                    }
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(articles ?? []).map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.nom}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lignes.${idx}.quantite`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.001"
                                className="w-full text-sm"
                                placeholder="Qté"
                                value={f.value || ""}
                                onChange={(e) =>
                                  f.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lignes.${idx}.prix_achat_unitaire`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-full text-sm"
                                placeholder="Prix/unité"
                                value={f.value || ""}
                                onChange={(e) =>
                                  f.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total : <strong>{formatCurrency(montantTotal)}</strong>
                </p>
              </div>

              {/* Paiement */}
              {!watchedFournisseurNonDefini && (
                <div className="border rounded-lg p-4 space-y-3">
                  <Label className="text-base font-medium">
                    Mode de paiement
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="montant_cash"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Montant cash</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              value={f.value || ""}
                              onChange={(e) =>
                                f.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {peutAvoirCredit && (
                      <FormField
                        control={form.control}
                        name="montant_credit"
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel>Montant crédit</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                value={f.value || ""}
                                onChange={(e) =>
                                  f.onChange(parseFloat(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  {!peutAvoirCredit && (
                    <p className="text-xs text-muted-foreground">
                      Fournisseur non partenaire carburant — paiement cash
                      uniquement.
                    </p>
                  )}
                  {watchedMontantCash > 0 && (
                    <FormField
                      control={form.control}
                      name="tresorerie_id"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Trésorerie (cash)</FormLabel>
                          <Select
                            value={f.value ?? ""}
                            onValueChange={f.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner">
                                  {
                                    (tresoreries ?? []).find(
                                      (t) => t.id === (f.value ?? ""),
                                    )?.libelle
                                  }
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(tresoreries ?? []).map(
                                (t: { id: string; libelle: string }) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.libelle}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {peutAvoirCredit && watchedMontantCredit > 0 && (
                    <FormField
                      control={form.control}
                      name="echeance_credit"
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Échéance crédit</FormLabel>
                          <FormControl>
                            <Input type="date" {...f} value={f.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {watchedFournisseurNonDefini && (
                <div className="border rounded-lg p-4">
                  <Label className="text-base font-medium">Paiement</Label>
                  <FormField
                    control={form.control}
                    name="tresorerie_id"
                    render={({ field: f }) => (
                      <FormItem className="mt-2">
                        <FormLabel>Trésorerie (cash uniquement)</FormLabel>
                        <Select
                          value={f.value ?? ""}
                          onValueChange={f.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner">
                                {
                                  (tresoreries ?? []).find(
                                    (t) => t.id === (f.value ?? ""),
                                  )?.libelle
                                }
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(tresoreries ?? []).map(
                              (t: { id: string; libelle: string }) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.libelle}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={creerAchatMutation.isPending}
              >
                {creerAchatMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Enregistrer l&apos;achat
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Détail */}
      <Dialog open={dialogDetail} onOpenChange={setDialogDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Détail achat — {achatDetail?.achat.numero_interne ?? "—"}
            </DialogTitle>
          </DialogHeader>
          {achatDetail && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Station :</span>{" "}
                  <strong>{achatDetail.achat.station_nom ?? "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Date :</span>{" "}
                  <strong>
                    {achatDetail.achat.date_facture
                      ? formatDate(achatDetail.achat.date_facture)
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Fournisseur :</span>{" "}
                  <strong>
                    {achatDetail.achat.fournisseur_non_defini
                      ? "Non défini"
                      : (achatDetail.achat.fournisseur_nom ?? "—")}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut :</span>{" "}
                  <StatutBadge statut={achatDetail.achat.statut} />
                </div>
                <div>
                  <span className="text-muted-foreground">Montant total :</span>{" "}
                  <strong>
                    {formatCurrency(achatDetail.achat.montant_total)}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Cash :</span>{" "}
                  <strong>
                    {formatCurrency(achatDetail.achat.montant_cash)}
                  </strong>
                </div>
                {achatDetail.achat.montant_credit > 0 && (
                  <div>
                    <span className="text-muted-foreground">Crédit :</span>{" "}
                    <strong>
                      {formatCurrency(achatDetail.achat.montant_credit)}
                    </strong>
                  </div>
                )}
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lignes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>Prix/u</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {achatDetail.lignes.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.article_nom ?? "—"}</TableCell>
                          <TableCell>
                            {l.quantite} {l.article_unite}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(l.prix_achat_unitaire)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              l.total_ligne ??
                                l.quantite * l.prix_achat_unitaire,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation mouventation */}
      <Dialog
        open={!!dialogConfirmMouv}
        onOpenChange={() => setDialogConfirmMouv(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la mouventation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Cette action va mettre à jour les stocks boutique et recalculer le
            CMUP pour chaque article. Cette opération est irréversible.
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogConfirmMouv(null)}
            >
              Annuler
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                if (dialogConfirmMouv)
                  mouvementerMutation.mutate(dialogConfirmMouv);
              }}
              disabled={mouvementerMutation.isPending}
            >
              {mouvementerMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation comptabilisation */}
      <Dialog
        open={!!dialogConfirmCompt}
        onOpenChange={() => setDialogConfirmCompt(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la comptabilisation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Cette action va marquer l&apos;achat comme comptabilisé.
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogConfirmCompt(null)}
            >
              Annuler
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (dialogConfirmCompt)
                  comptabiliserMutation.mutate(dialogConfirmCompt);
              }}
              disabled={comptabiliserMutation.isPending}
            >
              {comptabiliserMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
