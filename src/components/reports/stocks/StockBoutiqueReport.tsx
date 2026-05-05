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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const supabase = createClient();

interface StockArticle {
  id: string;
  article_nom: string;
  categorie: string;
  station_nom: string;
  quantite: number;
  cmup: number;
  valeur: number;
  seuil_min: number | null;
  alerte: boolean;
}

export function StockBoutiqueReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const [search, setSearch] = useState("");
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<StockArticle[]>({
    queryKey: ["report-stock-boutique", filters.stationId, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map(s => s.id);

      const { data, error } = await supabase
        .from("stocks_boutique")
        .select("id, article_id, station_id, quantite, cmup, articles(nom, categories_articles(nom))")
        .in("station_id", stationFilter)
        .gt("quantite", 0)
        .order("article_id");
      if (error) throw error;

      // Récupérer les seuils
      const { data: seuils } = await supabase
        .from("seuils_alerte_stock")
        .select("article_id, station_id, seuil_minimum")
        .in("station_id", stationFilter);

      const seuilMap: Record<string, number> = {};
      for (const s of (seuils ?? [])) {
        seuilMap[`${s.station_id}_${s.article_id}`] = (s.seuil_minimum as number) ?? 0;
      }

      return (data ?? []).map(s => {
        const r = s as Record<string, unknown>;
        const article = r.articles as { nom: string; categories_articles: { nom: string } | null } | null;
        const qtie = (r.quantite as number) ?? 0;
        const cmup = (r.cmup as number) ?? 0;
        const seuilKey = `${r.station_id}_${r.article_id}`;
        const seuil = seuilMap[seuilKey] ?? null;
        return {
          id: r.id as string,
          article_nom: article?.nom ?? "—",
          categorie: article?.categories_articles?.nom ?? "—",
          station_nom: stations.find(st => st.id === (r.station_id as string))?.nom ?? "—",
          quantite: qtie,
          cmup,
          valeur: qtie * cmup,
          seuil_min: seuil,
          alerte: seuil !== null && qtie <= seuil,
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  const filtered = rows.filter(r =>
    r.article_nom.toLowerCase().includes(search.toLowerCase()) ||
    r.categorie.toLowerCase().includes(search.toLowerCase())
  );

  const valeurTotale = filtered.reduce((a, r) => a + r.valeur, 0);
  const nbAlertes = filtered.filter(r => r.alerte).length;

  function handleExport() {
    exportCsv(filtered.map(r => ({
      Station: r.station_nom,
      Article: r.article_nom,
      Catégorie: r.categorie,
      Quantité: r.quantite,
      "CMUP (Ar)": r.cmup,
      "Valeur (Ar)": r.valeur,
      "Seuil min": r.seuil_min ?? "",
      Alerte: r.alerte ? "Oui" : "Non",
    })), `stock-boutique-${new Date().toISOString().split("T")[0]}`);
  }

  return (
    <ReportLayout title="Stock boutique" description="État des stocks valorisés au CMUP" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Valeur totale :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(valeurTotale)}</span>
          </div>
          {nbAlertes > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
              <span className="text-red-700 font-semibold">{nbAlertes} article(s) sous seuil d'alerte</span>
            </div>
          )}
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">CMUP (Ar)</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                  <TableHead>Alerte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Aucun article en stock
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className={r.alerte ? "bg-red-50/50" : undefined}>
                    <TableCell className="text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-sm font-medium">{r.article_nom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.categorie}</TableCell>
                    <TableCell className="text-right text-sm">{r.quantite.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right text-sm">{r.cmup.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(r.valeur)}</TableCell>
                    <TableCell>
                      {r.alerte ? (
                        <Badge variant="destructive" className="text-xs">Alerte</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
