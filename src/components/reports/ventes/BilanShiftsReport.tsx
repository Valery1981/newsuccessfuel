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

const supabase = createClient();

interface ShiftBilan {
  id: string;
  date_shift: string;
  station_nom: string;
  pompiste_nom: string;
  ca_total: number;
  ecart_caisse: number;
  statut: string;
}

export function BilanShiftsReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<ShiftBilan[]>({
    queryKey: ["report-bilan-shifts", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map(s => s.id);
      const { data, error } = await supabase
        .from("shifts_carburant")
        .select("id, date_shift, station_id, ca_total, ecart_caisse, statut, pompiste_id, tiers(nom)")
        .in("station_id", stationFilter)
        .gte("date_shift", filters.dateDebut)
        .lte("date_shift", filters.dateFin)
        .order("date_shift", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(s => {
        const r = s as Record<string, unknown>;
        return {
          id: r.id as string,
          date_shift: r.date_shift as string,
          station_nom: stations.find(st => st.id === (r.station_id as string))?.nom ?? "—",
          pompiste_nom: (r.tiers as { nom: string } | null)?.nom ?? "—",
          ca_total: (r.ca_total as number) ?? 0,
          ecart_caisse: (r.ecart_caisse as number) ?? 0,
          statut: (r.statut as string) ?? "en_cours",
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const totalCA = rows.reduce((a, r) => a + r.ca_total, 0);
  const totalEcart = rows.reduce((a, r) => a + r.ecart_caisse, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Date: r.date_shift,
      Station: r.station_nom,
      Pompiste: r.pompiste_nom,
      "CA (Ar)": r.ca_total,
      "Écart caisse (Ar)": r.ecart_caisse,
      Statut: r.statut,
    })), `bilan-shifts-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Bilan des shifts carburant" description="Récapitulatif complet des shifts avec écarts" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">CA total :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(totalCA)}</span>
          </div>
          <div className={`border rounded-lg px-4 py-2 text-sm ${totalEcart < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <span className="text-muted-foreground">Écart caisse total :</span>{" "}
            <span className={`font-semibold ${totalEcart < 0 ? "text-red-700" : "text-green-700"}`}>
              {totalEcart > 0 ? "+" : ""}{formatCurrency(totalEcart)}
            </span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Pompiste</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                    <TableHead className="text-right">Écart caisse</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Aucun shift sur cette période
                    </TableCell>
                  </TableRow>
                  ) : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(new Date(r.date_shift), "dd MMM yyyy", { locale: fr })}</TableCell>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell className="text-sm">{r.pompiste_nom}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.ca_total)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${r.ecart_caisse < 0 ? "text-red-600" : r.ecart_caisse > 0 ? "text-green-600" : ""}`}>
                        {r.ecart_caisse !== 0 ? (r.ecart_caisse > 0 ? "+" : "") + formatCurrency(r.ecart_caisse) : "—"}
                      </TableCell>
                    <TableCell>
                      <Badge variant={r.statut === "cloture" ? "secondary" : "default"} className="text-xs">
                        {r.statut === "cloture" ? "Clôturé" : "En cours"}
                      </Badge>
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
