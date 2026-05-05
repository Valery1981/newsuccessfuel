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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Medal } from "lucide-react";

const supabase = createClient();

const FAMILLE_LABELS: Record<string, string> = {
  carburants: "Carburants",
  lubrifiants: "Lubrifiants",
  gpl: "GPL",
  marchandises_generales: "Marchandises générales",
  pieces_accessoires: "Pièces & Accessoires",
  services: "Services",
};

interface ArticleRow {
  article_nom: string;
  famille: string;
  quantite: number;
  ca: number;
}

export function TopArticlesReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();
  const [sortBy, setSortBy] = useState<"ca" | "quantite">("ca");
  const [limit, setLimit] = useState<number>(20);

  const { data: rows = [], isLoading } = useQuery<ArticleRow[]>({
    queryKey: ["report-top-articles", filters, entreprise?.id, sortBy],
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
        .select("quantite, total_ligne, articles(nom, famille)")
        .in("ticket_id", ticketIds);
      if (error) throw error;

      const map: Record<string, { famille: string; qte: number; ca: number }> = {};
      for (const l of (lines ?? [])) {
        const rec = l as Record<string, unknown>;
        const art = rec.articles as { nom: string; famille: string } | null;
        if (!art) continue;
        if (!map[art.nom]) map[art.nom] = { famille: art.famille, qte: 0, ca: 0 };
        map[art.nom].qte += (rec.quantite as number) ?? 0;
        map[art.nom].ca += (rec.total_ligne as number) ?? 0;
      }

      const sorted = Object.entries(map)
        .map(([nom, v]) => ({ article_nom: nom, famille: v.famille, quantite: v.qte, ca: v.ca }))
        .sort((a, b) => (sortBy === "ca" ? b.ca - a.ca : b.quantite - a.quantite));
      return sorted;
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const displayed = rows.slice(0, limit);

  function handleExport() {
    exportCsv(
      rows.map((r, i) => ({
        Rang: i + 1,
        Article: r.article_nom,
        Famille: FAMILLE_LABELS[r.famille] ?? r.famille,
        "Quantité vendue": r.quantite,
        "CA (Ar)": r.ca,
      })),
      `top-articles-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  function medalColor(i: number) {
    if (i === 0) return "text-yellow-500";
    if (i === 1) return "text-slate-400";
    if (i === 2) return "text-amber-600";
    return "";
  }

  return (
    <ReportLayout
      title="Top articles vendus"
      description="Classement des articles par chiffre d&apos;affaires ou quantité vendue"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Trier par</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "ca" | "quantite")}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ca" className="text-xs">Chiffre d&apos;affaires</SelectItem>
                <SelectItem value="quantite" className="text-xs">Quantité vendue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Afficher</Label>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">Top {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Famille</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Aucune vente sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((r, i) => (
                    <TableRow key={r.article_nom}>
                      <TableCell className="text-sm font-bold text-center">
                        {i < 3 ? (
                          <Medal className={`w-4 h-4 mx-auto ${medalColor(i)}`} />
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.article_nom}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {FAMILLE_LABELS[r.famille] ?? r.famille}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.quantite}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-700">
                        {formatCurrency(r.ca)}
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
