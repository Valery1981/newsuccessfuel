"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { useReportStations } from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoading } from "@/components/common/LoadingSpinner";

const supabase = createClient();

interface CmupRow {
  id: string;
  station_nom: string;
  cuve_nom: string;
  produit: string;
  volume_actuel: number;
  prix_achat_moyen: number;
}

const PRODUIT_COLORS: Record<string, string> = {
  essence: "#10b981",
  gasoil: "#f59e0b",
  petrole: "#3b82f6",
  gpl: "#8b5cf6",
  lubrifiants: "#6b7280",
};

export function CmupReport() {
  const { entreprise } = useAuthStore();
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<CmupRow[]>({
    queryKey: ["report-cmup", entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationIds = stations.map(s => s.id);
      const { data, error } = await supabase
        .from("cuves")
        .select("id, nom, type_carburant, station_id, stock_actuel_litres, cmup")
        .in("station_id", stationIds)
        .order("station_id");
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: (c as Record<string, unknown>).id as string,
        station_nom: stations.find(s => s.id === ((c as Record<string, unknown>).station_id as string))?.nom ?? "—",
        cuve_nom: (c as Record<string, unknown>).nom as string,
        produit: (c as Record<string, unknown>).type_carburant as string,
        volume_actuel: ((c as Record<string, unknown>).stock_actuel_litres as number) ?? 0,
        prix_achat_moyen: ((c as Record<string, unknown>).cmup as number) ?? 0,
      }));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  function handleExport() {
    exportCsv(rows.map(r => ({
      Station: r.station_nom,
      Cuve: r.cuve_nom,
      Produit: r.produit,
      "Volume actuel (L)": r.volume_actuel,
      "CMUP actuel (Ar/L)": r.prix_achat_moyen,
      "Valeur stock (Ar)": r.volume_actuel * r.prix_achat_moyen,
    })), `cmup-carburant-${new Date().toISOString().split("T")[0]}`);
  }

  return (
    <ReportLayout title="CMUP carburant" description="Prix d'achat moyen pondéré actuel par cuve" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
          Le CMUP est mis à jour automatiquement à chaque achat carburant. Ce rapport affiche la situation actuelle de chaque cuve.
        </p>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Cuve</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Volume actuel (L)</TableHead>
                  <TableHead className="text-right">CMUP (Ar/L)</TableHead>
                  <TableHead className="text-right">Valeur stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Aucune cuve trouvée</TableCell>
                  </TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-sm font-medium">{r.cuve_nom}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ backgroundColor: `${PRODUIT_COLORS[r.produit] ?? "#94a3b8"}20`, color: PRODUIT_COLORS[r.produit] ?? "#6b7280" }}>
                        {r.produit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{r.volume_actuel.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{r.prix_achat_moyen.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right text-sm">{(r.volume_actuel * r.prix_achat_moyen).toLocaleString("fr-FR", { style: "currency", currency: "MGA", maximumFractionDigits: 0 })}</TableCell>
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
