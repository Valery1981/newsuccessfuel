"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface AlertRow {
  article_nom: string;
  famille: string;
  station_nom: string;
  stock_actuel: number;
  seuil_minimum: number;
  unite: string;
  statut: "rupture" | "alerte";
}

export function ArticlesSeuhlAlertReport() {
  const { entreprise } = useAuthStore();

  const { data: rows = [], isLoading } = useQuery<AlertRow[]>({
    queryKey: ["report-articles-alerte", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];

      // Fetch seuils with article info
      const { data: seuils, error: sErr } = await supabase
        .from("seuils_alerte_stock")
        .select("seuil_minimum, station_id, articles(nom, famille, unite)")
        .not("article_id", "is", null);
      if (sErr) throw sErr;

      // Fetch latest stock per article per station from vue_mouvements_stock
      const { data: mouvs } = await supabase
        .from("vue_mouvements_stock")
        .select("article_id, station_id, stock_apres, date_mouvement")
        .eq("entreprise_id", entreprise.id)
        .not("article_id", "is", null)
        .order("date_mouvement", { ascending: false });

      // Build map: article_id+station_id → latest stock
      const stockMap: Record<string, number> = {};
      for (const m of (mouvs ?? [])) {
        const r = m as Record<string, unknown>;
        const key = `${r.article_id}-${r.station_id}`;
        if (stockMap[key] === undefined) {
          stockMap[key] = (r.stock_apres as number) ?? 0;
        }
      }

      const stationsRes = await supabase
        .from("stations")
        .select("id, nom")
        .eq("entreprise_id", entreprise.id);
      const stationsMap: Record<string, string> = {};
      for (const s of (stationsRes.data ?? [])) {
        const sr = s as Record<string, unknown>;
        stationsMap[sr.id as string] = sr.nom as string;
      }

      const result: AlertRow[] = [];
      for (const s of (seuils ?? [])) {
        const sr = s as Record<string, unknown>;
        const art = sr.articles as { nom: string; famille: string; unite: string | null } | null;
        if (!art) continue;
        const sid = sr.station_id as string | null;
        const key = `${sr.article_id}-${sid}`;
        const stock = stockMap[key] ?? 0;
        const seuil = (sr.seuil_minimum as number) ?? 0;
        if (stock >= seuil) continue; // above threshold — skip
        result.push({
          article_nom: art.nom,
          famille: art.famille,
          station_nom: sid ? (stationsMap[sid] ?? "—") : "Toutes",
          stock_actuel: stock,
          seuil_minimum: seuil,
          unite: art.unite ?? "u",
          statut: stock <= 0 ? "rupture" : "alerte",
        });
      }

      return result.sort((a, b) => {
        if (a.statut !== b.statut) return a.statut === "rupture" ? -1 : 1;
        return a.stock_actuel - b.stock_actuel;
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const ruptures = rows.filter((r) => r.statut === "rupture").length;
  const alertes = rows.filter((r) => r.statut === "alerte").length;

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Article: r.article_nom,
        Famille: r.famille,
        Station: r.station_nom,
        "Stock actuel": r.stock_actuel,
        Unité: r.unite,
        "Seuil minimum": r.seuil_minimum,
        Statut: r.statut === "rupture" ? "RUPTURE" : "ALERTE",
      })),
      "articles-alerte",
    );
  }

  return (
    <ReportLayout
      title="Articles sous seuil d'alerte"
      description="Articles en rupture ou sous seuil minimum — action requise"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        {!isLoading && (
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Ruptures :</span>{" "}
              <span className="font-bold text-red-700">{ruptures}</span>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Sous seuil :</span>{" "}
              <span className="font-bold text-orange-700">{alertes}</span>
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
                  <TableHead>Station</TableHead>
                  <TableHead className="text-right">Stock actuel</TableHead>
                  <TableHead className="text-right">Seuil min</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucun article sous seuil d&apos;alerte
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow
                      key={i}
                      className={cn(r.statut === "rupture" && "bg-red-50/40")}
                    >
                      <TableCell className="text-sm font-medium">{r.article_nom}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.famille}</TableCell>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell className={cn("text-right text-sm font-bold", r.statut === "rupture" ? "text-red-700" : "text-orange-700")}>
                        {r.stock_actuel} {r.unite}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {r.seuil_minimum} {r.unite}
                      </TableCell>
                      <TableCell>
                        {r.statut === "rupture" ? (
                          <Badge variant="destructive" className="text-xs">RUPTURE</Badge>
                        ) : (
                          <Badge className="text-xs bg-orange-100 text-orange-800">ALERTE</Badge>
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
