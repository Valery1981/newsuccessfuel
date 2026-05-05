"use client";

import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
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
  getPartenaireStations,
  getStocksCarburant,
  type StockCarburantRow,
} from "@/services/partnerReportService";
import { useQuery } from "@tanstack/react-query";

export function PartnerStocksReport() {
  const { compte } = useAuthStore();

  const { data: stations = [] } = useQuery({
    queryKey: ["partner-stations", compte?.id],
    queryFn: () => getPartenaireStations(compte!.id),
    enabled: !!compte?.id,
  });

  const stationIds = stations.map((s) => s.id);

  const { data: rows = [], isLoading } = useQuery<StockCarburantRow[]>({
    queryKey: ["partner-stocks", stationIds],
    queryFn: () => getStocksCarburant(stationIds),
    enabled: stationIds.length > 0,
  });

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Station: r.station_nom,
        Cuve: r.cuve_nom,
        Carburant: r.type_carburant,
        "Stock (L)": r.stock_litres.toFixed(2),
        "Jauge (cm)": r.jauge_cm ?? "",
      })),
      "stocks-carburant-reseau",
    );
  }

  return (
    <ReportLayout
      title="Stocks carburant réseau"
      description="Niveaux actuels par cuve et par station"
      backHref="/partner/rapports"
      onExport={rows.length > 0 ? handleExport : undefined}
    >
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune cuve disponible.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Cuve</TableHead>
                  <TableHead>Carburant</TableHead>
                  <TableHead className="text-right">Stock (L)</TableHead>
                  <TableHead className="text-right">Jauge (cm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.cuve_id}>
                    <TableCell className="font-medium text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-sm">{r.cuve_nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{r.type_carburant}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {r.stock_litres.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {r.jauge_cm != null ? `${r.jauge_cm} cm` : "—"}
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
