"use client";

import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  getPartenaireStations,
  getRealisations,
  type ObjectifRow,
} from "@/services/partnerReportService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function PartnerRealisationsReport() {
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

  const { data: rows = [], isLoading } = useQuery<ObjectifRow[]>({
    queryKey: ["partner-realisations", stationIds, dateFrom, dateTo],
    queryFn: () => getRealisations(stationIds, dateFrom, dateTo),
    enabled: stationIds.length > 0,
  });

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Station: r.station_nom,
        Type: r.type,
        Carburant: r.type_carburant ?? "",
        Objectif: r.objectif,
        Réalisé: r.realise,
        "Taux (%)": r.taux,
      })),
      `realisations-vs-objectifs-${dateFrom}-${dateTo}`,
    );
  }

  function formatValue(row: ObjectifRow, value: number) {
    if (row.type === "ca_boutique") return formatCurrency(value);
    return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L`;
  }

  return (
    <ReportLayout
      title="Réalisations vs Objectifs"
      description="Volumes carburant (L) et CA boutique vs objectifs fixés"
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
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucun objectif configuré sur la période.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Objectif</TableHead>
                  <TableHead className="text-right">Réalisé</TableHead>
                  <TableHead className="w-36">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{r.station_nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {r.type === "ca_boutique" ? "CA Boutique" : r.type_carburant ?? r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatValue(r, r.objectif)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatValue(r, r.realise)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(r.taux, 100)} className="h-1.5 flex-1" />
                        <span className={`text-xs font-mono w-10 text-right ${r.taux >= 100 ? "text-green-600" : r.taux >= 80 ? "text-amber-600" : "text-red-600"}`}>
                          {r.taux}%
                        </span>
                      </div>
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
