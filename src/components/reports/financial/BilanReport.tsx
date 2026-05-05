"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { exportCsv } from "@/lib/exportCsv";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const supabase = createClient();

/** Map account number prefix → Bilan section */
function classifyAccount(num: string): {
  side: "actif" | "passif" | null;
  section: string;
} {
  if (num.startsWith("2")) return { side: "actif", section: "Immobilisations" };
  if (num.startsWith("3")) return { side: "actif", section: "Stocks" };
  if (num.startsWith("411"))
    return { side: "actif", section: "Créances clients" };
  if (num.startsWith("460"))
    return { side: "actif", section: "Créances employés (460)" };
  if (num.startsWith("5")) return { side: "actif", section: "Trésorerie" };
  if (num.startsWith("101"))
    return { side: "passif", section: "Capital social" };
  if (num.startsWith("120"))
    return { side: "passif", section: "Résultat net cumulé" };
  if (num.startsWith("161")) return { side: "passif", section: "Emprunts LT" };
  if (num.startsWith("401"))
    return { side: "passif", section: "Dettes fournisseurs" };
  if (
    num.startsWith("431") ||
    num.startsWith("432") ||
    num.startsWith("444") ||
    num.startsWith("447") ||
    num.startsWith("4454")
  )
    return { side: "passif", section: "Dettes fiscales & sociales" };
  return { side: null, section: "" };
}

interface BilanLigne {
  libelle_compte: string;
  section: string;
  side: "actif" | "passif";
  montant: number;
}

interface BilanData {
  actif: BilanLigne[];
  passif: BilanLigne[];
  totalActif: number;
  totalPassif: number;
  equilibre: boolean;
}

function groupBySection(
  lines: BilanLigne[],
): Record<string, { lignes: BilanLigne[]; total: number }> {
  const result: Record<string, { lignes: BilanLigne[]; total: number }> = {};
  for (const l of lines) {
    if (!result[l.section]) result[l.section] = { lignes: [], total: 0 };
    result[l.section].lignes.push(l);
    result[l.section].total += l.montant;
  }
  return result;
}

