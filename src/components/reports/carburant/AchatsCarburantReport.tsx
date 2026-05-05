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
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface AchatRow {
  id: string;
  date_commande: string;
  numero_bc: string;
  fournisseur_nom: string;
  montant_facture: number;
  statut: string;
  lignes: string; // résumé produits
}

const STATUT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  brouillon: { label: "Brouillon", variant: "outline" },
  livre: { label: "Livré", variant: "default" },
  mouvemente: { label: "Mouvementé", variant: "default" },
  comptabilise: { label: "Comptabilisé", variant: "secondary" },
};

export function AchatsCarburantReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilterValues());
  const { data: stations = [] } = useReportStations();

  const { data: rows = [], isLoading } = useQuery<AchatRow[]>({
    queryKey: ["report-achats-carburant", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];

      let query = supabase
        .from("achats_carburant")
        .select("id, date_commande, numero_bc, fournisseur_id, montant_facture, statut, tiers(nom), lignes_bc_carburant(type_carburant, quantite_commandee, station_id)")
        .eq("entreprise_id", entreprise.id)
        .gte("date_commande", filters.dateDebut)
        .lte("date_commande", filters.dateFin)
        .order("date_commande", { ascending: false });

      // Si un filtre station est actif, on peut uniquement filtrer côté client après la requête
      const { data, error } = await query;
      if (error) throw error;

      return (data ?? [])
        .filter(a => {
          if (!filters.stationId) return true;
          const r = a as Record<string, unknown>;
          const lignes = r.lignes_bc_carburant as { station_id: string }[] | null;
          return lignes?.some(l => l.station_id === filters.stationId);
        })
        .map(a => {
          const r = a as Record<string, unknown>;
          const lignes = (r.lignes_bc_carburant as { type_carburant: string; quantite_commandee: number }[] | null) ?? [];
          const produits = [...new Set(lignes.map(l => l.type_carburant))].join(", ") || "—";
          return {
            id: r.id as string,
            date_commande: r.date_commande as string,
            numero_bc: (r.numero_bc as string) ?? "—",
            fournisseur_nom: (r.tiers as { nom: string } | null)?.nom ?? "—",
            montant_facture: (r.montant_facture as number) ?? 0,
            statut: (r.statut as string) ?? "brouillon",
            lignes: produits,
          };
        });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const totalMontant = rows.reduce((a, r) => a + r.montant_facture, 0);

  function handleExport() {
    exportCsv(rows.map(r => ({
      Date: r.date_commande,
      "N° BC": r.numero_bc,
      Fournisseur: r.fournisseur_nom,
      Produits: r.lignes,
      "Montant facture (Ar)": r.montant_facture,
      Statut: r.statut,
    })), `achats-carburant-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout title="Achats carburant" description="Bons de commande et livraisons carburant" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <ReportFilters stations={stations} values={filters} onChange={setFilters} />

        <div className="flex gap-4 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Montant total :</span>{" "}
            <span className="font-semibold text-emerald-700">{formatCurrency(totalMontant)}</span>
          </div>
          <div className="bg-gray-50 border rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Commandes :</span>{" "}
            <span className="font-semibold">{rows.length}</span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>N° BC</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead className="text-right">Montant facture</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Aucun achat carburant sur cette période</TableCell>
                  </TableRow>
                ) : rows.map(r => {
                  const s = STATUT_LABELS[r.statut] ?? { label: r.statut, variant: "outline" as const };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(new Date(r.date_commande), "dd/MM/yyyy", { locale: fr })}</TableCell>
                      <TableCell className="text-xs font-mono">{r.numero_bc}</TableCell>
                      <TableCell className="text-sm">{r.fournisseur_nom}</TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{r.lignes}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.montant_facture)}</TableCell>
                      <TableCell><Badge variant={s.variant} className="text-xs">{s.label}</Badge></TableCell>
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
