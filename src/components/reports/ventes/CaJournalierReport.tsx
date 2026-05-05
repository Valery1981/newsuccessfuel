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
import { PageLoading } from "@/components/common/LoadingSpinner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface DayRow {
  date: string;
  dateLabel: string;
  ca_carburant: number;
  ca_boutique: number;
  ca_total: number;
}

export function CaJournalierReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<DayRow[]>({
    queryKey: ["report-ca-journalier", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];

      const stationFilter = filters.stationId
        ? [filters.stationId]
        : stations.map(s => s.id);
      if (!stationFilter.length) return [];

      // CA carburant par jour
      const { data: shifts } = await supabase
        .from("shifts_carburant")
        .select("date_shift, ca_total")
        .in("station_id", stationFilter)
        .gte("date_shift", filters.dateDebut)
        .lte("date_shift", filters.dateFin);

      // CA boutique par jour (date_vente est un TIMESTAMPTZ, on prend la partie date)
      const { data: tickets } = await supabase
        .from("tickets_boutique")
        .select("date_vente, total")
        .in("station_id", stationFilter)
        .gte("date_vente", filters.dateDebut)
        .lte("date_vente", filters.dateFin + "T23:59:59");

      const map: Record<string, { carburant: number; boutique: number }> = {};
      for (const s of (shifts ?? [])) {
        const d = s.date_shift as string;
        if (!map[d]) map[d] = { carburant: 0, boutique: 0 };
        map[d].carburant += (s.ca_total as number) ?? 0;
      }
      for (const t of (tickets ?? [])) {
        const r = t as Record<string, unknown>;
        const d = ((r.date_vente as string) ?? "").split("T")[0];
        if (!map[d]) map[d] = { carburant: 0, boutique: 0 };
        map[d].boutique += (r.total as number) ?? 0;
      }

      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          dateLabel: format(new Date(date), "dd/MM", { locale: fr }),
          ca_carburant: v.carburant,
          ca_boutique: v.boutique,
          ca_total: v.carburant + v.boutique,
        }));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const caTotal = rows.reduce((acc, r) => acc + r.ca_total, 0);
  const caCarburant = rows.reduce((acc, r) => acc + r.ca_carburant, 0);
  const caBoutique = rows.reduce((acc, r) => acc + r.ca_boutique, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Date: r.date,
      "CA Carburant (Ar)": r.ca_carburant,
      "CA Boutique (Ar)": r.ca_boutique,
      "CA Total (Ar)": r.ca_total,
    })), `ca-journalier-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="CA journalier" description="Chiffre d'affaires par jour — carburant + boutique" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">CA total :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(caTotal)}</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Carburant :</span>{" "}
            <span className="font-semibold text-blue-700">{formatCurrency(caCarburant)}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Boutique :</span>{" "}
            <span className="font-semibold text-amber-700">{formatCurrency(caBoutique)}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <>
            {rows.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="ca_carburant" name="Carburant" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ca_boutique" name="Boutique" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ca_total" name="Total" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">CA Carburant</TableHead>
                    <TableHead className="text-right">CA Boutique</TableHead>
                    <TableHead className="text-right font-semibold">CA Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Aucune donnée sur cette période
                      </TableCell>
                    </TableRow>
                  ) : rows.map(r => (
                    <TableRow key={r.date}>
                      <TableCell className="text-sm">{format(new Date(r.date), "EEEE dd MMM yyyy", { locale: fr })}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.ca_carburant)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.ca_boutique)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.ca_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
