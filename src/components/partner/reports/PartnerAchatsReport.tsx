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
import {
  defaultDateRange,
  getAchatsCarburant,
  getPartenaireStations,
  type AchatCarburantRow,
} from "@/services/partnerReportService";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function PartnerAchatsReport() {
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

  const { data: rows = [], isLoading } = useQuery<AchatCarburantRow[]>({
    queryKey: ["partner-achats", stationIds, dateFrom, dateTo],
    queryFn: () => getAchatsCarburant(stationIds, dateFrom, dateTo),
    enabled: stationIds.length > 0,
  });

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Entreprise: r.entreprise_nom,
        "Date commande": r.date_commande,
        "Date livraison": r.date_livraison ?? "",
        "N° BC": r.numero_bc,
        "N° BL": r.numero_bl ?? "",
        Statut: r.statut ?? "",
      })),
      `achats-carburant-reseau-${dateFrom}-${dateTo}`,
    );
  }

  return (
    <ReportLayout
      title="Achats carburant réseau"
      description="Bons de commande et de livraison par entreprise du réseau"
      backHref="/partner/rapports"
      onExport={rows.length > 0 ? handleExport : undefined}
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Du</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Au</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun achat sur la période.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Date commande</TableHead>
                  <TableHead>Date livraison</TableHead>
                  <TableHead>N° BC</TableHead>
                  <TableHead>N° BL</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.achat_id}>
                    <TableCell className="font-medium text-sm">
                      {r.entreprise_nom}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.date_commande}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.date_livraison ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.numero_bc}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.numero_bl ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {r.statut ?? "—"}
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
