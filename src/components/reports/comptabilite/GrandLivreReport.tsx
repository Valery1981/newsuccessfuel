"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { ReportFilters, ReportFilterValues } from "@/components/reports/ReportFilters";
import { useReportStations, defaultFilterValues } from "@/hooks/useReportStations";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import {
  flattenGrandLivreForExport,
  groupGrandLivreParCompte,
  type GrandLivreRawRow,
} from "@/lib/grandLivre";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

export function GrandLivreReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const [libelleFilter, setLibelleFilter] = useState("");
  const { data: stations = [] } = useReportStations();

  const { data: rawRows = [], isLoading } = useQuery<GrandLivreRawRow[]>({
    queryKey: ["report-grand-livre", filters, libelleFilter, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      let query = supabase
        .from("vue_grand_livre")
        .select(
          "date_ecriture, libelle_ecriture, numero_compte, libelle_compte, tiers_nom, tresorerie_libelle, debit, credit, station_id",
        )
        .eq("entreprise_id", entreprise.id)
        .gte("date_ecriture", filters.dateDebut)
        .lte("date_ecriture", filters.dateFin)
        .order("date_ecriture", { ascending: true })
        .limit(5000);
      if (filters.stationId) query = query.eq("station_id", filters.stationId);
      const { data, error } = await query;
      if (error) throw error;

      const needle = libelleFilter.trim().toLowerCase();
      return (data ?? [])
        .map((e) => {
          const r = e as Record<string, unknown>;
          return {
            date_ecriture: r.date_ecriture as string,
            libelle_ecriture: (r.libelle_ecriture as string) ?? null,
            numero_compte: (r.numero_compte as string) ?? null,
            libelle_compte: (r.libelle_compte as string) ?? null,
            tiers_nom: r.tiers_nom as string | null,
            tresorerie_libelle: r.tresorerie_libelle as string | null,
            debit: (r.debit as number) ?? 0,
            credit: (r.credit as number) ?? 0,
          } satisfies GrandLivreRawRow;
        })
        .filter((row) => {
          if (!needle) return true;
          const hay = [
            row.libelle_compte,
            row.tiers_nom,
            row.tresorerie_libelle,
            row.libelle_ecriture,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(needle);
        });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const sections = useMemo(
    () => groupGrandLivreParCompte(rawRows),
    [rawRows],
  );

  const totalDebit = rawRows.reduce((a, r) => a + r.debit, 0);
  const totalCredit = rawRows.reduce((a, r) => a + r.credit, 0);

  function handleExport() {
    exportCsv(
      flattenGrandLivreForExport(sections),
      `grand-livre-${filters.dateDebut}-${filters.dateFin}`,
    );
  }

  return (
    <ReportLayout
      title="Grand Livre"
      description="Mouvements par compte, ordre comptable (classes 1 à 7), solde progressif"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex items-end gap-3">
          <div className="space-y-1 max-w-xs">
            <Label className="text-xs">Rechercher un compte (libellé)</Label>
            <Input
              placeholder="Ex: Banque, Dupont, Stock Essence…"
              value={libelleFilter}
              onChange={(e) => setLibelleFilter(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Total Débit :</span>{" "}
            <span className="font-semibold text-blue-700">
              {formatCurrency(totalDebit)}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Total Crédit :</span>{" "}
            <span className="font-semibold text-amber-700">
              {formatCurrency(totalCredit)}
            </span>
          </div>
          <div className="bg-gray-50 border rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Comptes :</span>{" "}
            <span className="font-semibold">{sections.length}</span>
          </div>
        </div>

        {isLoading ? (
          <PageLoading />
        ) : sections.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            Aucune écriture sur cette période
          </p>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.compteNumero} className="rounded-md border overflow-hidden">
                <div className="bg-nav/90 text-white px-4 py-2.5">
                  <p className="font-semibold text-sm">{section.compteLabel}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-xs">
                          Date
                        </th>
                        <th className="text-left px-3 py-2 font-medium text-xs">
                          Libellé
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-xs">
                          Débit
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-xs">
                          Crédit
                        </th>
                        <th className="text-right px-3 py-2 font-medium text-xs">
                          Solde
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.mouvements.map((m, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                            {format(new Date(m.date), "dd/MM/yyyy", {
                              locale: fr,
                            })}
                          </td>
                          <td className="px-3 py-1.5 text-xs max-w-[240px] truncate">
                            {m.libelle}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-right tabular-nums">
                            {m.debit > 0 ? formatCurrency(m.debit) : ""}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-right tabular-nums">
                            {m.credit > 0 ? formatCurrency(m.credit) : ""}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-right tabular-nums font-medium">
                            {formatCurrency(m.solde)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/50 font-semibold">
                        <td colSpan={2} className="px-3 py-2 text-xs">
                          Total {section.compteLabel}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          {formatCurrency(section.totalDebit)}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          {formatCurrency(section.totalCredit)}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          {formatCurrency(section.soldeFinal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
