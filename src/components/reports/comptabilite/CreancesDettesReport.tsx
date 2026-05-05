"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { formatCurrency } from "@/lib/utils";
import { exportCsv } from "@/lib/exportCsv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const supabase = createClient();

interface CreanceRow {
  id: string;
  tiers_nom: string;
  type_creance: string;
  solde: number;
  echeance: string | null;
  urgence: string;
}

interface DetteRow {
  id: string;
  fournisseur_nom: string;
  type_dette: string;
  solde: number;
  echeance: string | null;
  urgence: string;
}

function badgeUrgence(urgence: string) {
  if (urgence === "depasse") return <Badge variant="destructive" className="text-xs">Dépassé</Badge>;
  if (urgence === "urgent") return <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">Urgent</Badge>;
  return <Badge variant="secondary" className="text-xs">Normal</Badge>;
}

export function CreancesDettesReport() {
  const { entreprise } = useAuthStore();

  const { data: creances = [], isLoading: crLoading } = useQuery<CreanceRow[]>({
    queryKey: ["report-creances", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_creances_en_cours")
        .select("id, tiers_nom, type_creance, solde, echeance, urgence")
        .eq("entreprise_id", entreprise.id)
        .order("echeance", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map(r => {
        const rec = r as Record<string, unknown>;
        return {
          id: rec.id as string,
          tiers_nom: (rec.tiers_nom as string) ?? "—",
          type_creance: (rec.type_creance as string) ?? "—",
          solde: (rec.solde as number) ?? 0,
          echeance: rec.echeance as string | null,
          urgence: (rec.urgence as string) ?? "normal",
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 3 * 60 * 1000,
  });

  const { data: dettes = [], isLoading: dtLoading } = useQuery<DetteRow[]>({
    queryKey: ["report-dettes", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("vue_dettes_en_cours")
        .select("id, fournisseur_nom, type_dette, solde, echeance, urgence")
        .eq("entreprise_id", entreprise.id)
        .order("echeance", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map(r => {
        const rec = r as Record<string, unknown>;
        return {
          id: rec.id as string,
          fournisseur_nom: (rec.fournisseur_nom as string) ?? "—",
          type_dette: (rec.type_dette as string) ?? "—",
          solde: (rec.solde as number) ?? 0,
          echeance: rec.echeance as string | null,
          urgence: (rec.urgence as string) ?? "normal",
        };
      });
    },
    enabled: !!entreprise?.id,
    staleTime: 3 * 60 * 1000,
  });

  const totalCreances = creances.reduce((a, r) => a + r.solde, 0);
  const totalDettes = dettes.reduce((a, r) => a + r.solde, 0);

  function handleExport() {
    const rows = [
      ...creances.map(r => ({ Catégorie: "Créance", Tiers: r.tiers_nom, Type: r.type_creance, "Solde (Ar)": r.solde, Échéance: r.echeance ?? "", Urgence: r.urgence })),
      ...dettes.map(r => ({ Catégorie: "Dette", Tiers: r.fournisseur_nom, Type: r.type_dette, "Solde (Ar)": r.solde, Échéance: r.echeance ?? "", Urgence: r.urgence })),
    ];
    exportCsv(rows, `creances-dettes-${new Date().toISOString().split("T")[0]}`);
  }

  const isLoading = crLoading || dtLoading;

  return (
    <ReportLayout title="Créances & Dettes" description="Balance âgée clients et fournisseurs non soldés" onExport={handleExport}>
      <div className="mt-4 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Créances clients :</span>{" "}
            <span className="font-semibold text-blue-700">{formatCurrency(totalCreances)}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">Dettes fournisseurs :</span>{" "}
            <span className="font-semibold text-amber-700">{formatCurrency(totalDettes)}</span>
          </div>
          <div className={`border rounded-lg px-4 py-2 text-sm ${totalCreances - totalDettes >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <span className="text-muted-foreground">Position nette :</span>{" "}
            <span className={`font-semibold ${totalCreances - totalDettes >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatCurrency(totalCreances - totalDettes)}
            </span>
          </div>
        </div>

        {isLoading ? <PageLoading /> : (
          <Tabs defaultValue="creances">
            <TabsList>
              <TabsTrigger value="creances">Créances ({creances.length})</TabsTrigger>
              <TabsTrigger value="dettes">Dettes ({dettes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="creances">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tiers</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Urgence</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creances.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune créance en cours</TableCell></TableRow>
                    ) : creances.map(r => (
                      <TableRow key={r.id} className={r.urgence === "depasse" ? "bg-red-50/40" : undefined}>
                        <TableCell className="text-sm font-medium">{r.tiers_nom}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.type_creance}</TableCell>
                        <TableCell className="text-sm">{r.echeance ? format(new Date(r.echeance), "dd MMM yyyy", { locale: fr }) : "—"}</TableCell>
                        <TableCell>{badgeUrgence(r.urgence)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.solde)}</TableCell>
                      </TableRow>
                    ))}
                    {creances.length > 0 && (
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell colSpan={4} className="text-sm">Total</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(totalCreances)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="dettes">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Urgence</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dettes.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune dette en cours</TableCell></TableRow>
                    ) : dettes.map(r => (
                      <TableRow key={r.id} className={r.urgence === "depasse" ? "bg-red-50/40" : undefined}>
                        <TableCell className="text-sm font-medium">{r.fournisseur_nom}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.type_dette}</TableCell>
                        <TableCell className="text-sm">{r.echeance ? format(new Date(r.echeance), "dd MMM yyyy", { locale: fr }) : "—"}</TableCell>
                        <TableCell>{badgeUrgence(r.urgence)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.solde)}</TableCell>
                      </TableRow>
                    ))}
                    {dettes.length > 0 && (
                      <TableRow className="bg-muted/40 font-semibold">
                        <TableCell colSpan={4} className="text-sm">Total</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(totalDettes)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ReportLayout>
  );
}
