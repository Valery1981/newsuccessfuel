"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import {
  ReportFilters,
  type ReportFilterValues,
} from "@/components/reports/ReportFilters";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  defaultFilterValues,
  useReportStations,
} from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supabase = createClient();

interface CuveOption {
  id: string;
  nom: string;
  type_carburant: string;
  station_id: string;
}

interface MouvementCuve {
  date: string;
  dateLabel: string;
  cuve_nom: string;
  type: string;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  sens: string;
}

const TYPE_LABELS: Record<string, string> = {
  entree_achat_carburant: "Achat",
  sortie_vente_carburant: "Vente",
  inventaire_carburant: "Inventaire",
  transfert_stock: "Transfert",
};

export function SuiviCuvesReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(
    defaultFilterValues(),
  );
  const { data: stations = [] } = useReportStations();
  const [selectedCuve, setSelectedCuve] = useState<string>("all");

  const { data: cuves = [] } = useQuery<CuveOption[]>({
    queryKey: ["cuves-options", entreprise?.id, filters.stationId],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId
        ? [filters.stationId]
        : stations.map((s) => s.id);
      const { data } = await supabase
        .from("cuves")
        .select("id, nom, type_carburant, station_id")
        .in("station_id", stationFilter);
      return (data ?? []).map((c) => {
        const r = c as Record<string, unknown>;
        return {
          id: r.id as string,
          nom: r.nom as string,
          type_carburant: r.type_carburant as string,
          station_id: r.station_id as string,
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: mouvements = [], isLoading } = useQuery<MouvementCuve[]>({
    queryKey: ["report-suivi-cuves", selectedCuve, filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId
        ? [filters.stationId]
        : stations.map((s) => s.id);

      let query = supabase
        .from("vue_mouvements_stock")
        .select(
          "date_mouvement, cuve_id, cuve_nom, type, sens, quantite, stock_avant, stock_apres, type_carburant",
        )
        .eq("entreprise_id", entreprise.id)
        .in("station_id", stationFilter)
        .not("cuve_id", "is", null)
        .gte("date_mouvement", filters.dateDebut)
        .lte("date_mouvement", filters.dateFin + "T23:59:59")
        .order("date_mouvement");

      if (selectedCuve !== "all") query = query.eq("cuve_id", selectedCuve);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((m) => {
        const r = m as Record<string, unknown>;
        const dt = (r.date_mouvement as string) ?? "";
        return {
          date: dt.split("T")[0],
          dateLabel: dt
            ? format(new Date(dt), "dd/MM HH:mm", { locale: fr })
            : "—",
          cuve_nom: (r.cuve_nom as string) ?? "—",
          type: (r.type as string) ?? "—",
          quantite: (r.quantite as number) ?? 0,
          stock_avant: (r.stock_avant as number) ?? 0,
          stock_apres: (r.stock_apres as number) ?? 0,
          sens: (r.sens as string) ?? "—",
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // For chart: group by date, use last stock_apres per date per cuve
  const chartData = Object.values(
    mouvements.reduce<Record<string, { dateLabel: string; stock: number }>>(
      (acc, m) => {
        if (!acc[m.dateLabel] || m.stock_apres > 0) {
          acc[m.dateLabel] = { dateLabel: m.dateLabel, stock: m.stock_apres };
        }
        return acc;
      },
      {},
    ),
  );

  function handleExport() {
    exportCsv(
      mouvements.map((m) => ({
        "Date / Heure": m.dateLabel,
        Cuve: m.cuve_nom,
        "Type mouvement": TYPE_LABELS[m.type] ?? m.type,
        Sens: m.sens,
        "Quantité (L)": m.quantite.toFixed(2),
        "Stock avant (L)": m.stock_avant.toFixed(2),
        "Stock après (L)": m.stock_apres.toFixed(2),
      })),
      `suivi-cuves-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Suivi cuves — historique niveaux"
      description="Évolution des stocks carburant par cuve — entrées, sorties, inventaires"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <ReportFilters
            stations={stations}
            values={filters}
            onChange={setFilters}
          />
          <div className="space-y-1">
            <Label className="text-xs">Cuve</Label>
            <Select
              value={selectedCuve}
              onValueChange={(v: string | null) => setSelectedCuve(v ?? "all")}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue>
                  {selectedCuve !== "all"
                    ? cuves.find((c) => c.id === selectedCuve)?.nom
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Toutes les cuves
                </SelectItem>
                {cuves.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.nom} ({c.type_carburant})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="space-y-4">
            {chartData.length > 1 && (
              <div className="bg-white border rounded-lg p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v.toFixed(0)} L`}
                    />
                    <Tooltip
                      formatter={(v: unknown) =>
                        `${(v as number).toFixed(2)} L`
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="stock"
                      name="Niveau cuve (L)"
                      stroke="#F5820A"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Heure</TableHead>
                    <TableHead>Cuve</TableHead>
                    <TableHead>Mouvement</TableHead>
                    <TableHead className="text-right">Quantité (L)</TableHead>
                    <TableHead className="text-right">
                      Stock avant (L)
                    </TableHead>
                    <TableHead className="text-right">
                      Stock après (L)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mouvements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-10"
                      >
                        Aucun mouvement cuve sur cette période
                      </TableCell>
                    </TableRow>
                  ) : (
                    mouvements.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{m.dateLabel}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {m.cuve_nom}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[m.type] ?? m.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${m.sens === "entree" ? "text-green-700" : "text-red-700"}`}
                        >
                          {m.sens === "entree" ? "+" : "-"}
                          {m.quantite.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {m.stock_avant.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {m.stock_apres.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
