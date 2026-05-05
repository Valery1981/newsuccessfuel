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
  getCaBoutique,
  getPartenaireStations,
  type CaBoutiqueRow,
} from "@/services/partnerReportService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function PartnerCaBoutiqueReport() {
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

  const { data: rows = [], isLoading } = useQuery<CaBoutiqueRow[]>({
    queryKey: ["partner-ca-boutique", stationIds, dateFrom, dateTo],
    queryFn: () => getCaBoutique(stationIds, dateFrom, dateTo),
    enabled: stationIds.length > 0,
  });

  const totalCa = rows.reduce((s, r) => s + r.ca_total, 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Station: r.station_nom,
        "CA Boutique (Ar)": r.ca_total.toFixed(0),
        "Nb Tickets": r.nb_tickets,
      })),
      `ca-boutique-reseau-${dateFrom}-${dateTo}`,
    );
  }

  return (
    <ReportLayout
      title="CA Boutique réseau"
      description="Chiffre d'affaires boutique par station — sans marges ni coûts"
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
          {totalCa > 0 && (
            <div className="ml-auto text-sm font-semibold">
              Total réseau : <span className="text-blue-700">{formatCurrency(totalCa)}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune vente boutique sur la période.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead className="text-right">CA Boutique</TableHead>
                  <TableHead className="text-right">Nb Tickets</TableHead>
                  <TableHead className="text-right">Part réseau</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.station_id}>
                    <TableCell className="font-medium text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(r.ca_total)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.nb_tickets}</TableCell>
                    <TableCell className="text-right text-sm">
                      {totalCa > 0 ? `${((r.ca_total / totalCa) * 100).toFixed(1)}%` : "—"}
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
