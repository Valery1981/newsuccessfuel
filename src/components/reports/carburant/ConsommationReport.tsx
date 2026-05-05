"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const supabase = createClient();

interface ConsoRow {
  station_nom: string;
  produit: string;
  volume_vendu: number;
  ca: number;
}

const PRODUIT_COLORS: Record<string, string> = {
  essence: "#10b981",
  gasoil: "#f59e0b",
  petrole: "#3b82f6",
  gpl: "#8b5cf6",
  lubrifiants: "#6b7280",
};

export function ConsommationReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<ConsoRow[]>({
    queryKey: ["report-consommation", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map(s => s.id);

      // Récupérer les lignes de shift associées aux shifts de ces stations
      const { data: shiftsData } = await supabase
        .from("shifts_carburant")
        .select("id, station_id")
        .in("station_id", stationFilter)
        .gte("date_shift", filters.dateDebut)
        .lte("date_shift", filters.dateFin);
      const shiftIds = (shiftsData ?? []).map(s => (s as Record<string, unknown>).id as string);
      if (!shiftIds.length) return [];

      const { data, error } = await supabase
        .from("lignes_shift_carburant")
        .select("shift_id, type_carburant, volume_vendu, ca")
        .in("shift_id", shiftIds);
      if (error) throw error;

      // Map shift_id → station_id
      const shiftStation: Record<string, string> = {};
      for (const s of (shiftsData ?? [])) {
        const r = s as Record<string, unknown>;
        shiftStation[r.id as string] = r.station_id as string;
      }

      const map: Record<string, ConsoRow> = {};
      for (const l of (data ?? [])) {
        const r = l as Record<string, unknown>;
        const stationId = shiftStation[r.shift_id as string] ?? "";
        const produit = (r.type_carburant as string) ?? "inconnu";
        const key = `${stationId}_${produit}`;
        if (!map[key]) {
          map[key] = {
            station_nom: stations.find(s => s.id === stationId)?.nom ?? "—",
            produit,
            volume_vendu: 0,
            ca: 0,
          };
        }
        map[key].volume_vendu += (r.volume_vendu as number) ?? 0;
        map[key].ca += (r.ca as number) ?? 0;
      }
      return Object.values(map).sort((a, b) => a.station_nom.localeCompare(b.station_nom));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const stationsChart = [...new Set(rows.map(r => r.station_nom))];
  const produits = [...new Set(rows.map(r => r.produit))];
  const chartData = stationsChart.map(sNom => {
    const entry: Record<string, unknown> = { station: sNom.substring(0, 12) };
    for (const p of produits) {
      const found = rows.find(r => r.station_nom === sNom && r.produit === p);
      entry[p] = found?.volume_vendu ?? 0;
    }
    return entry;
  });

  const totalVolume = rows.reduce((a, r) => a + r.volume_vendu, 0);
  const totalCA = rows.reduce((a, r) => a + r.ca, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Station: r.station_nom,
      Produit: r.produit,
      "Volume vendu (L)": r.volume_vendu,
      "CA (Ar)": r.ca,
    })), `consommation-carburant-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Consommation par station" description="Volume vendu et CA par produit carburant" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Volume total :</span>{" "}
            <span className="font-semibold text-blue-700">{totalVolume.toLocaleString("fr-FR")} L</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">CA total :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(totalCA)}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <>
            {chartData.length > 0 && (
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Volume vendu par station et produit (L)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="station" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: unknown) => `${((v as number) / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: unknown) => `${(v as number).toLocaleString("fr-FR")} L`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {produits.map(p => (
                      <Bar key={p} dataKey={p} name={p} fill={PRODUIT_COLORS[p] ?? "#94a3b8"} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Volume (L)</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Aucune vente carburant sur cette période</TableCell></TableRow>
                  ) : rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ backgroundColor: `${PRODUIT_COLORS[r.produit] ?? "#94a3b8"}20`, color: PRODUIT_COLORS[r.produit] ?? "#6b7280" }}>
                          {r.produit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.volume_vendu.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.ca)}</TableCell>
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
