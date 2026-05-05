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
  getPartenaireStations,
  getVolumesVendus,
  type VolumeRow,
} from "@/services/partnerReportService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function PartnerVolumesReport() {
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

  const { data: rows = [], isLoading } = useQuery<VolumeRow[]>({
    queryKey: ["partner-volumes", stationIds, dateFrom, dateTo],
    queryFn: () => getVolumesVendus(stationIds, dateFrom, dateTo),
    enabled: stationIds.length > 0,
  });

  const totalLitres = rows.reduce((s, r) => s + r.total_litres, 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Station: r.station_nom,
        "Carburant": r.type_carburant,
        "Volume (L)": r.total_litres.toFixed(2),
        "Nb Shifts": r.nb_shifts,
      })),
      `volumes-reseau-${dateFrom}-${dateTo}`,
    );
  }

  return (
    <ReportLayout
      title="Volumes vendus réseau"
      description="Litres vendus par station et par produit"
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
          {totalLitres > 0 && (
            <div className="ml-auto text-sm font-semibold">
              Total : <span className="text-blue-700">{totalLitres.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucun volume sur la période.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Carburant</TableHead>
                  <TableHead className="text-right">Volume (L)</TableHead>
                  <TableHead className="text-right">Shifts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{r.station_nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{r.type_carburant}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.total_litres.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.nb_shifts}</TableCell>
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
