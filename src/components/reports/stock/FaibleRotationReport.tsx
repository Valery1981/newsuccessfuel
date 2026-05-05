"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, type ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface RotationRow {
  article_nom: string;
  famille: string;
  nb_ventes: number;
  quantite_vendue: number;
  stock_actuel: number;
  cmup: number;
  stock_immobilise: number;
  statut: "dormant" | "faible";
}

const FAMILLE_LABELS: Record<string, string> = {
  carburants: "Carburants",
  lubrifiants: "Lubrifiants",
  gpl: "GPL",
  marchandises_generales: "Marchandises générales",
  pieces_accessoires: "Pièces & Accessoires",
  services: "Services",
};

export function FaibleRotationReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<RotationRow[]>({
    queryKey: ["report-faible-rotation", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map((s) => s.id);

      // Sortie ventes boutique in period
      const { data: ventes } = await supabase
        .from("vue_mouvements_stock")
        .select("article_id, article_nom, famille_produit, quantite")
        .eq("entreprise_id", entreprise.id)
        .in("station_id", stationFilter)
        .eq("type", "sortie_vente_boutique")
        .gte("date_mouvement", filters.dateDebut)
        .lte("date_mouvement", filters.dateFin + "T23:59:59");

      // All active articles for this enterprise
      const { data: articles } = await supabase
        .from("articles")
        .select("id, nom, famille, is_service")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true)
        .eq("is_service", false);

      // Build sales map
      const salesMap: Record<string, { nb: number; qte: number }> = {};
      for (const v of (ventes ?? [])) {
        const r = v as Record<string, unknown>;
        const aid = r.article_id as string;
        if (!salesMap[aid]) salesMap[aid] = { nb: 0, qte: 0 };
        salesMap[aid].nb += 1;
        salesMap[aid].qte += (r.quantite as number) ?? 0;
      }

      // Latest stock per article from mouvements
      const { data: stocks } = await supabase
        .from("vue_mouvements_stock")
        .select("article_id, stock_apres, cmup_unitaire, date_mouvement")
        .eq("entreprise_id", entreprise.id)
        .in("station_id", stationFilter)
        .not("article_id", "is", null)
        .order("date_mouvement", { ascending: false });

      const stockMap: Record<string, { stock: number; cmup: number }> = {};
      for (const s of (stocks ?? [])) {
        const r = s as Record<string, unknown>;
        const aid = r.article_id as string;
        if (!stockMap[aid]) {
          stockMap[aid] = { stock: (r.stock_apres as number) ?? 0, cmup: (r.cmup_unitaire as number) ?? 0 };
        }
      }

      const result: RotationRow[] = [];
      const avgVentes = salesMap
        ? Object.values(salesMap).reduce((a, v) => a + v.nb, 0) / Math.max(Object.keys(salesMap).length, 1)
        : 0;

      for (const art of (articles ?? [])) {
        const r = art as Record<string, unknown>;
        const aid = r.id as string;
        const sales = salesMap[aid];
        const stock = stockMap[aid];
        const nb_ventes = sales?.nb ?? 0;
        const qte_vendue = sales?.qte ?? 0;
        const stock_actuel = stock?.stock ?? 0;
        const cmup = stock?.cmup ?? 0;

        if (nb_ventes === 0) {
          result.push({
            article_nom: r.nom as string,
            famille: r.famille as string,
            nb_ventes: 0,
            quantite_vendue: 0,
            stock_actuel,
            cmup,
            stock_immobilise: stock_actuel * cmup,
            statut: "dormant",
          });
        } else if (nb_ventes < avgVentes * 0.3) {
          result.push({
            article_nom: r.nom as string,
            famille: r.famille as string,
            nb_ventes,
            quantite_vendue: qte_vendue,
            stock_actuel,
            cmup,
            stock_immobilise: stock_actuel * cmup,
            statut: "faible",
          });
        }
      }

      return result.sort((a, b) => {
        if (a.statut !== b.statut) return a.statut === "dormant" ? -1 : 1;
        return b.stock_immobilise - a.stock_immobilise;
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const dormants = rows.filter((r) => r.statut === "dormant").length;
  const totalImmobilise = rows.reduce((a, r) => a + r.stock_immobilise, 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Article: r.article_nom,
        Famille: FAMILLE_LABELS[r.famille] ?? r.famille,
        "Nb ventes": r.nb_ventes,
        "Quantité vendue": r.quantite_vendue,
        "Stock actuel": r.stock_actuel,
        "CMUP (Ar)": r.cmup,
        "Stock immobilisé (Ar)": r.stock_immobilise,
        Statut: r.statut === "dormant" ? "Dormant" : "Faible rotation",
      })),
      `faible-rotation-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Articles à faible rotation"
      description="Articles peu ou pas vendus sur la période — stock immobilisé"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        {!isLoading && rows.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Dormants :</span>{" "}
              <span className="font-bold text-red-700">{dormants}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Stock immobilisé :</span>{" "}
              <span className="font-bold text-amber-700">{formatCurrency(totalImmobilise)}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Qté vendue</TableHead>
                  <TableHead className="text-right">Stock actuel</TableHead>
                  <TableHead className="text-right">Stock immobilisé</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Aucun article à faible rotation sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={i} className={cn(r.statut === "dormant" && "bg-red-50/20")}>
                      <TableCell className="text-sm font-medium">{r.article_nom}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {FAMILLE_LABELS[r.famille] ?? r.famille}
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.nb_ventes}</TableCell>
                      <TableCell className="text-right text-sm">{r.quantite_vendue}</TableCell>
                      <TableCell className="text-right text-sm">{r.stock_actuel}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-amber-700">
                        {formatCurrency(r.stock_immobilise)}
                      </TableCell>
                      <TableCell>
                        {r.statut === "dormant" ? (
                          <Badge variant="destructive" className="text-xs">Dormant</Badge>
                        ) : (
                          <Badge className="text-xs bg-orange-100 text-orange-800">Faible</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
