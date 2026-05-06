"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { articleService } from "@/services/articleService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const transferSchema = z
  .object({
    station_origine_id: z.string().min(1, "Station origine requise"),
    station_destination_id: z.string().min(1, "Station destination requise"),
    article_id: z.string().min(1, "Article requis"),
    quantite: z.number().positive("Quantité doit être positive"),
  })
  .refine((data) => data.station_origine_id !== data.station_destination_id, {
    message: "Les stations doivent être différentes",
    path: ["station_destination_id"],
  });

type TransferFormData = z.infer<typeof transferSchema>;

export function ManagerStockTransferPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: stations, isLoading } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: articles } = useQuery({
    queryKey: ["articles", entreprise?.id],
    queryFn: () =>
      entreprise ? articleService.getArticlesByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: transferts } = useQuery({
    queryKey: ["transferts-stock", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("transferts_stock")
        .select(
          "id, entreprise_id, station_origine_id, station_destination_id, article_id, quantite, cmup_origine, date_transfert, articles(nom)",
        )
        .eq("entreprise_id", entreprise.id)
        .order("date_transfert", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!entreprise?.id,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  });

  const stationOrigineId = useWatch({
    control,
    name: "station_origine_id",
  });
  const articleId = useWatch({
    control,
    name: "article_id",
  });

  // Get stock info for selected article and origin station
  const { data: stockInfo } = useQuery({
    queryKey: ["stock-boutique", articleId, stationOrigineId],
    queryFn: async () => {
      const { data } = await supabase
        .from("stocks_boutique")
        .select("quantite, cmup")
        .eq("article_id", articleId)
        .eq("station_id", stationOrigineId)
        .single();
      return data;
    },
    enabled: !!articleId && !!stationOrigineId,
  });

  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      if (!entreprise) throw new Error("Session invalide");
      if (!stockInfo) throw new Error("Stock introuvable pour cet article");
      if (data.quantite > (stockInfo.quantite ?? 0))
        throw new Error(
          `Stock insuffisant (disponible: ${stockInfo.quantite ?? 0})`,
        );

      // Créer le transfert (type sécurisé)
      type TransfertInsert =
        import("@/types/supabase").Database["public"]["Tables"]["transferts_stock"]["Insert"];
      const transfertInsert: TransfertInsert = {
        entreprise_id: entreprise.id,
        station_origine_id: data.station_origine_id,
        station_destination_id: data.station_destination_id,
        article_id: data.article_id,
        quantite: data.quantite,
        cmup_origine: stockInfo.cmup ?? 0,
      };
      const { error: transferError } = await supabase
        .from("transferts_stock")
        .insert(transfertInsert);
      if (transferError) throw transferError;

      // Create stock movements (no accounting entry per business rules)
      type MvtInsert =
        import("@/types/supabase").Database["public"]["Tables"]["mouvements_stock"]["Insert"];
      const cmup = stockInfo.cmup ?? 0;
      await supabase.from("mouvements_stock").insert([
        {
          entreprise_id: entreprise.id,
          station_id: data.station_origine_id,
          article_id: data.article_id,
          type: "transfert_sortant",
          sens: "sortie",
          quantite: data.quantite,
          cmup_unitaire: cmup,
          station_destination_id: data.station_destination_id,
          motif: "Transfert inter-stations",
        },
        {
          entreprise_id: entreprise.id,
          station_id: data.station_destination_id,
          article_id: data.article_id,
          type: "transfert_entrant",
          sens: "entree",
          quantite: data.quantite,
          cmup_unitaire: cmup,
          motif: "Transfert inter-stations",
        },
      ] as MvtInsert[]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transferts-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-boutique"] });
      toast.success("Transfert effectué avec succès !");
      reset();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Transferts de Stock"
        description="Transférez des articles entre stations (sans écriture comptable)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer form */}
        <Card>
          <CardHeader>
            <CardTitle>Nouveau transfert</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => transferMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Station origine <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v: string | null) => {
                      setValue("station_origine_id", v ?? "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Origine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(stations ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.station_origine_id && (
                    <p className="text-destructive text-xs">
                      {errors.station_origine_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Station destination{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v: string | null) => {
                      setValue("station_destination_id", v ?? "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(stations ?? [])
                        .filter((s) => s.id !== stationOrigineId)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nom}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.station_destination_id && (
                    <p className="text-destructive text-xs">
                      {errors.station_destination_id.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Article <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(v: string | null) => {
                    setValue("article_id", v ?? "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un article..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(articles ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.article_id && (
                  <p className="text-destructive text-xs">
                    {errors.article_id.message}
                  </p>
                )}
              </div>

              {stockInfo && (
                <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Stock disponible :
                    </span>
                    <span className="font-medium">{stockInfo.quantite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CMUP :</span>
                    <span className="font-medium">
                      {formatCurrency(stockInfo.cmup ?? 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  Quantité <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  placeholder="0"
                  {...register("quantite", { valueAsNumber: true })}
                />
                {errors.quantite && (
                  <p className="text-destructive text-xs">
                    {errors.quantite.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || transferMutation.isPending}
                className="w-full"
              >
                {isSubmitting || transferMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Effectuer le transfert
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Transfer history */}
        <Card>
          <CardHeader>
            <CardTitle>Historique récent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(transferts ?? []).map((t) => {
                    const articleRel = (
                      t as unknown as {
                        articles: { nom: string } | { nom: string }[] | null;
                      }
                    ).articles;
                    const articleNom = Array.isArray(articleRel)
                      ? articleRel[0]?.nom
                      : articleRel?.nom;
                    const valeur = Number(t.quantite) * Number(t.cmup_origine);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">
                          {formatDate(t.date_transfert)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {articleNom ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {t.quantite}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(valeur)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {(transferts ?? []).length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Aucun transfert effectué
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
