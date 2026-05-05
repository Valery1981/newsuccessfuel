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
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const supabase = createClient();

export function SituationCreancesReport() {
  const { entreprise } = useAuthStore();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report-situation-creances", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_creances_en_cours")
        .select("id, tiers_nom, solde, echeance, reference_numero, type_creance, urgence")
        .eq("entreprise_id", entreprise.id)
        .eq("is_soldee", false)
        .eq("tiers_type", "client")
        .order("echeance", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!entreprise?.id,
    staleTime: 2 * 60 * 1000,
  });

  type Row = (typeof rows)[number] & Record<string, unknown>;

  function urgenceConfig(row: Row) {
    const urg = (row.urgence as string) ?? "";
    const echeance = row.echeance as string | null;
    const jours = echeance ? differenceInDays(new Date(), new Date(echeance)) : 0;
    if (jours > 0 || urg === "depasse")
      return { label: "Dépassé", cls: "bg-red-100 text-red-800" };
    if (jours > -7 || urg === "urgent")
      return { label: "Urgent", cls: "bg-orange-100 text-orange-800" };
    return { label: "En cours", cls: "bg-green-100 text-green-800" };
  }

  const totalSolde = rows.reduce((a, r) => a + ((r as Record<string, unknown>).solde as number ?? 0), 0);

  function handleExport() {
    exportCsv(
      rows.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          "Client": rec.tiers_nom ?? "—",
          "Référence": rec.reference_numero ?? "—",
          "Type": rec.type_creance ?? "—",
          "Solde (Ar)": rec.solde ?? 0,
          "Échéance": rec.echeance ? format(new Date(rec.echeance as string), "dd/MM/yyyy") : "—",
        };
      }),
      `situation-creances-${format(new Date(), "yyyy-MM-dd")}`,
    );
  }

  return (
    <ReportLayout
      title="Situation créances clients"
      description="Créances clients actives — suivi des encaissements en attente"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <PageLoading />
        ) : (
          <>
            <div className="flex gap-3 flex-wrap text-sm">
              <div className="bg-muted border rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground">Total dû :</span>{" "}
                <span className="font-bold text-red-700">{formatCurrency(totalSolde)}</span>
              </div>
              <div className="bg-muted border rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground">Créances :</span>{" "}
                <span className="font-semibold">{rows.length}</span>
              </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Aucune créance client en cours
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r, i) => {
                      const rec = r as Record<string, unknown>;
                      const urg = urgenceConfig(rec as Row);
                      return (
                        <TableRow
                          key={(rec.id as string) ?? i}
                          className={cn(urg.label === "Dépassé" && "bg-red-50/40")}
                        >
                          <TableCell className="text-sm font-medium">{(rec.tiers_nom as string) ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(rec.reference_numero as string) ?? "—"}</TableCell>
                          <TableCell className="text-sm">{(rec.type_creance as string) ?? "—"}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-red-700">
                            {formatCurrency((rec.solde as number) ?? 0)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {rec.echeance ? format(new Date(rec.echeance as string), "dd/MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", urg.cls)}>{urg.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  {rows.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell colSpan={3} className="text-sm">Total ({rows.length} créances)</TableCell>
                      <TableCell className="text-right text-sm text-red-700">{formatCurrency(totalSolde)}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
