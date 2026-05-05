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
  getEcartsCarburant,
  getPartenaireStations,
  type EcartCarburantRow,
} from "@/services/partnerReportService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function PartnerEcartsCarburantReport() {
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

  const { data: rows = [], isLoading } = useQuery<EcartCarburantRow[]>({
    queryKey: ["partner-ecarts-carburant", stationIds, dateFrom, dateTo],
    queryFn: () => getEcartsCarburant(stationIds, dateFrom, dateTo),
    enabled: stationIds.length > 0,
  });

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Station: r.station_nom,
        Date: r.date_inventaire,
        Carburant: r.type_carburant,
        "Écart (L)": r.ecart_litres.toFixed(2),
      })),
      `ecarts-carburant-reseau-${dateFrom}-${dateTo}`,
    );
  }

  return (
    <ReportLayout
      title="Écarts carburant réseau"
      description="Écarts d'inventaire (litres) par station — sans valorisation"
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
          <p className="text-sm text-muted-foreground py-8 text-center">Aucun inventaire sur la période.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Carburant</TableHead>
                  <TableHead className="text-right">Écart (L)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.date_inventaire}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{r.type_carburant}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${r.ecart_litres < 0 ? "text-red-600" : r.ecart_litres > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {r.ecart_litres > 0 ? "+" : ""}{r.ecart_litres.toFixed(2)} L
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
