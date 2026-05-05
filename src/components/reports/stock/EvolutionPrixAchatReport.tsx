"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import {
  ReportFilters,
  type ReportFilterValues,
} from "@/components/reports/ReportFilters";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultFilterValues,
  useReportStations,
} from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supabase = createClient();

interface PrixPoint {
  date: string;
  dateLabel: string;
  prix_achat: number;
  cmup: number | null;
}

interface ArticleOption {
  id: string;
  nom: string;
  famille: string;
}

export function EvolutionPrixAchatReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(
    defaultFilterValues(),
  );
  const { data: stations = [] } = useReportStations();
  const [selectedArticle, setSelectedArticle] = useState<string>("");

  const { data: articles = [] } = useQuery<ArticleOption[]>({
    queryKey: ["articles-options", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("articles")
        .select("id, nom, famille")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true)
        .eq("is_service", false)
        .order("nom");
      return (data ?? []).map((a) => {
        const r = a as Record<string, unknown>;
        return {
          id: r.id as string,
          nom: r.nom as string,
          famille: r.famille as string,
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: points = [], isLoading } = useQuery<PrixPoint[]>({
    queryKey: [
      "report-evolution-prix",
      selectedArticle,
      filters,
      entreprise?.id,
    ],
    queryFn: async () => {
      if (!selectedArticle || !entreprise || !stations.length) return [];
      const stationFilter = filters.stationId
        ? [filters.stationId]
        : stations.map((s) => s.id);

      // Get achat lines for this article with achat date
      const { data: aLs } = await supabase
        .from("lignes_achat_boutique")
        .select(
          "prix_achat_unitaire, achats_boutique!achat_id(date_facture, station_id)",
        )
        .eq("article_id", selectedArticle);

      // Get CMUP history from mouvements_stock
      const { data: mouvs } = await supabase
        .from("vue_mouvements_stock")
        .select("date_mouvement, cmup_unitaire")
        .eq("article_id", selectedArticle)
        .eq("entreprise_id", entreprise.id)
        .in("station_id", stationFilter)
        .gte("date_mouvement", filters.dateDebut)
        .lte("date_mouvement", filters.dateFin + "T23:59:59")
        .order("date_mouvement");

      const cmupByDate: Record<string, number> = {};
      for (const m of mouvs ?? []) {
        const r = m as Record<string, unknown>;
        const d = ((r.date_mouvement as string) ?? "").split("T")[0];
        cmupByDate[d] = (r.cmup_unitaire as number) ?? 0;
      }

      const priceByDate: Record<string, number> = {};
      for (const l of aLs ?? []) {
        const r = l as Record<string, unknown>;
        const achat = r.achats_boutique as {
          date_facture: string;
          station_id: string;
        } | null;
        if (!achat) continue;
        if (filters.stationId && achat.station_id !== filters.stationId)
          continue;
        if (!stationFilter.includes(achat.station_id)) continue;
        const d = achat.date_facture;
        if (d < filters.dateDebut || d > filters.dateFin) continue;
        priceByDate[d] = (r.prix_achat_unitaire as number) ?? 0;
      }

      // Merge by date
      const allDates = new Set([
        ...Object.keys(priceByDate),
        ...Object.keys(cmupByDate),
      ]);
      return Array.from(allDates)
        .sort()
        .map((d) => ({
          date: d,
          dateLabel: format(new Date(d), "dd/MM", { locale: fr }),
          prix_achat: priceByDate[d] ?? 0,
          cmup: cmupByDate[d] ?? null,
        }))
        .filter((p) => p.prix_achat > 0 || p.cmup !== null);
    },
    enabled: !!selectedArticle && !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const validPrices = points.filter((p) => p.prix_achat > 0);
  const firstPrice = validPrices[0]?.prix_achat ?? 0;
  const lastPrice = validPrices[validPrices.length - 1]?.prix_achat ?? 0;
  const variation =
    firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  function handleExport() {
    exportCsv(
      points.map((p) => ({
        Date: p.date,
        "Prix achat (Ar)": p.prix_achat || "—",
        "CMUP (Ar)": p.cmup ?? "—",
      })),
      `evolution-prix-${selectedArticle}-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Évolution prix d'achat"
      description="Historique des prix d'achat et CMUP par article"
      onExport={selectedArticle ? handleExport : undefined}
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <ReportFilters
            stations={stations}
            values={filters}
            onChange={setFilters}
          />
          <div className="space-y-1">
            <Label className="text-xs">Article</Label>
            <Select
              value={selectedArticle}
              onValueChange={(v: string | null) => setSelectedArticle(v ?? "")}
            >
              <SelectTrigger className="h-8 w-[220px] text-xs">
                <SelectValue placeholder="Sélectionner un article">
                  {articles.find((a) => a.id === selectedArticle)?.nom}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {articles.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedArticle ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Sélectionnez un article pour afficher l&apos;évolution des prix
          </p>
        ) : isLoading ? (
          <PageLoading />
        ) : points.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Aucun prix d&apos;achat sur cette période
          </p>
        ) : (
          <div className="space-y-4">
            {/* Variation badge */}
            {firstPrice > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Variation période :{" "}
                  <strong>{formatCurrency(firstPrice)}</strong> →{" "}
                  <strong>{formatCurrency(lastPrice)}</strong>
                </span>
                <Badge
                  className={cn(
                    "text-xs",
                    variation > 0
                      ? "bg-red-100 text-red-700"
                      : variation < 0
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {variation > 0 ? (
                    <TrendingUp className="w-3 h-3 inline mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 inline mr-0.5" />
                  )}
                  {variation > 0 ? "+" : ""}
                  {variation.toFixed(1)}%
                </Badge>
              </div>
            )}

            <div className="bg-white border rounded-lg p-4">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => formatCurrency(v as number)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="prix_achat"
                    name="Prix achat"
                    stroke="#F5820A"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="cmup"
                    name="CMUP"
                    stroke="#5BB544"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
