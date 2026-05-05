"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import {
  ReportFilters,
  type ReportFilterValues,
} from "@/components/reports/ReportFilters";
import { ReportLayout } from "@/components/reports/ReportLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  defaultFilterValues,
  useReportStations,
} from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const supabase = createClient();

interface PompisteLigne {
  pompiste_nom: string;
  nb_shifts: number;
  ca_total: number;
  ecart_total: number;
}

export function CaPompisteReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(
    defaultFilterValues(),
  );
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<PompisteLigne[]>({
    queryKey: ["report-ca-pompiste", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId
        ? [filters.stationId]
        : stations.map((s) => s.id);

      const { data, error } = await supabase
        .from("shifts_carburant")
        .select("ca_total, ecart_caisse, pompiste_id, tiers(nom)")
        .in("station_id", stationFilter)
        .gte("date_shift", filters.dateDebut)
        .lte("date_shift", filters.dateFin);
      if (error) throw error;

      const map: Record<string, { ca: number; shifts: number; ecart: number }> =
        {};
      for (const s of data ?? []) {
        const rec = s as Record<string, unknown>;
        const tiers = rec.tiers as { nom: string } | null;
        const nom = tiers?.nom ?? "Inconnu";
        if (!map[nom]) map[nom] = { ca: 0, shifts: 0, ecart: 0 };
        map[nom].ca += (rec.ca_total as number) ?? 0;
        map[nom].ecart += (rec.ecart_caisse as number) ?? 0;
        map[nom].shifts += 1;
      }

      return Object.entries(map)
        .sort(([, a], [, b]) => b.ca - a.ca)
        .map(([nom, v]) => ({
          pompiste_nom: nom,
          nb_shifts: v.shifts,
          ca_total: v.ca,
          ecart_total: v.ecart,
        }));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const totalCa = rows.reduce((a, r) => a + r.ca_total, 0);
  const totalShifts = rows.reduce((a, r) => a + r.nb_shifts, 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        "Pompiste / Vendeur": r.pompiste_nom,
        "Nb shifts": r.nb_shifts,
        "CA total (Ar)": r.ca_total,
        "Écart caisse (Ar)": r.ecart_total,
        "CA moyen/shift (Ar)":
          r.nb_shifts > 0 ? Math.round(r.ca_total / r.nb_shifts) : 0,
      })),
      `ca-pompiste-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="CA par pompiste / vendeur"
      description="Chiffre d'affaires carburant par agent — performance individuelle"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters
          stations={stations}
          values={filters}
          onChange={setFilters}
        />

        {!isLoading && rows.length > 0 && (
          <div className="flex gap-3 flex-wrap text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">CA total :</span>{" "}
              <span className="font-bold text-green-700">
                {formatCurrency(totalCa)}
              </span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Total shifts :</span>{" "}
              <span className="font-semibold text-blue-700">{totalShifts}</span>
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
                  <TableHead>Pompiste / Vendeur</TableHead>
                  <TableHead className="text-right">Nb shifts</TableHead>
                  <TableHead className="text-right">CA total</TableHead>
                  <TableHead className="text-right">CA moy/shift</TableHead>
                  <TableHead className="text-right">Écart caisse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-10"
                    >
                      Aucun shift sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.pompiste_nom}>
                      <TableCell className="text-sm font-medium">
                        {r.pompiste_nom}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.nb_shifts}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-green-700">
                        {formatCurrency(r.ca_total)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(
                          r.nb_shifts > 0
                            ? Math.round(r.ca_total / r.nb_shifts)
                            : 0,
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${r.ecart_total < 0 ? "text-red-600" : r.ecart_total > 0 ? "text-green-600" : ""}`}
                      >
                        {r.ecart_total !== 0
                          ? `${r.ecart_total > 0 ? "+" : ""}${formatCurrency(r.ecart_total)}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm">
                      {totalShifts}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-700">
                      {formatCurrency(totalCa)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(
                        totalShifts > 0 ? Math.round(totalCa / totalShifts) : 0,
                      )}
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
