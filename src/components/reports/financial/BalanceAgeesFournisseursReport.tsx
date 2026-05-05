"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";

const supabase = createClient();

type Tranche = "<30j" | "30-60j" | "60-90j" | ">90j" | "En cours";

interface DetteLigne {
  id: string | null;
  fournisseur_nom: string | null;
  montant_initial: number | null;
  montant_regle: number | null;
  solde: number | null;
  echeance: string | null;
  reference_numero: string | null;
  is_partenaire_carburant: boolean | null;
  tranche: Tranche;
  joursRetard: number;
}

function computeTranche(echeance: string | null): { tranche: Tranche; joursRetard: number } {
  if (!echeance) return { tranche: "En cours", joursRetard: 0 };
  const jours = differenceInDays(new Date(), new Date(echeance));
  if (jours <= 0) return { tranche: "En cours", joursRetard: 0 };
  if (jours <= 30) return { tranche: "<30j", joursRetard: jours };
  if (jours <= 60) return { tranche: "30-60j", joursRetard: jours };
  if (jours <= 90) return { tranche: "60-90j", joursRetard: jours };
  return { tranche: ">90j", joursRetard: jours };
}

function trancheBadge(tranche: Tranche) {
  switch (tranche) {
    case ">90j": return <Badge variant="destructive" className="text-xs">&gt;90 jours</Badge>;
    case "60-90j": return <Badge className="text-xs bg-orange-100 text-orange-800">60–90 jours</Badge>;
    case "30-60j": return <Badge className="text-xs bg-yellow-100 text-yellow-800">30–60 jours</Badge>;
    case "<30j": return <Badge className="text-xs bg-blue-100 text-blue-800">&lt;30 jours</Badge>;
    default: return <Badge variant="outline" className="text-xs text-green-700">En cours</Badge>;
  }
}

export function BalanceAgeesFournisseursReport() {
  const { entreprise } = useAuthStore();

  const { data: rows = [], isLoading } = useQuery<DetteLigne[]>({
    queryKey: ["report-balance-fournisseurs", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_dettes_en_cours")
        .select(
          "id, fournisseur_nom, montant_initial, montant_regle, solde, echeance, reference_numero, is_partenaire_carburant",
        )
        .eq("entreprise_id", entreprise.id)
        .eq("is_soldee", false)
        .order("solde", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((r) => {
        const rec = r as Record<string, unknown>;
        const { tranche, joursRetard } = computeTranche(rec.echeance as string | null);
        return {
          id: rec.id as string | null,
          fournisseur_nom: rec.fournisseur_nom as string | null,
          montant_initial: rec.montant_initial as number | null,
          montant_regle: rec.montant_regle as number | null,
          solde: rec.solde as number | null,
          echeance: rec.echeance as string | null,
          reference_numero: rec.reference_numero as string | null,
          is_partenaire_carburant: rec.is_partenaire_carburant as boolean | null,
          tranche,
          joursRetard,
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const partenaires = rows.filter((r) => r.is_partenaire_carburant);
  const autres = rows.filter((r) => !r.is_partenaire_carburant);
  const totalSolde = rows.reduce((a, r) => a + (r.solde ?? 0), 0);
  const totalPartenaire = partenaires.reduce((a, r) => a + (r.solde ?? 0), 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        "Fournisseur": r.fournisseur_nom ?? "—",
        "Partenaire carburant": r.is_partenaire_carburant ? "Oui" : "Non",
        "Référence": r.reference_numero ?? "—",
        "Montant initial (Ar)": r.montant_initial ?? 0,
        "Réglé (Ar)": r.montant_regle ?? 0,
        "Solde (Ar)": r.solde ?? 0,
        "Échéance": r.echeance ? format(new Date(r.echeance), "dd/MM/yyyy") : "—",
        "Tranche": r.tranche,
        "Jours retard": r.joursRetard,
      })),
      `balance-fournisseurs-${format(new Date(), "yyyy-MM-dd")}`,
    );
  }

  function renderTable(data: DetteLigne[], title: string, isCarburant = false) {
    if (data.length === 0) return null;
    const subtotal = data.reduce((a, r) => a + (r.solde ?? 0), 0);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isCarburant && <Fuel className="w-4 h-4 text-amber-600" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {isCarburant && (
            <Badge className="text-xs bg-amber-100 text-amber-800">Solde global : {formatCurrency(totalPartenaire)}</Badge>
          )}
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Montant initial</TableHead>
                <TableHead className="text-right">Réglé</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Tranche</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow
                  key={r.id ?? i}
                  className={cn(
                    r.tranche === ">90j" && "bg-red-50/50",
                    r.tranche === "60-90j" && "bg-orange-50/50",
                  )}
                >
                  <TableCell className="text-sm font-medium">{r.fournisseur_nom ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.reference_numero ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(r.montant_initial ?? 0)}</TableCell>
                  <TableCell className="text-right text-sm text-green-700">
                    {formatCurrency(r.montant_regle ?? 0)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-amber-700">
                    {formatCurrency(r.solde ?? 0)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.echeance ? format(new Date(r.echeance), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>{trancheBadge(r.tranche)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold border-t-2">
                <TableCell colSpan={4} className="text-sm">Sous-total</TableCell>
                <TableCell className="text-right text-sm text-amber-700">{formatCurrency(subtotal)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <ReportLayout
      title="Balance âgée fournisseurs"
      description="Dettes fournisseurs en cours — ventilation par tranche d'ancienneté"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-6">
        {isLoading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Aucune dette fournisseur en cours
          </p>
        ) : (
          <>
            {renderTable(partenaires, "Partenaire carburant", true)}
            {renderTable(autres, "Autres fournisseurs")}
            <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg border">
              <span className="text-sm font-semibold">Total toutes dettes fournisseurs</span>
              <span className="text-sm font-bold text-amber-700">{formatCurrency(totalSolde)}</span>
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