export function BilanReport() {
  const { entreprise } = useAuthStore();
  const [dateBilan, setDateBilan] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  const { data: bilan, isLoading } = useQuery<BilanData>({
    queryKey: ["report-bilan", dateBilan, entreprise?.id],
    queryFn: async () => {
      if (!entreprise)
        return {
          actif: [],
          passif: [],
          totalActif: 0,
          totalPassif: 0,
          equilibre: true,
        };

      // Fetch all entries up to dateBilan (cumulative since inception)
      const { data, error } = await supabase
        .from("vue_grand_livre")
        .select("numero_compte, libelle_compte, debit, credit")
        .eq("entreprise_id", entreprise.id)
        .lte("date_ecriture", dateBilan);
      if (error) throw error;

      // Aggregate solde per account
      const map: Record<
        string,
        { libelle: string; debit: number; credit: number }
      > = {};
      for (const e of data ?? []) {
        const r = e as Record<string, unknown>;
        const num = (r.numero_compte as string) ?? "";
        const libelle = (r.libelle_compte as string) ?? "—";
        if (!map[num]) map[num] = { libelle, debit: 0, credit: 0 };
        map[num].debit += (r.debit as number) ?? 0;
        map[num].credit += (r.credit as number) ?? 0;
      }

      const actif: BilanLigne[] = [];
      const passif: BilanLigne[] = [];

      for (const [num, v] of Object.entries(map)) {
        const { side, section } = classifyAccount(num);
        if (!side) continue;

        const solde = v.debit - v.credit;
        // Actif: debiteur (solde > 0); Passif: créditeur (solde < 0 → abs)
        const montant =
          side === "actif" ? Math.max(solde, 0) : Math.max(-solde, 0);
        if (montant <= 0) continue;

        const ligne: BilanLigne = {
          libelle_compte: v.libelle,
          section,
          side,
          montant,
        };
        if (side === "actif") actif.push(ligne);
        else passif.push(ligne);
      }

      const totalActif = actif.reduce((a, l) => a + l.montant, 0);
      const totalPassif = passif.reduce((a, l) => a + l.montant, 0);
      const diff = Math.abs(totalActif - totalPassif);
      const equilibre = diff < 1; // < 1 Ar tolerance for rounding

      return { actif, passif, totalActif, totalPassif, equilibre };
    },
    enabled: !!entreprise?.id && !!dateBilan,
    staleTime: 2 * 60 * 1000,
  });

  function handleExport() {
    if (!bilan) return;
    const rows = [
      ...bilan.actif.map((l) => ({
        Côté: "ACTIF",
        Section: l.section,
        Libellé: l.libelle_compte,
        "Montant (Ar)": l.montant,
      })),
      ...bilan.passif.map((l) => ({
        Côté: "PASSIF",
        Section: l.section,
        Libellé: l.libelle_compte,
        "Montant (Ar)": l.montant,
      })),
    ];
    exportCsv(rows, `bilan-${dateBilan}`);
  }

  function renderSide(
    title: string,
    lines: BilanLigne[],
    total: number,
    color: string,
  ) {
    const sections = groupBySection(lines);
    const SECTION_ORDER = [
      "Immobilisations",
      "Stocks",
      "Créances clients",
      "Créances employés (460)",
      "Trésorerie",
      "Capital social",
      "Résultat net cumulé",
      "Emprunts LT",
      "Dettes fournisseurs",
      "Dettes fiscales & sociales",
    ];
    const orderedSections = SECTION_ORDER.filter((s) => sections[s]);

    return (
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "text-sm font-bold uppercase tracking-widest mb-3",
            color,
          )}
        >
          {title}
        </h3>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableBody>
              {orderedSections.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="text-sm text-muted-foreground py-4 text-center"
                    colSpan={2}
                  >
                    Aucun solde
                  </TableCell>
                </TableRow>
              ) : (
                orderedSections.map((sectionName) => {
                  const { lignes, total: sTotal } = sections[sectionName];
                  return [
                    <TableRow
                      key={`header-${sectionName}`}
                      className="bg-muted/40"
                    >
                      <TableCell
                        className="text-xs font-semibold text-muted-foreground py-1.5"
                        colSpan={2}
                      >
                        {sectionName}
                      </TableCell>
                    </TableRow>,
                    ...lignes.map((l, i) => (
                      <TableRow key={`${sectionName}-${i}`}>
                        <TableCell className="text-sm pl-5">
                          {l.libelle_compte}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(l.montant)}
                        </TableCell>
                      </TableRow>
                    )),
                    <TableRow key={`sub-${sectionName}`} className="border-b">
                      <TableCell className="text-xs font-medium text-right text-muted-foreground py-1">
                        Sous-total {sectionName}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatCurrency(sTotal)}
                      </TableCell>
                    </TableRow>,
                  ];
                })
              )}
              <TableRow
                className={cn(
                  "border-t-2 font-bold",
                  color === "text-blue-700" ? "bg-blue-50" : "bg-green-50",
                )}
              >
                <TableCell className={cn("text-sm", color)}>
                  TOTAL {title}
                </TableCell>
                <TableCell
                  className={cn("text-right text-base font-bold", color)}
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
      title="Bilan"
      description="Situation patrimoniale à une date donnée — Actif = Passif"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-5">
        {/* Date picker */}
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
          <Label className="text-xs font-medium whitespace-nowrap">
            Date de référence
          </Label>
          <Input
            type="date"
            value={dateBilan}
            onChange={(e) => setDateBilan(e.target.value)}
            className="h-8 text-xs w-[160px]"
          />
          <span className="text-xs text-muted-foreground">
            Toutes les écritures jusqu&apos;à cette date sont incluses
          </span>
        </div>

        {/* Equilibre check */}
        {bilan && !isLoading && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
              bilan.equilibre
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800",
            )}
          >
            {bilan.equilibre ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {bilan.equilibre
              ? `Bilan équilibré — Total Actif = Total Passif = ${formatCurrency(bilan.totalActif)}`
              : `Bilan déséquilibré — Actif (${formatCurrency(bilan.totalActif)}) ≠ Passif (${formatCurrency(bilan.totalPassif)}) — Écart : ${formatCurrency(Math.abs(bilan.totalActif - bilan.totalPassif))}`}
            {!bilan.equilibre && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Vérifier les écritures
              </Badge>
            )}
          </div>
        )}

        {isLoading ? (
          <PageLoading />
        ) : bilan ? (
          <div className="flex flex-col gap-6 lg:flex-row">
            {renderSide(
              "Actif",
              bilan.actif,
              bilan.totalActif,
              "text-blue-700",
            )}
            {renderSide(
              "Passif",
              bilan.passif,
              bilan.totalPassif,
              "text-green-700",
            )}
          </div>
        ) : null}
      </div>
    </ReportLayout>
  );
}
