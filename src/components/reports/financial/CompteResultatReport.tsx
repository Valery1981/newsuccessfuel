"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import {
  ReportFilters,
  type ReportFilterValues,
} from "@/components/reports/ReportFilters";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  defaultFilterValues,
  useReportStations,
} from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

const supabase = createClient();

interface CompteLigne {
  libelle_compte: string;
  solde: number;
  classe: "charges" | "produits";
}

export function CompteResultatReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(
    defaultFilterValues(),
  );
  const { data: stations = [] } = useReportStations();

  const { data: lignes = [], isLoading } = useQuery<CompteLigne[]>({
    queryKey: ["report-compte-resultat", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      let query = supabase
        .from("vue_grand_livre")
        .select("numero_compte, libelle_compte, debit, credit")
        .eq("entreprise_id", entreprise.id)
        .gte("date_ecriture", filters.dateDebut)
        .lte("date_ecriture", filters.dateFin);
      if (filters.stationId) query = query.eq("station_id", filters.stationId);
      const { data, error } = await query;
      if (error) throw error;

      const map: Record<
        string,
        {
          libelle: string;
          debit: number;
          credit: number;
          classe: "charges" | "produits";
        }
      > = {};
      for (const e of data ?? []) {
        const r = e as Record<string, unknown>;
        const num = (r.numero_compte as string) ?? "";
        if (!num.startsWith("6") && !num.startsWith("7")) continue;
        const libelle = (r.libelle_compte as string) ?? "—";
        const classe: "charges" | "produits" = num.startsWith("6")
          ? "charges"
          : "produits";
        if (!map[num]) map[num] = { libelle, debit: 0, credit: 0, classe };
        map[num].debit += (r.debit as number) ?? 0;
        map[num].credit += (r.credit as number) ?? 0;
      }

      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => ({
          libelle_compte: v.libelle,
          solde:
            v.classe === "charges" ? v.debit - v.credit : v.credit - v.debit,
          classe: v.classe,
        }))
        .filter((l) => l.solde > 0);
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const charges = lignes.filter((l) => l.classe === "charges");
  const produits = lignes.filter((l) => l.classe === "produits");
  const totalCharges = charges.reduce((a, l) => a + l.solde, 0);
  const totalProduits = produits.reduce((a, l) => a + l.solde, 0);
  const resultatNet = totalProduits - totalCharges;
  const isBenefice = resultatNet >= 0;

  function handleExport() {
    exportCsv(
      lignes.map((l) => ({
        Classe: l.classe === "charges" ? "Charges" : "Produits",
        Libellé: l.libelle_compte,
        "Montant (Ar)": l.solde,
      })),
      `compte-resultat-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  function renderSection(data: CompteLigne[], label: string, color: string) {
    const total = data.reduce((a, l) => a + l.solde, 0);
    return (
      <div className="space-y-1">
        <h3 className={cn("text-sm font-bold uppercase tracking-wide", color)}>
          {label}
        </h3>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="text-muted-foreground text-sm py-4 text-center"
                    colSpan={2}
                  >
                    Aucun mouvement
                  </TableCell>
                </TableRow>
              ) : (
                data.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">
                      {l.libelle_compte}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(l.solde)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/60 font-semibold border-t">
                <TableCell className={cn("text-sm", color)}>
                  Total {label}
                </TableCell>
                <TableCell
                  className={cn("text-right text-sm font-bold", color)}
                >
                  {formatCurrency(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <ReportLayout
      title="Compte de résultat"
      description="Charges (classe 6) et Produits (classe 7) — résultat net de la période"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters
          stations={stations}
          values={filters}
          onChange={setFilters}
        />

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {renderSection(produits, "Produits", "text-green-700")}
              {renderSection(charges, "Charges", "text-red-700")}
            </div>

            {/* Résultat net */}
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border-2 px-4 py-4",
                isBenefice
                  ? "border-green-300 bg-green-50"
                  : "border-red-300 bg-red-50",
              )}
            >
              <div className="flex items-center gap-3">
                {isBenefice ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Résultat net
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Produits ({formatCurrency(totalProduits)}) − Charges (
                    {formatCurrency(totalCharges)})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-xl font-bold",
                    isBenefice ? "text-green-700" : "text-red-700",
                  )}
                >
                  {isBenefice ? "+" : ""}
                  {formatCurrency(resultatNet)}
                </p>
                <Badge
                  className={cn(
                    "text-xs mt-1",
                    isBenefice
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800",
                  )}
                >
                  {isBenefice ? "Bénéfice" : "Perte"}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
