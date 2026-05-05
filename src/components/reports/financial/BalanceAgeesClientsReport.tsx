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

const supabase = createClient();

interface CreanceLigne {
  id: string | null;
  tiers_nom: string | null;
  montant_initial: number | null;
  montant_recouvre: number | null;
  solde: number | null;
  echeance: string | null;
  reference_numero: string | null;
  urgence: string | null;
  tranche: "<30j" | "30-60j" | "60-90j" | ">90j" | "En cours";
  joursRetard: number;
}

function computeTranche(echeance: string | null): { tranche: CreanceLigne["tranche"]; joursRetard: number } {
  if (!echeance) return { tranche: "En cours", joursRetard: 0 };
  const jours = differenceInDays(new Date(), new Date(echeance));
  if (jours <= 0) return { tranche: "En cours", joursRetard: 0 };
  if (jours <= 30) return { tranche: "<30j", joursRetard: jours };
  if (jours <= 60) return { tranche: "30-60j", joursRetard: jours };
  if (jours <= 90) return { tranche: "60-90j", joursRetard: jours };
  return { tranche: ">90j", joursRetard: jours };
}

function trancheBadge(tranche: CreanceLigne["tranche"]) {
  switch (tranche) {
    case ">90j": return <Badge variant="destructive" className="text-xs">&gt;90 jours</Badge>;
    case "60-90j": return <Badge className="text-xs bg-orange-100 text-orange-800">60–90 jours</Badge>;
    case "30-60j": return <Badge className="text-xs bg-yellow-100 text-yellow-800">30–60 jours</Badge>;
    case "<30j": return <Badge className="text-xs bg-blue-100 text-blue-800">&lt;30 jours</Badge>;
    default: return <Badge variant="outline" className="text-xs text-green-700">En cours</Badge>;
  }
}

export function BalanceAgeesClientsReport() {
  const { entreprise } = useAuthStore();

  const { data: rows = [], isLoading } = useQuery<CreanceLigne[]>({
    queryKey: ["report-balance-clients", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_creances_en_cours")
        .select(
          "id, tiers_nom, montant_initial, montant_recouvre, solde, echeance, reference_numero, urgence, tiers_type",
        )
        .eq("entreprise_id", entreprise.id)
        .eq("is_soldee", false)
        .eq("tiers_type", "client")
        .order("solde", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((r) => {
        const rec = r as Record<string, unknown>;
        const { tranche, joursRetard } = computeTranche(rec.echeance as string | null);
        return {
          id: rec.id as string | null,
          tiers_nom: rec.tiers_nom as string | null,
          montant_initial: rec.montant_initial as number | null,
          montant_recouvre: rec.montant_recouvre as number | null,
          solde: rec.solde as number | null,
          echeance: rec.echeance as string | null,
          reference_numero: rec.reference_numero as string | null,
          urgence: rec.urgence as string | null,
          tranche,
          joursRetard,
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  const totalSolde = rows.reduce((a, r) => a + (r.solde ?? 0), 0);

  const countByTranche = (t: CreanceLigne["tranche"]) => rows.filter((r) => r.tranche === t).length;

  function handleExport() {
    exportCsv(
      rows.map((r) => ({
        "Client": r.tiers_nom ?? "—",
        "Référence": r.reference_numero ?? "—",
        "Montant initial (Ar)": r.montant_initial ?? 0,
        "Recouvré (Ar)": r.montant_recouvre ?? 0,
        "Solde (Ar)": r.solde ?? 0,
        "Échéance": r.echeance ? format(new Date(r.echeance), "dd/MM/yyyy") : "—",
        "Tranche": r.tranche,
        "Jours retard": r.joursRetard,
      })),
      `balance-clients-${format(new Date(), "yyyy-MM-dd")}`,
    );
  }

  return (
    <ReportLayout
      title="Balance âgée clients"
      description="Créances clients en cours — ventilation par tranche d'ancienneté"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(["En cours", "<30j", "30-60j", "60-90j", ">90j"] as CreanceLigne["tranche"][]).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded border bg-muted text-muted-foreground">
              {t} : <strong>{countByTranche(t)}</strong>
            </span>
          ))}
        </div>

        {isLoading ? (
          <PageLoading />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Montant initial</TableHead>
                  <TableHead className="text-right">Recouvré</TableHead>
                  <TableHead className="text-right">Solde</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Tranche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Aucune créance client en cours
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow
                      key={r.id ?? i}
                      className={cn(
                        r.tranche === ">90j" && "bg-red-50/50",
                        r.tranche === "60-90j" && "bg-orange-50/50",
                      )}
                    >
                      <TableCell className="text-sm font-medium">{r.tiers_nom ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.reference_numero ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.montant_initial ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm text-green-700">
                        {formatCurrency(r.montant_recouvre ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-700">
                        {formatCurrency(r.solde ?? 0)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.echeance ? format(new Date(r.echeance), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>{trancheBadge(r.tranche)}</TableCell>
                    </TableRow>
                  ))
                )}
                {rows.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={4} className="text-sm">Total ({rows.length} créances)</TableCell>
                    <TableCell className="text-right text-sm text-red-700">
                      {formatCurrency(totalSolde)}
                    </TableCell>
                    <TableCell colSpan={2} />
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
