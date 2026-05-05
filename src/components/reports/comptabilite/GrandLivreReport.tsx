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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface EcritureRow {
  id: string;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  numero_compte: string;
  libelle_compte: string;
  tiers_nom: string | null;
  debit: number;
  credit: number;
  station_id: string | null;
}

export function GrandLivreReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const [compteFilter, setCompteFilter] = useState("");
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<EcritureRow[]>({
    queryKey: ["report-grand-livre", filters, compteFilter, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      let query = supabase
        .from("vue_grand_livre")
        .select("date_ecriture, numero_piece, libelle_ecriture, numero_compte, libelle_compte, tiers_nom, debit, credit, station_id, reference_numero")
        .eq("entreprise_id", entreprise.id)
        .gte("date_ecriture", filters.dateDebut)
        .lte("date_ecriture", filters.dateFin)
        .order("date_ecriture", { ascending: true })
        .limit(500);
      if (filters.stationId) query = query.eq("station_id", filters.stationId);
      if (compteFilter.trim()) query = query.ilike("numero_compte", `${compteFilter.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((e, idx) => {
        const r = e as Record<string, unknown>;
        return {
          id: String(idx),
          date_ecriture: r.date_ecriture as string,
          numero_piece: (r.numero_piece as string) ?? "—",
          libelle: (r.libelle_ecriture as string) ?? "—",
          numero_compte: (r.numero_compte as string) ?? "—",
          libelle_compte: (r.libelle_compte as string) ?? "—",
          tiers_nom: r.tiers_nom as string | null,
          debit: (r.debit as number) ?? 0,
          credit: (r.credit as number) ?? 0,
          station_id: r.station_id as string | null,
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const totalDebit = rows.reduce((a, r) => a + r.debit, 0);
  const totalCredit = rows.reduce((a, r) => a + r.credit, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Date: r.date_ecriture,
      Pièce: r.numero_piece,
      Libellé: r.libelle,
      "Compte N°": r.numero_compte,
      "Compte Libellé": r.libelle_compte,
      Tiers: r.tiers_nom ?? "",
      "Débit (Ar)": r.debit,
      "Crédit (Ar)": r.credit,
    })), `grand-livre-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Grand Livre" description="Écritures comptables chronologiques par compte" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex items-end gap-3">
          <div className="space-y-1 max-w-[200px]">
            <Label className="text-xs">Filtrer par compte (N°)</Label>
            <Input placeholder="Ex: 401, 512..." value={compteFilter} onChange={e => setCompteFilter(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Total Débit :</span>{" "}
            <span className="font-semibold text-blue-700">{formatCurrency(totalDebit)}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Total Crédit :</span>{" "}
            <span className="font-semibold text-amber-700">{formatCurrency(totalCredit)}</span>
          </div>
          <div className="bg-gray-50 border rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Écritures :</span>{" "}
            <span className="font-semibold">{rows.length}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pièce</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Tiers</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">Aucune écriture sur cette période</TableCell>
                  </TableRow>
                ) : rows.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.date_ecriture), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell className="text-xs font-mono">{r.numero_piece}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono font-medium">{r.numero_compte}</span>
                      <span className="text-muted-foreground ml-1 hidden sm:inline">— {r.libelle_compte}</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{r.libelle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.tiers_nom ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm">{r.debit > 0 ? formatCurrency(r.debit) : ""}</TableCell>
                    <TableCell className="text-right text-sm">{r.credit > 0 ? formatCurrency(r.credit) : ""}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={5} className="text-sm">Totaux</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(totalDebit)}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(totalCredit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
