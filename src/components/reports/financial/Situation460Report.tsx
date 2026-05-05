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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface Ligne460 {
  numero_compte: string;
  libelle_compte: string;
  total_debit: number;
  total_credit: number;
  solde: number;
}

export function Situation460Report() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<Ligne460[]>({
    queryKey: ["report-situation-460", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_grand_livre")
        .select("numero_compte, libelle_compte, debit, credit")
        .eq("entreprise_id", entreprise.id)
        .like("numero_compte", "460%")
        .gte("date_ecriture", filters.dateDebut)
        .lte("date_ecriture", filters.dateFin);
      if (error) throw error;

      const map: Record<string, { libelle: string; debit: number; credit: number }> = {};
      for (const e of (data ?? [])) {
        const r = e as Record<string, unknown>;
        const num = (r.numero_compte as string) ?? "—";
        const libelle = (r.libelle_compte as string) ?? "—";
        if (!map[num]) map[num] = { libelle, debit: 0, credit: 0 };
        map[num].debit += (r.debit as number) ?? 0;
        map[num].credit += (r.credit as number) ?? 0;
      }

      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([num, v]) => ({
          numero_compte: num,
          libelle_compte: v.libelle,
          total_debit: v.debit,
          total_credit: v.credit,
          solde: v.debit - v.credit,
        }));
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const totalSolde = rows.reduce((a, r) => a + r.solde, 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        "Employé": r.libelle_compte,
        "Débit (Ar)": r.total_debit,
        "Crédit (Ar)": r.total_credit,
        "Solde (Ar)": r.solde,
        "Statut": r.solde > 0 ? "Manquant" : r.solde < 0 ? "Excédent" : "Équilibré",
      })),
      `situation-460-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Situation comptes 460 — Responsabilité employés"
      description="Solde de responsabilité opérationnelle par employé (manquants carburant & boutique)"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters
          stations={stations}
          values={filters}
          onChange={setFilters}
          showStation={false}
        />

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead className="text-right">Total débits</TableHead>
                  <TableHead className="text-right">Total crédits</TableHead>
                  <TableHead className="text-right">Solde</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      Aucun compte 460 sur cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.numero_compte}>
                      <TableCell className="text-sm font-medium">{r.libelle_compte}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.total_debit)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.total_credit)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold",
                          r.solde > 0 ? "text-red-600" : r.solde < 0 ? "text-green-600" : "",
                        )}
                      >
                        {formatCurrency(Math.abs(r.solde))}
                      </TableCell>
                      <TableCell>
                        {r.solde > 0 ? (
                          <Badge variant="destructive" className="text-xs">Manquant</Badge>
                        ) : r.solde < 0 ? (
                          <Badge className="text-xs bg-green-100 text-green-800">Excédent</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Équilibré</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(rows.reduce((a, r) => a + r.total_debit, 0))}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(rows.reduce((a, r) => a + r.total_credit, 0))}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm",
                        totalSolde > 0 ? "text-red-600" : totalSolde < 0 ? "text-green-600" : "",
                      )}
                    >
                      {formatCurrency(Math.abs(totalSolde))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
