"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, type ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface ObjectifRow {
  id: string;
  type: string;
  station_nom: string;
  objectif: number;
  realise: number;
  pct: number;
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = pct >= 100 ? "bg-green-500" : pct >= 75 ? "bg-blue-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  ca_carburant: "CA Carburant",
  ca_boutique: "CA Boutique",
  volume_carburant: "Volume carburant (L)",
};

export function RealisationsObjectifsReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<ObjectifRow[]>({
    queryKey: ["report-realisations-objectifs", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map((s) => s.id);

      // 1. Fetch objectifs overlapping the period
      const { data: objectifs } = await supabase
        .from("objectifs")
        .select("id, type, station_id, valeur, periode_debut, periode_fin")
        .in("station_id", stationFilter)
        .lte("periode_debut", filters.dateFin)
        .gte("periode_fin", filters.dateDebut);

      if (!objectifs?.length) return [];

      // 2. Fetch actual CA carburant
      const { data: shifts } = await supabase
        .from("shifts_carburant")
        .select("station_id, ca_total")
        .in("station_id", stationFilter)
        .gte("date_shift", filters.dateDebut)
        .lte("date_shift", filters.dateFin);

      // 3. Fetch actual CA boutique
      const { data: tickets } = await supabase
        .from("tickets_boutique")
        .select("station_id, total")
        .in("station_id", stationFilter)
        .gte("date_vente", filters.dateDebut)
        .lte("date_vente", filters.dateFin + "T23:59:59");

      // Build actuals by station
      const actualCaCarburant: Record<string, number> = {};
      for (const s of (shifts ?? [])) {
        const rec = s as Record<string, unknown>;
        const sid = rec.station_id as string;
        actualCaCarburant[sid] = (actualCaCarburant[sid] ?? 0) + ((rec.ca_total as number) ?? 0);
      }
      const actualCaBoutique: Record<string, number> = {};
      for (const t of (tickets ?? [])) {
        const rec = t as Record<string, unknown>;
        const sid = rec.station_id as string;
        actualCaBoutique[sid] = (actualCaBoutique[sid] ?? 0) + ((rec.total as number) ?? 0);
      }

      return objectifs.map((o) => {
        const rec = o as Record<string, unknown>;
        const sid = rec.station_id as string;
        const type = rec.type as string;
        const station_nom = stations.find((s) => s.id === sid)?.nom ?? "Toutes";
        const objectifVal = (rec.valeur as number) ?? 0;

        let realise = 0;
        if (type === "ca_carburant") realise = actualCaCarburant[sid] ?? 0;
        else if (type === "ca_boutique") realise = actualCaBoutique[sid] ?? 0;
        // volume_carburant: pas de volume direct disponible — on laisse 0 pour l'instant

        const pct = objectifVal > 0 ? (realise / objectifVal) * 100 : 0;
        return {
          id: rec.id as string,
          type,
          station_nom,
          objectif: objectifVal,
          realise,
          pct,
        };
      });
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        Station: r.station_nom,
        Type: TYPE_LABELS[r.type] ?? r.type,
        "Objectif": r.objectif,
        "Réalisé": r.realise,
        "% Réalisation": r.pct.toFixed(1),
        Statut: r.pct >= 100 ? "Atteint" : r.pct >= 75 ? "En bonne voie" : "En retard",
      })),
      `realisations-objectifs-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  function statusIcon(pct: number) {
    if (pct >= 100) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (pct >= 75) return <AlertCircle className="w-4 h-4 text-blue-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  }

  const atteints = rows.filter((r) => r.pct >= 100).length;

  return (
    <ReportLayout
      title="Réalisations vs Objectifs"
      description="Progression des objectifs de vente — CA carburant, CA boutique, volumes"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        {!isLoading && rows.length > 0 && (
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-muted border rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">Objectifs atteints :</span>{" "}
              <span className="font-bold text-green-700">{atteints}/{rows.length}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Aucun objectif défini pour cette période
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-lg border p-4 space-y-2",
                  r.pct >= 100 ? "border-green-200 bg-green-50/30" : r.pct >= 75 ? "border-blue-200 bg-blue-50/30" : "border-red-200 bg-red-50/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(r.pct)}
                    <span className="text-sm font-semibold">{TYPE_LABELS[r.type] ?? r.type}</span>
                    <Badge variant="outline" className="text-xs">{r.station_nom}</Badge>
                  </div>
                  <Badge
                    className={cn(
                      "text-xs",
                      r.pct >= 100 ? "bg-green-100 text-green-800" : r.pct >= 75 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800",
                    )}
                  >
                    {r.pct >= 100 ? "Atteint" : r.pct >= 75 ? "En bonne voie" : "En retard"}
                  </Badge>
                </div>
                <ProgressBar pct={r.pct} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Réalisé : <strong>{formatCurrency(r.realise)}</strong></span>
                  <span>Objectif : <strong>{formatCurrency(r.objectif)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
