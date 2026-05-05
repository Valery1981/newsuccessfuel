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

interface MargeLigne {
  article_nom: string;
  famille: string;
  quantite: number;
  ca: number;
  camv: number;
  marge: number;
  pct_marge: number;
}

const FAMILLE_LABELS: Record<string, string> = {
  carburants: "Carburants",
  lubrifiants: "Lubrifiants",
  gpl: "GPL",
  marchandises_generales: "Marchandises générales",
  pieces_accessoires: "Pièces & Accessoires",
  services: "Services",
};

export function MargeBruteReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<MargeLigne[]>({
    queryKey: ["report-marge-brute", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map((s) => s.id);

      const { data: tickets } = await supabase
        .from("tickets_boutique")
        .select("id")
        .in("station_id", stationFilter)
        .gte("date_vente", filters.dateDebut)
        .lte("date_vente", filters.dateFin + "T23:59:59");
      const ticketIds = (tickets ?? []).map((t) => (t as Record<string, unknown>).id as string);
      if (!ticketIds.length) return [];

      const { data: lines, error } = await supabase
        .from("lignes_ticket_boutique")
        .select("quantite, total_ligne, cmup_sortie, articles(nom, famille)")
        .in("ticket_id", ticketIds);
      if (error) throw error;

      const map: Record<string, { famille: string; qte: number; ca: number; camv: number }> = {};
      for (const l of (lines ?? [])) {
        const rec = l as Record<string, unknown>;
        const art = rec.articles as { nom: string; famille: string } | null;
        if (!art) continue;
        const qte = (rec.quantite as number) ?? 0;
        const ca = (rec.total_ligne as number) ?? 0;
        const cmup = (rec.cmup_sortie as number) ?? 0;
        const camv = cmup * qte;
        if (!map[art.nom]) map[art.nom] = { famille: art.famille, qte: 0, ca: 0, camv: 0 };
        map[art.nom].qte += qte;
        map[art.nom].ca += ca;
        map[art.nom].camv += camv;
      }

      return Object.entries(map)
        .map(([nom, v]) => {
          const marge = v.ca - v.camv;
          return {
            article_nom: nom,
            famille: v.famille,
            quantite: v.qte,
            ca: v.ca,
            camv: v.camv,
            marge,
            pct_marge: v.ca > 0 ? (marge / v.ca) * 100 : 0,
          };
        })
        .sort((a, b) => b.marge - a.marge);
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const totalCa = rows.reduce((a, r) => a + r.ca, 0);
  const totalCamv = rows.reduce((a, r) => a + r.camv, 0);
  const totalMarge = rows.reduce((a, r) => a + r.marge, 0);
  const pctTotal = totalCa > 0 ? (totalMarge / totalCa) * 100 : 0;

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Article: r.article_nom,
        Famille: FAMILLE_LABELS[r.famille] ?? r.famille,
        "Quantité": r.quantite,
        "CA (Ar)": r.ca,
        "CAMV (Ar)": r.camv,
        "Marge brute (Ar)": r.marge,
        "% Marge": r.pct_marge.toFixed(1),
      })),
      `marge-brute-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Marge brute par produit"
      description="CA − CAMV par article — rentabilité commerciale"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        {!isLoading && rows.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Marge totale :</span>{" "}
              <span className={cn("font-bold", totalMarge >= 0 ? "text-green-700" : "text-red-700")}>
                {formatCurrency(totalMarge)}
              </span>
            </div>
            <div className="bg-muted border rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">% marge globale :</span>{" "}
              <span className={cn("font-semibold", pctTotal >= 15 ? "text-green-700" : pctTotal >= 5 ? "text-amber-600" : "text-red-700")}>
                {pctTotal.toFixed(1)}%
              </span>
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
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">CAMV</TableHead>
                  <TableHead className="text-right">Marge brute</TableHead>
                  <TableHead className="text-right">% Marge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Aucune vente sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.article_nom}>
                      <TableCell className="text-sm font-medium">{r.article_nom}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {FAMILLE_LABELS[r.famille] ?? r.famille}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.quantite}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.ca)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.camv)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold",
                          r.marge >= 0 ? "text-green-700" : "text-red-700",
                        )}
                      >
                        {formatCurrency(r.marge)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <Badge
                          className={cn(
                            "text-xs",
                            r.pct_marge >= 20 ? "bg-green-100 text-green-800"
                            : r.pct_marge >= 10 ? "bg-blue-100 text-blue-800"
                            : r.pct_marge >= 0 ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800",
                          )}
                        >
                          {r.pct_marge.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={3} className="text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(totalCa)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(totalCamv)}</TableCell>
                    <TableCell className={cn("text-right text-sm font-bold", totalMarge >= 0 ? "text-green-700" : "text-red-700")}>
                      {formatCurrency(totalMarge)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">{pctTotal.toFixed(1)}%</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
