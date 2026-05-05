"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import {
  ReportFilters,
  type ReportFilterValues,
} from "@/components/reports/ReportFilters";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  defaultFilterValues,
  useReportStations,
} from "@/hooks/useReportStations";
import { exportCsv } from "@/lib/exportCsv";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

const supabase = createClient();

const FAMILLE_LABELS: Record<string, string> = {
  carburants: "Carburants",
  lubrifiants: "Lubrifiants",
  gpl: "GPL",
  marchandises_generales: "Marchandises générales",
  pieces_accessoires: "Pièces & Accessoires",
  services: "Services",
};

interface ArticleLigne {
  article_nom: string;
  famille: string;
  quantite: number;
  ca: number;
}

interface FamilleLigne {
  famille: string;
  articles: ArticleLigne[];
  totalCa: number;
  totalQte: number;
}

export function CaProduitReport() {
  const { entreprise } = useAuthStore();
  const [filters, setFilters] = useState<ReportFilterValues>(
    defaultFilterValues(),
  );
  const { data: stations = [] } = useReportStations();
  const [openFamilles, setOpenFamilles] = useState<Set<string>>(new Set());

  const { data: familles = [], isLoading } = useQuery<FamilleLigne[]>({
    queryKey: ["report-ca-produit", filters, entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !stations.length) return [];
      const stationFilter = filters.stationId
        ? [filters.stationId]
        : stations.map((s) => s.id);

      // Step 1: get ticket IDs filtered by date + station
      const { data: tickets } = await supabase
        .from("tickets_boutique")
        .select("id")
        .in("station_id", stationFilter)
        .gte("date_vente", filters.dateDebut)
        .lte("date_vente", filters.dateFin + "T23:59:59");
      const ticketIds = (tickets ?? []).map(
        (t) => (t as Record<string, unknown>).id as string,
      );
      if (!ticketIds.length) return [];

      // Step 2: get lines with article info
      const { data: lines, error } = await supabase
        .from("lignes_ticket_boutique")
        .select("article_id, quantite, total_ligne, articles(nom, famille)")
        .in("ticket_id", ticketIds);
      if (error) throw error;

      // Group by famille → article
      const map: Record<
        string,
        Record<string, { qte: number; ca: number }>
      > = {};
      const articleFamille: Record<string, string> = {};
      for (const l of lines ?? []) {
        const rec = l as Record<string, unknown>;
        const art = rec.articles as { nom: string; famille: string } | null;
        if (!art) continue;
        const famille = art.famille;
        const nom = art.nom;
        articleFamille[nom] = famille;
        if (!map[famille]) map[famille] = {};
        if (!map[famille][nom]) map[famille][nom] = { qte: 0, ca: 0 };
        map[famille][nom].qte += (rec.quantite as number) ?? 0;
        map[famille][nom].ca += (rec.total_ligne as number) ?? 0;
      }

      return Object.entries(map)
        .map(([famille, articles]) => {
          const lignes = Object.entries(articles).map(([nom, v]) => ({
            article_nom: nom,
            famille,
            quantite: v.qte,
            ca: v.ca,
          }));
          lignes.sort((a, b) => b.ca - a.ca);
          return {
            famille,
            articles: lignes,
            totalCa: lignes.reduce((a, l) => a + l.ca, 0),
            totalQte: lignes.reduce((a, l) => a + l.quantite, 0),
          };
        })
        .sort((a, b) => b.totalCa - a.totalCa);
    },
    enabled: !!entreprise?.id && stations.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const totalCaGlobal = familles.reduce((a, f) => a + f.totalCa, 0);

  function toggleFamille(f: string) {
    setOpenFamilles((prev) => {
      const next = new Set(prev);
      if (next.has(f)) {
        next.delete(f);
      } else {
        next.add(f);
      }
      return next;
    });
  }

  function handleExport() {
    const rows = familles.flatMap((f) =>
      f.articles.map((a) => ({
        Famille: FAMILLE_LABELS[a.famille] ?? a.famille,
        Article: a.article_nom,
        "Quantité vendue": a.quantite,
        "CA (Ar)": a.ca,
      })),
    );
    exportCsv(rows, `ca-produit-${filters.dateDebut}-${filters.dateFin}`);
  }

  return (
    <ReportLayout
      title="CA par produit / famille"
      description="Chiffre d'affaires boutique groupé par famille et article"
      onExport={handleExport}
    >
      <div className="mt-4 space-y-4">
        <ReportFilters
          stations={stations}
          values={filters}
          onChange={setFilters}
        />

        {!isLoading && (
          <div className="bg-muted border rounded-lg px-4 py-2 text-sm inline-block">
            <span className="text-muted-foreground">CA total :</span>{" "}
            <span className="font-bold text-green-700">
              {formatCurrency(totalCaGlobal)}
            </span>
          </div>
        )}

        {isLoading ? (
          <PageLoading />
        ) : familles.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Aucune vente sur cette période
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Famille / Article</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">% du total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familles.map((f) => (
                  <>
                    <TableRow
                      key={f.famille}
                      className="bg-muted/40 cursor-pointer hover:bg-muted/60"
                      onClick={() => toggleFamille(f.famille)}
                    >
                      <TableCell className="font-semibold text-sm flex items-center gap-1">
                        {openFamilles.has(f.famille) ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        {FAMILLE_LABELS[f.famille] ?? f.famille}
                        <Badge variant="outline" className="text-xs ml-1">
                          {f.articles.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {f.totalQte}
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-green-700">
                        {formatCurrency(f.totalCa)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {totalCaGlobal > 0
                          ? ((f.totalCa / totalCaGlobal) * 100).toFixed(1)
                          : "0"}
                        %
                      </TableCell>
                    </TableRow>
                    {openFamilles.has(f.famille) &&
                      f.articles.map((a) => (
                        <TableRow key={`${f.famille}-${a.article_nom}`}>
                          <TableCell className="text-sm pl-8 text-muted-foreground">
                            {a.article_nom}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {a.quantite}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(a.ca)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {f.totalCa > 0
                              ? ((a.ca / f.totalCa) * 100).toFixed(1)
                              : "0"}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
