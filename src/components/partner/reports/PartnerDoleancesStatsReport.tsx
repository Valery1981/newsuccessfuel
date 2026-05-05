"use client";

import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportCsv } from "@/lib/exportCsv";
import { useAuthStore } from "@/stores/authStore";
import {
  defaultDateRange,
  getDoleancesStats,
  type DoleanceStatRow,
} from "@/services/partnerReportService";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const supabase = createClient();

function usePartenaireId(compteId: string | undefined) {
  return useQuery({
    queryKey: ["partenaire-id", compteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("partenaires")
        .select("id")
        .eq("compte_id", compteId!)
        .maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    },
    enabled: !!compteId,
  });
}

export function PartnerDoleancesStatsReport() {
  const { compte } = useAuthStore();
  const { from, to } = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  const { data: partenaireId } = usePartenaireId(compte?.id);

  const { data: rows = [], isLoading } = useQuery<DoleanceStatRow[]>({
    queryKey: ["partner-doleances-stats", partenaireId, dateFrom, dateTo],
    queryFn: () => getDoleancesStats(partenaireId!, dateFrom, dateTo),
    enabled: !!partenaireId,
  });

  const totalDoleances = rows.reduce((s, r) => s + r.total, 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        "Type incident": r.type_incident,
        Total: r.total,
        Résolues: r.resolues,
        "Taux résolution (%)": r.taux_resolution,
        "Délai moyen résolution (min)": r.delai_moyen_resolution_min ?? "",
      })),
      `stats-doleances-${dateFrom}-${dateTo}`,
    );
  }

  function formatDelai(min: number | null) {
    if (min == null) return "—";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <ReportLayout
      title="Statistiques doléances"
      description="Délais de traitement, types d'incidents et taux de résolution"
      backHref="/partner/rapports"
      onExport={rows.length > 0 ? handleExport : undefined}
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Du</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Au</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          {totalDoleances > 0 && (
            <div className="ml-auto text-sm text-muted-foreground">
              {totalDoleances} doléance{totalDoleances > 1 ? "s" : ""} au total
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune doléance sur la période.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type incident</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Résolues</TableHead>
                  <TableHead className="text-right">Taux résolution</TableHead>
                  <TableHead className="text-right">Délai moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.type_incident}>
                    <TableCell className="font-medium text-sm capitalize">{r.type_incident.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right text-sm">{r.total}</TableCell>
                    <TableCell className="text-right text-sm">{r.resolues}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={`text-xs ${r.taux_resolution >= 80 ? "bg-green-100 text-green-800" : r.taux_resolution >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                        {r.taux_resolution}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDelai(r.delai_moyen_resolution_min)}
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
