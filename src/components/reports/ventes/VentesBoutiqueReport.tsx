"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface TicketRow {
  id: string;
  date_vente: string;
  station_nom: string;
  montant_total: number;
  nb_articles: number;
  mode_paiement: string;
}

export function VentesBoutiqueReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<TicketRow[]>({
    queryKey: ["report-ventes-boutique", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const stationFilter = filters.stationId ? [filters.stationId] : stations.map(s => s.id);
      const { data, error } = await supabase
        .from("tickets_boutique")
        .select("id, date_vente, station_id, total")
        .in("station_id", stationFilter)
        .gte("date_vente", filters.dateDebut)
        .lte("date_vente", filters.dateFin + "T23:59:59")
        .order("date_vente", { ascending: false });
      if (error) throw error;

      return (data ?? []).map(t => ({
        id: (t as Record<string, unknown>).id as string,
        date_vente: (t as Record<string, unknown>).date_vente as string,
        station_nom: stations.find(s => s.id === ((t as Record<string, unknown>).station_id as string))?.nom ?? "—",
        montant_total: ((t as Record<string, unknown>).total as number) ?? 0,
        nb_articles: 0,
        mode_paiement: "—",
      }));
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const totalCA = rows.reduce((acc, r) => acc + r.montant_total, 0);
  const totalTickets = rows.length;

  function handleExport() {
    exportCsv(rows.map(r => ({
      Date: r.date_vente,
      Station: r.station_nom,
      "Montant (Ar)": r.montant_total,
      "Nb articles": r.nb_articles,
      "Mode paiement": r.mode_paiement,
    })), `ventes-boutique-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Ventes boutique" description="Tickets de caisse par station" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">CA total :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(totalCA)}</span>
          </div>
          <div className="bg-gray-50 border rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Tickets :</span>{" "}
            <span className="font-semibold">{totalTickets}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead className="text-right">Nb articles</TableHead>
                  <TableHead>Mode paiement</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Aucune vente boutique sur cette période
                    </TableCell>
                  </TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.date_vente), "dd MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell className="text-sm">{r.station_nom}</TableCell>
                    <TableCell className="text-right text-sm">{r.nb_articles}</TableCell>
                    <TableCell className="text-sm capitalize">{r.mode_paiement}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(r.montant_total)}</TableCell>
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
