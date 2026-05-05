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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface TresoCompte {
  id: string;
  libelle: string;
  numero: string;
  solde: number;
}

interface MvtTreso {
  id: string;
  date_ecriture: string;
  libelle: string;
  numero_compte: string;
  tresorerie_libelle: string | null;
  debit: number;
  credit: number;
}

export function TresorerieReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  // Soldes actuels
  const { data: comptes = [] } = useQuery<TresoCompte[]>({
    queryKey: ["report-tresorerie-comptes", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("tresoreries")
        .select("id, libelle, numero_compte, solde_actuel")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true)
        .order("numero_compte");
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: (c as Record<string, unknown>).id as string,
        libelle: (c as Record<string, unknown>).libelle as string,
        numero: (c as Record<string, unknown>).numero_compte as string,
        solde: ((c as Record<string, unknown>).solde_actuel as number) ?? 0,
      }));
    },
    enabled: !!entreprise?.id,
    staleTime: 3 * 60 * 1000,
  });

  // Mouvements trésorerie via vue_grand_livre (comptes 5xx)
  const { data: mouvements = [], isLoading } = useQuery<MvtTreso[]>({
    queryKey: ["report-tresorerie-mvt", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_grand_livre")
        .select("date_ecriture, libelle_ecriture, numero_compte, libelle_compte, tresorerie_libelle, debit, credit, reference_numero")
        .eq("entreprise_id", entreprise.id)
        .gte("date_ecriture", filters.dateDebut)
        .lte("date_ecriture", filters.dateFin)
        .ilike("numero_compte", "5%")
        .order("date_ecriture", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((m, idx) => {
        const r = m as Record<string, unknown>;
        return {
          id: String(idx),
          date_ecriture: r.date_ecriture as string,
          libelle: (r.libelle_ecriture as string) ?? "—",
          numero_compte: (r.numero_compte as string) ?? "—",
          tresorerie_libelle: r.tresorerie_libelle as string | null,
          debit: (r.debit as number) ?? 0,
          credit: (r.credit as number) ?? 0,
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const soldeTotale = comptes.reduce((a, c) => a + c.solde, 0);
  const totalEntrees = mouvements.reduce((a, m) => a + m.debit, 0);
  const totalSorties = mouvements.reduce((a, m) => a + m.credit, 0);
  const chartData = comptes.map(c => ({ name: c.libelle.substring(0, 14), solde: c.solde }));

  function handleExport() {
    exportCsv(mouvements.map(m => ({
      Date: m.date_ecriture,
      Compte: m.numero_compte,
      Libellé: m.libelle,
      Trésorerie: m.tresorerie_libelle ?? "",
      "Débit (Ar)": m.debit,
      "Crédit (Ar)": m.credit,
    })), `tresorerie-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Trésorerie" description="Soldes et mouvements des comptes de trésorerie" onExport={handleExport}>
      <div className="mt-4 space-y-4">

        {/* Soldes par compte */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {comptes.map(c => (
            <div key={c.id} className="bg-white border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{c.libelle}</p>
              <p className="text-base font-semibold mt-1">{formatCurrency(c.solde)}</p>
              <p className="text-xs font-mono text-muted-foreground">{c.numero}</p>
            </div>
          ))}
          {comptes.length === 0 && <div className="col-span-4 text-center text-sm text-muted-foreground py-4">Aucun compte de trésorerie</div>}
        </div>

        {chartData.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Solde total :</span>
              <span className="text-lg font-bold text-emerald-700">{formatCurrency(soldeTotale)}</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: unknown) => `${((v as number) / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                <Bar dataKey="solde" name="Solde" fill="#10b981" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <ReportFilters stations={stations} values={filters} onChange={setFilters} showStation={false} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Entrées (débit 5xx) :</span>{" "}
            <span className="font-semibold text-blue-700">{formatCurrency(totalEntrees)}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Sorties (crédit 5xx) :</span>{" "}
            <span className="font-semibold text-amber-700">{formatCurrency(totalSorties)}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mouvements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Aucun mouvement de trésorerie sur cette période</TableCell></TableRow>
                ) : mouvements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{format(new Date(m.date_ecriture), "dd/MM/yyyy", { locale: fr })}</TableCell>
                    <TableCell className="text-xs font-mono">{m.numero_compte}</TableCell>
                    <TableCell className="text-sm">{m.libelle}</TableCell>
                    <TableCell className="text-right text-sm text-blue-700">{m.debit > 0 ? formatCurrency(m.debit) : ""}</TableCell>
                    <TableCell className="text-right text-sm text-amber-700">{m.credit > 0 ? formatCurrency(m.credit) : ""}</TableCell>
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
