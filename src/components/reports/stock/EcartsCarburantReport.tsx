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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface EcartRow {
  date: string;
  station_nom: string;
  cuve_nom: string;
  type_carburant: string;
  stock_theorique: number;
  volume_reel: number;
  ecart_litres: number;
  ecart_pct: number;
  motif: string | null;
  valeur_ecart: number | null;
}

const MOTIF_LABELS: Record<string, string> = {
  justifie: "Justifié",
  excedent: "Excédent",
  infonde: "Infondé",
};

export function EcartsCarburantReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<EcartRow[]>({
    queryKey: ["report-ecarts-carburant", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map((s) => s.id);

      // Get inventaires carburant in period for these stations
      const { data: invs } = await supabase
        .from("inventaires")
        .select("id, station_id, date_inventaire")
        .in("station_id", stationFilter)
        .eq("type", "carburant")
        .gte("date_inventaire", filters.dateDebut)
        .lte("date_inventaire", filters.dateFin);
      const invIds = (invs ?? []).map((i) => (i as Record<string, unknown>).id as string);
      if (!invIds.length) return [];

      const invDateMap: Record<string, { station_id: string; date: string }> = {};
      for (const inv of (invs ?? [])) {
        const r = inv as Record<string, unknown>;
        invDateMap[r.id as string] = { station_id: r.station_id as string, date: r.date_inventaire as string };
      }

      // Get carburant lines for those inventaires
      const { data: lines, error } = await supabase
        .from("lignes_inventaire_carburant")
        .select("inventaire_id, cuve_id, stock_theorique_litres, volume_reel_litres, ecart_litres, jauge_reelle_cm, motif, valeur_ecart, cuves(nom, type_carburant)")
        .in("inventaire_id", invIds);
      if (error) throw error;

      return (lines ?? []).map((l) => {
        const rec = l as Record<string, unknown>;
        const cuve = rec.cuves as { nom: string; type_carburant: string } | null;
        const inv = invDateMap[rec.inventaire_id as string];
        const station_nom = stations.find((s) => s.id === inv?.station_id)?.nom ?? "—";
        const theorique = (rec.stock_theorique_litres as number) ?? 0;
        const reel = (rec.volume_reel_litres as number) ?? 0;
        const ecart = (rec.ecart_litres as number) ?? reel - theorique;
        return {
          date: inv?.date ?? "—",
          station_nom,
          cuve_nom: cuve?.nom ?? "—",
          type_carburant: cuve?.type_carburant ?? "—",
          stock_theorique: theorique,
          volume_reel: reel,
          ecart_litres: ecart,
          ecart_pct: theorique > 0 ? (ecart / theorique) * 100 : 0,
          motif: rec.motif as string | null,
          valeur_ecart: rec.valeur_ecart as number | null,
        };
      }).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const totalEcart = rows.reduce((a, r) => a + r.ecart_litres, 0);
  const totalValeur = rows.reduce((a, r) => a + (r.valeur_ecart ?? 0), 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Date: r.date,
        Station: r.station_nom,
        Cuve: r.cuve_nom,
        Carburant: r.type_carburant,
        "Stock théorique (L)": r.stock_theorique.toFixed(2),
        "Volume réel (L)": r.volume_reel.toFixed(2),
        "Écart (L)": r.ecart_litres.toFixed(2),
        "Écart %": r.ecart_pct.toFixed(2),
        Motif: r.motif ? (MOTIF_LABELS[r.motif] ?? r.motif) : "—",
        "Valeur écart (Ar)": r.valeur_ecart ?? 0,
      })),
      `ecarts-carburant-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Écarts carburant par station"
      description="Récapitulatif des écarts d'inventaire carburant — volume et valeur"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        {!isLoading && rows.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            <div className={cn("border rounded-lg px-3 py-1.5", totalEcart < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
              <span className="text-muted-foreground">Total écart :</span>{" "}
              <span className={cn("font-bold", totalEcart < 0 ? "text-red-700" : "text-green-700")}>
                {totalEcart.toFixed(2)} L
              </span>
            </div>
            {totalValeur !== 0 && (
              <div className="bg-muted border rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground">Valeur écart :</span>{" "}
                <span className="font-semibold">{formatCurrency(totalValeur)}</span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Cuve</TableHead>
                  <TableHead>Carburant</TableHead>
                  <TableHead className="text-right">Théorique (L)</TableHead>
                  <TableHead className="text-right">Réel (L)</TableHead>
                  <TableHead className="text-right">Écart (L)</TableHead>
                  <TableHead>Motif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Aucun inventaire carburant sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={i} className={cn(r.ecart_litres < -10 && "bg-red-50/30")}>
                      <TableCell className="text-sm">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell className="text-sm font-medium">{r.cuve_nom}</TableCell>
                      <TableCell className="text-sm capitalize">{r.type_carburant}</TableCell>
                      <TableCell className="text-right text-sm">{r.stock_theorique.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">{r.volume_reel.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right text-sm font-semibold", r.ecart_litres < 0 ? "text-red-700" : "text-green-700")}>
                        {r.ecart_litres > 0 ? "+" : ""}{r.ecart_litres.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {r.motif ? (
                          <Badge variant="outline" className="text-xs">{MOTIF_LABELS[r.motif] ?? r.motif}</Badge>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={6} className="text-sm">Total</TableCell>
                    <TableCell className={cn("text-right text-sm font-bold", totalEcart < 0 ? "text-red-700" : "text-green-700")}>
                      {totalEcart > 0 ? "+" : ""}{totalEcart.toFixed(2)} L
                    </TableCell>
                    <TableCell />
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
