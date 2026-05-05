"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { useReportStations } from "@/hooks/useReportStations";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";

const supabase = createClient();

interface CuveStock {
  id: string;
  nom: string;
  produit: string;
  station_nom: string;
  volume_actuel: number;
  capacite: number;
  prix_achat_moyen: number;
  valeur_stock: number;
}

export function StockCarburantReport() {
  const { entreprise } = useAuthStore();
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<CuveStock[]>({
    queryKey: ["report-stock-carburant", entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationIds = stations.map(s => s.id);
      const { data, error } = await supabase
        .from("cuves")
        .select("id, nom, type_carburant, station_id, stock_actuel_litres, capacite_max, cmup")
        .in("station_id", stationIds)
        .order("station_id");
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: (c as Record<string, unknown>).id as string,
        nom: (c as Record<string, unknown>).nom as string,
        produit: (c as Record<string, unknown>).type_carburant as string,
        station_nom: stations.find(s => s.id === ((c as Record<string, unknown>).station_id as string))?.nom ?? "—",
        volume_actuel: ((c as Record<string, unknown>).stock_actuel_litres as number) ?? 0,
        capacite: ((c as Record<string, unknown>).capacite_max as number) ?? 0,
        prix_achat_moyen: ((c as Record<string, unknown>).cmup as number) ?? 0,
        valeur_stock: (((c as Record<string, unknown>).stock_actuel_litres as number) ?? 0) * (((c as Record<string, unknown>).cmup as number) ?? 0),
      }));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  const valeurTotale = rows.reduce((a, r) => a + r.valeur_stock, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Station: r.station_nom,
      Cuve: r.nom,
      Produit: r.produit,
      "Volume actuel (L)": r.volume_actuel,
      "Capacité (L)": r.capacite,
      "Taux remplissage (%)": r.capacite > 0 ? Math.round((r.volume_actuel / r.capacite) * 100) : 0,
      "Prix achat moyen (Ar/L)": r.prix_achat_moyen,
      "Valeur stock (Ar)": r.valeur_stock,
    })), `stock-carburant-${new Date().toISOString().split("T")[0]}`);
  }

  const produitColor: Record<string, string> = {
    essence: "bg-green-100 text-green-800",
    gasoil: "bg-yellow-100 text-yellow-800",
    petrole: "bg-blue-100 text-blue-800",
    gpl: "bg-purple-100 text-purple-800",
    lubrifiants: "bg-gray-100 text-gray-800",
  };

  return (
    <ReportLayout title="Stock carburant" description="État des stocks dans les cuves à ce jour" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Valeur totale stocks :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(valeurTotale)}</span>
          </div>
          <div className="bg-gray-50 border rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Cuves :</span>{" "}
            <span className="font-semibold">{rows.length}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Cuve</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Volume (L)</TableHead>
                  <TableHead className="text-right">Capacité (L)</TableHead>
                  <TableHead className="text-right">Remplissage</TableHead>
                  <TableHead className="text-right">Prix moyen (Ar/L)</TableHead>
                  <TableHead className="text-right">Valeur stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Aucune cuve trouvée
                    </TableCell>
                  </TableRow>
                ) : rows.map(r => {
                  const taux = r.capacite > 0 ? Math.round((r.volume_actuel / r.capacite) * 100) : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.station_nom}</TableCell>
                      <TableCell className="text-sm font-medium">{r.nom}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${produitColor[r.produit] ?? "bg-gray-100 text-gray-800"}`}>
                          {r.produit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.volume_actuel.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{r.capacite.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${taux < 20 ? "bg-red-500" : taux < 50 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${taux}%` }}
                            />
                          </div>
                          <span className="text-xs">{taux}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{r.prix_achat_moyen.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.valeur_stock)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
