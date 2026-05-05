"use client";

import { ReportLayout } from "@/components/reports/ReportLayout";
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
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  defaultDateRange,
  getComparatifStations,
  getPartenaireStations,
  type ComparatifRow,
} from "@/services/partnerReportService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function PartnerComparatifReport() {
  const { compte } = useAuthStore();
  const { from, to } = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  const { data: stations = [] } = useQuery({
    queryKey: ["partner-stations", compte?.id],
    queryFn: () => getPartenaireStations(compte!.id),
    enabled: !!compte?.id,
  });

  const stationIds = stations.map((s) => s.id);

  const { data: rows = [], isLoading } = useQuery<ComparatifRow[]>({
    queryKey: ["partner-comparatif", stationIds, dateFrom, dateTo],
    queryFn: () => getComparatifStations(stationIds, dateFrom, dateTo),
    enabled: stationIds.length > 0,
  });

  function handleExport() {
    exportCsv(
      rows.map((r, i) => ({
        Rang: i + 1,
        Station: r.station_nom,
        "Volume (L)": r.volume_litres.toFixed(2),
        "CA Boutique (Ar)": r.ca_boutique.toFixed(0),
        "Doléances": r.nb_doleances,
      })),
      `comparatif-stations-${dateFrom}-${dateTo}`,
    );
  }

  return (
    <ReportLayout
      title="Comparatif inter-stations"
      description="Ranking performance par station — volumes + CA boutique"
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
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée sur la période.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead className="text-right">Volume (L)</TableHead>
                  <TableHead className="text-right">CA Boutique</TableHead>
                  <TableHead className="text-right">Doléances</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.station_id} className={i === 0 ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}>
                    <TableCell className="text-center font-bold text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-blue-700">
                      {r.volume_litres.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(r.ca_boutique)}
                    </TableCell>
                    <TableCell className={`text-right text-sm ${r.nb_doleances > 5 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                      {r.nb_doleances}
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
