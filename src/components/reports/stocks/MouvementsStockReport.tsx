"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown } from "lucide-react";

const supabase = createClient();

interface MvtRow {
  id: string;
  date_mouvement: string;
  article_nom: string;
  station_nom: string;
  type_mvt: string;
  sens: string;
  quantite: number;
  cmup: number;
  valeur: number;
  reference: string;
}

export function MouvementsStockReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<MvtRow[]>({
    queryKey: ["report-mouvements-stock", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map(s => s.id);
      // vue_mouvements_stock inclut station_nom, article_nom
      const { data, error } = await supabase
        .from("vue_mouvements_stock")
        .select("id, date_mouvement, article_nom, station_nom, type, sens, quantite, cmup_unitaire, valeur_totale, reference_numero")
        .in("station_id", stationFilter)
        .gte("date_mouvement", filters.dateDebut)
        .lte("date_mouvement", filters.dateFin + "T23:59:59")
        .eq("entreprise_id", entreprise.id)
        .order("date_mouvement", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(m => {
        const r = m as Record<string, unknown>;
        return {
          id: r.id as string,
          date_mouvement: r.date_mouvement as string,
          article_nom: (r.article_nom as string) ?? "—",
          station_nom: (r.station_nom as string) ?? "—",
          type_mvt: (r.type as string) ?? "—",
          sens: (r.sens as string) ?? "entree",
          quantite: (r.quantite as number) ?? 0,
          cmup: (r.cmup_unitaire as number) ?? 0,
          valeur: (r.valeur_totale as number) ?? 0,
          reference: (r.reference_numero as string) ?? "—",
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const entrees = rows.filter(r => r.sens === "entree").reduce((a, r) => a + r.quantite, 0);
  const sorties = rows.filter(r => r.sens === "sortie").reduce((a, r) => a + r.quantite, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Date: r.date_mouvement,
      Article: r.article_nom,
      Station: r.station_nom,
      Type: r.type_mvt,
      Sens: r.sens,
      Quantité: r.quantite,
      "CMUP (Ar)": r.cmup,
      "Valeur (Ar)": r.valeur,
      Référence: r.reference,
    })), `mouvements-stock-${filters.dateDebut}-${filters.dateFin}`);
  }

  const sensBadge: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
    entree: { label: "Entrée", variant: "default" },
    sortie: { label: "Sortie", variant: "destructive" },
  };

  return (
    <ReportLayout title="Mouvements de stock" description="Entrées et sorties de stock boutique sur la période" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="text-muted-foreground">Entrées :</span>{" "}
            <span className="font-semibold text-green-700">{entrees.toLocaleString("fr-FR")}</span>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span className="text-muted-foreground">Sorties :</span>{" "}
            <span className="font-semibold text-red-700">{sorties.toLocaleString("fr-FR")}</span>
          </div>
          <div className="bg-gray-50 border rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Opérations :</span>{" "}
            <span className="font-semibold">{rows.length}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sens</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">CMUP (Ar)</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                  <TableHead>Référence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">Aucun mouvement de stock sur cette période</TableCell>
                  </TableRow>
                ) : rows.map(r => {
                  const badge = sensBadge[r.sens] ?? { label: r.sens, variant: "secondary" as const };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(new Date(r.date_mouvement), "dd/MM/yyyy HH:mm", { locale: fr })}</TableCell>
                      <TableCell className="text-sm font-medium">{r.article_nom}</TableCell>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.type_mvt}</TableCell>
                      <TableCell><Badge variant={badge.variant} className="text-xs">{badge.label}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{r.quantite.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right text-sm">{r.cmup.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.valeur)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.reference}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
