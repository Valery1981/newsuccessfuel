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

const supabase = createClient();

interface BalanceLigne {
  numero_compte: string;
  libelle_compte: string;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export function BalanceReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<BalanceLigne[]>({
    queryKey: ["report-balance", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      // La vue vue_balance est un agrégat global (pas filtrable par période).
      // On utilise vue_grand_livre pour calculer une balance sur la période.
      let query = supabase
        .from("vue_grand_livre")
        .select("numero_compte, libelle_compte, debit, credit")
        .eq("entreprise_id", entreprise.id)
        .gte("date_ecriture", filters.dateDebut)
        .lte("date_ecriture", filters.dateFin);
      if (filters.stationId) query = query.eq("station_id", filters.stationId);
      const { data, error } = await query;
      if (error) throw error;

      const map: Record<string, { libelle: string; debit: number; credit: number }> = {};
      for (const e of (data ?? [])) {
        const r = e as Record<string, unknown>;
        const num = (r.numero_compte as string) ?? "—";
        if (!map[num]) map[num] = { libelle: (r.libelle_compte as string) ?? "—", debit: 0, credit: 0 };
        map[num].debit += (r.debit as number) ?? 0;
        map[num].credit += (r.credit as number) ?? 0;
      }

      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([num, v]) => {
          const solde = v.debit - v.credit;
          return {
            numero_compte: num,
            libelle_compte: v.libelle,
            total_debit: v.debit,
            total_credit: v.credit,
            solde_debiteur: solde > 0 ? solde : 0,
            solde_crediteur: solde < 0 ? Math.abs(solde) : 0,
          };
        });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const totalDebit = rows.reduce((a, r) => a + r.total_debit, 0);
  const totalCredit = rows.reduce((a, r) => a + r.total_credit, 0);
  const totalSoldeD = rows.reduce((a, r) => a + r.solde_debiteur, 0);
  const totalSoldeC = rows.reduce((a, r) => a + r.solde_crediteur, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      "Compte N°": r.numero_compte,
      "Compte Libellé": r.libelle_compte,
      "Débit cumulé (Ar)": r.total_debit,
      "Crédit cumulé (Ar)": r.total_credit,
      "Solde débiteur (Ar)": r.solde_debiteur,
      "Solde créditeur (Ar)": r.solde_crediteur,
    })), `balance-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Balance des comptes" description="Totaux débit/crédit et soldes par compte" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Compte</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Débit cumulé</TableHead>
                  <TableHead className="text-right">Crédit cumulé</TableHead>
                  <TableHead className="text-right">Solde débiteur</TableHead>
                  <TableHead className="text-right">Solde créditeur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Aucune écriture sur cette période</TableCell>
                  </TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.numero_compte}>
                    <TableCell className="text-sm font-mono font-medium">{r.numero_compte}</TableCell>
                    <TableCell className="text-sm">{r.libelle_compte}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(r.total_debit)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(r.total_credit)}</TableCell>
                    <TableCell className="text-right text-sm text-blue-700">{r.solde_debiteur > 0 ? formatCurrency(r.solde_debiteur) : ""}</TableCell>
                    <TableCell className="text-right text-sm text-amber-700">{r.solde_crediteur > 0 ? formatCurrency(r.solde_crediteur) : ""}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={2} className="text-sm">Totaux</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(totalDebit)}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(totalCredit)}</TableCell>
                  <TableCell className="text-right text-sm text-blue-700">{formatCurrency(totalSoldeD)}</TableCell>
                  <TableCell className="text-right text-sm text-amber-700">{formatCurrency(totalSoldeC)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
