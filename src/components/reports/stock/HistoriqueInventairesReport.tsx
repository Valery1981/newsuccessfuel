"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, type ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const supabase = createClient();

interface InventaireRow {
  id: string;
  date: string;
  station_nom: string;
  type: string;
  statut: string;
  nb_lignes: number;
  total_ecart: number;
  regularise: boolean;
}

const STATUT_LABELS: Record<string, string> = {
  en_cours: "En cours",
  enregistre: "Enregistré",
  regularise: "Régularisé",
};

export function HistoriqueInventairesReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();
  const [typeFilter, setTypeFilter] = useState<"all" | "carburant" | "boutique">("all");

  const { data: rows = [], isLoading } = useQuery<InventaireRow[]>({
    queryKey: ["report-historique-inventaires", filters, typeFilter, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map((s) => s.id);

      let query = supabase
        .from("inventaires")
        .select("id, station_id, date_inventaire, type, statut, regularise_at")
        .in("station_id", stationFilter)
        .gte("date_inventaire", filters.dateDebut)
        .lte("date_inventaire", filters.dateFin)
        .order("date_inventaire", { ascending: false });
      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      const { data: invs, error } = await query;
      if (error) throw error;

      // Aggregate ecart per inventaire from boutique lines
      const invIds = (invs ?? []).map((i) => (i as Record<string, unknown>).id as string);

      const [boutiqLines, carbLines] = await Promise.all([
        invIds.length
          ? supabase.from("lignes_inventaire_boutique").select("inventaire_id, ecart").in("inventaire_id", invIds)
          : { data: [] },
        invIds.length
          ? supabase.from("lignes_inventaire_carburant").select("inventaire_id, ecart_litres").in("inventaire_id", invIds)
          : { data: [] },
      ]);

      const ecartMap: Record<string, { ecart: number; nb: number }> = {};
      for (const l of (boutiqLines.data ?? [])) {
        const r = l as Record<string, unknown>;
        const iid = r.inventaire_id as string;
        if (!ecartMap[iid]) ecartMap[iid] = { ecart: 0, nb: 0 };
        ecartMap[iid].ecart += Math.abs((r.ecart as number) ?? 0);
        ecartMap[iid].nb += 1;
      }
      for (const l of (carbLines.data ?? [])) {
        const r = l as Record<string, unknown>;
        const iid = r.inventaire_id as string;
        if (!ecartMap[iid]) ecartMap[iid] = { ecart: 0, nb: 0 };
        ecartMap[iid].ecart += Math.abs((r.ecart_litres as number) ?? 0);
        ecartMap[iid].nb += 1;
      }

      return (invs ?? []).map((inv) => {
        const r = inv as Record<string, unknown>;
        const sid = r.station_id as string;
        const agg = ecartMap[r.id as string] ?? { ecart: 0, nb: 0 };
        return {
          id: r.id as string,
          date: r.date_inventaire as string,
          station_nom: stations.find((s) => s.id === sid)?.nom ?? "—",
          type: r.type as string,
          statut: r.statut as string,
          nb_lignes: agg.nb,
          total_ecart: agg.ecart,
          regularise: !!(r.regularise_at),
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Date: r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—",
        Station: r.station_nom,
        Type: r.type === "carburant" ? "Carburant" : "Boutique",
        Statut: STATUT_LABELS[r.statut] ?? r.statut,
        "Nb lignes": r.nb_lignes,
        "Total écart (abs)": r.total_ecart.toFixed(2),
        Régularisé: r.regularise ? "Oui" : "Non",
      })),
      `historique-inventaires-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Historique inventaires"
      description="Liste des inventaires passés — carburant et boutique"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <ReportFilters stations={stations} values={filters} onChange={setFilters} />
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous</SelectItem>
                <SelectItem value="carburant" className="text-xs">Carburant</SelectItem>
                <SelectItem value="boutique" className="text-xs">Boutique</SelectItem>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Nb lignes</TableHead>
                  <TableHead className="text-right">Écart total (abs)</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucun inventaire sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", r.type === "carburant" ? "border-amber-400 text-amber-700" : "border-blue-400 text-blue-700")}>
                          {r.type === "carburant" ? "Carburant" : "Boutique"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.nb_lignes}</TableCell>
                      <TableCell className={cn("text-right text-sm font-medium", r.total_ecart > 0 ? "text-orange-700" : "")}>
                        {r.total_ecart.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs",
                            r.statut === "regularise" ? "bg-green-100 text-green-800"
                            : r.statut === "enregistre" ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800",
                          )}
                        >
                          {STATUT_LABELS[r.statut] ?? r.statut}
                        </Badge>
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
