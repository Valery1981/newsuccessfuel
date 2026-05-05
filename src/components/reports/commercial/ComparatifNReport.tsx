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
import { PageLoading } from "@/components/common/LoadingSpinner";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subYears, format } from "date-fns";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface PeriodData {
  ca_carburant: number;
  ca_boutique: number;
  ca_total: number;
}

async function fetchCA(
  supabaseClient: ReturnType<typeof createClient>,
  stationIds: string[],
  dateDebut: string,
  dateFin: string,
): Promise<PeriodData> {
  const [{ data: shifts }, { data: tickets }] = await Promise.all([
    supabaseClient
      .from("shifts_carburant")
      .select("ca_total")
      .in("station_id", stationIds)
      .gte("date_shift", dateDebut)
      .lte("date_shift", dateFin),
    supabaseClient
      .from("tickets_boutique")
      .select("total")
      .in("station_id", stationIds)
      .gte("date_vente", dateDebut)
      .lte("date_vente", dateFin + "T23:59:59"),
  ]);

  const ca_carburant = (shifts ?? []).reduce(
    (a, s) => a + ((s as Record<string, unknown>).ca_total as number ?? 0), 0,
  );
  const ca_boutique = (tickets ?? []).reduce(
    (a, t) => a + ((t as Record<string, unknown>).total as number ?? 0), 0,
  );
  return { ca_carburant, ca_boutique, ca_total: ca_carburant + ca_boutique };
}

function delta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function DeltaCell({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  if (pct > 0.5)
    return (
      <span className="flex items-center gap-0.5 text-green-700 font-semibold text-sm">
        <TrendingUp className="w-3.5 h-3.5" />+{abs.toFixed(1)}%
      </span>
    );
  if (pct < -0.5)
    return (
      <span className="flex items-center gap-0.5 text-red-700 font-semibold text-sm">
        <TrendingDown className="w-3.5 h-3.5" />-{abs.toFixed(1)}%
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-sm">
      <Minus className="w-3.5 h-3.5" />0%
    </span>
  );
}

export function ComparatifNReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data, isLoading } = useQuery<{ n: PeriodData; n1: PeriodData }>({
    queryKey: ["report-comparatif-n", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return { n: { ca_carburant: 0, ca_boutique: 0, ca_total: 0 }, n1: { ca_carburant: 0, ca_boutique: 0, ca_total: 0 } };
      const stationIds = filters.stationId ? [filters.stationId] : stations.map((s) => s.id);

      const d1_n1 = format(subYears(new Date(filters.dateDebut), 1), "yyyy-MM-dd");
      const d2_n1 = format(subYears(new Date(filters.dateFin), 1), "yyyy-MM-dd");

      const [n, n1] = await Promise.all([
        fetchCA(supabase, stationIds, filters.dateDebut, filters.dateFin),
        fetchCA(supabase, stationIds, d1_n1, d2_n1),
      ]);
      return { n, n1 };
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  function handleExport() {
    if (!data) return;
    exportCsv(
      [
        { Métrique: "CA Carburant", N: data.n.ca_carburant, "N-1": data.n1.ca_carburant, "Δ%": delta(data.n.ca_carburant, data.n1.ca_carburant).toFixed(1) },
        { Métrique: "CA Boutique", N: data.n.ca_boutique, "N-1": data.n1.ca_boutique, "Δ%": delta(data.n.ca_boutique, data.n1.ca_boutique).toFixed(1) },
        { Métrique: "CA Total", N: data.n.ca_total, "N-1": data.n1.ca_total, "Δ%": delta(data.n.ca_total, data.n1.ca_total).toFixed(1) },
      ],
      `comparatif-n-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  const n1Start = filters.dateDebut
    ? format(subYears(new Date(filters.dateDebut), 1), "dd/MM/yyyy")
    : "—";
  const n1End = filters.dateFin
    ? format(subYears(new Date(filters.dateFin), 1), "dd/MM/yyyy")
    : "—";

  const metrics: { label: string; key: keyof PeriodData }[] = [
    { label: "CA Carburant", key: "ca_carburant" },
    { label: "CA Boutique", key: "ca_boutique" },
    { label: "CA Total", key: "ca_total" },
  ];

  return (
    <ReportLayout
      title="Comparatif N vs N-1"
      description="Même période — année courante vs année précédente"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        {isLoading ? (
          <PageLoading />
        ) : data ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicateur</TableHead>
                  <TableHead className="text-right">N ({filters.dateDebut} → {filters.dateFin})</TableHead>
                  <TableHead className="text-right">N-1 ({n1Start} → {n1End})</TableHead>
                  <TableHead className="text-right">Évolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map(({ label, key }) => {
                  const pct = delta(data.n[key], data.n1[key]);
                  return (
                    <TableRow key={key} className={cn(key === "ca_total" && "bg-muted/40 font-semibold border-t-2")}>
                      <TableCell className="text-sm">{label}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(data.n[key])}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(data.n1[key])}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeltaCell pct={pct} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>
    </ReportLayout>
  );
}
