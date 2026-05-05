"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminService,
  type DoleanceAvecRelations,
} from "@/services/adminService";
import type { Database, DoleanceStatut } from "@/types/supabase";

type DoleanceTypeIncident =
  Database["public"]["Tables"]["doleances"]["Row"]["type_incident"];

const PAGE_SIZE = 20;

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  envoyee: { label: "Envoyée", className: "bg-orange-100 text-orange-700" },
  prise_en_charge: {
    label: "Prise en charge",
    className: "bg-blue-100 text-blue-700",
  },
  reglee: { label: "Réglée", className: "bg-green-100 text-green-700" },
};

const TYPE_LABELS: Record<string, string> = {
  panne_pistolet: "Panne pistolet",
  eau_dans_cuve: "Eau dans cuve",
  panne_electrique: "Panne électrique",
  probleme_livraison: "Problème livraison",
  autre: "Autre",
};

const TYPES_INCIDENTS = [
  { value: "panne_pistolet", label: "Panne pistolet" },
  { value: "eau_dans_cuve", label: "Eau dans cuve" },
  { value: "panne_electrique", label: "Panne électrique" },
  { value: "probleme_livraison", label: "Problème livraison" },
  { value: "autre", label: "Autre" },
];

function formatDelai(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

export function AdminBugReportsPage() {
  const [page, setPage] = useState(0);
  const [statutFilter, setStatutFilter] = useState<string>("tous");
  const [typeFilter, setTypeFilter] = useState<string>("tous");
  const [detail, setDetail] = useState<DoleanceAvecRelations | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-doleances", page, statutFilter, typeFilter],
    queryFn: () =>
      adminService.getDoleances(
        page,
        PAGE_SIZE,
        statutFilter === "tous" ? undefined : (statutFilter as DoleanceStatut),
        typeFilter === "tous"
          ? undefined
          : (typeFilter as DoleanceTypeIncident),
      ),
  });

  const { data: statsData } = useQuery({
    queryKey: ["admin-doleances-stats"],
    queryFn: () => adminService.getDoleancesStats(),
  });

  const doleances = data?.data ?? [];
  const total = data?.count ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  const stats = (() => {
    if (!statsData) return null;
    const regles = statsData.filter((d) => d.statut === "reglee");
    const prisEnCharge = statsData.filter(
      (d) => d.statut === "prise_en_charge" || d.statut === "reglee",
    );
    const avgPEC =
      prisEnCharge.length > 0
        ? Math.round(
            prisEnCharge.reduce(
              (acc, d) => acc + (d.delai_prise_en_charge_minutes ?? 0),
              0,
            ) / prisEnCharge.length,
          )
        : null;
    const avgRes =
      regles.length > 0
        ? Math.round(
            regles.reduce(
              (acc, d) => acc + (d.delai_resolution_minutes ?? 0),
              0,
            ) / regles.length,
          )
        : null;

    const typeCounts: Record<string, number> = {};
    statsData.forEach((d) => {
      typeCounts[d.type_incident] = (typeCounts[d.type_incident] ?? 0) + 1;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    return { avgPEC, avgRes, topType, total: statsData.length };
  })();

  return (
    <PageContainer>
      <PageHeader
        title="Doléances"
        description="Vue globale des incidents signalés par les stations"
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total incidents
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Délai moy. accusé réception
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{formatDelai(stats.avgPEC)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Délai moy. résolution
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{formatDelai(stats.avgRes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Incident fréquent
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-base font-bold">
                {stats.topType
                  ? (TYPE_LABELS[stats.topType[0]] ?? stats.topType[0])
                  : "—"}
              </p>
              {stats.topType && (
                <p className="text-xs text-muted-foreground">
                  {stats.topType[1]} occurrence{stats.topType[1] > 1 ? "s" : ""}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statutFilter}
          onValueChange={(v) => {
            setStatutFilter(v ?? "tous");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="envoyee">Envoyée</SelectItem>
            <SelectItem value="prise_en_charge">Prise en charge</SelectItem>
            <SelectItem value="reglee">Réglée</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v ?? "tous");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les types">
              {typeFilter !== "tous"
                ? TYPES_INCIDENTS.find((t) => t.value === typeFilter)?.label
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            {TYPES_INCIDENTS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statutFilter !== "tous" || typeFilter !== "tous") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatutFilter("tous");
              setTypeFilter("tous");
              setPage(0);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : doleances.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Aucune doléance"
          description="Aucun incident ne correspond aux filtres sélectionnés."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date envoi</TableHead>
                  <TableHead>Délai PEC</TableHead>
                  <TableHead>Délai résolution</TableHead>
                  <TableHead className="text-right">Détail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doleances.map((d) => {
                  const statut = STATUT_CONFIG[d.statut] ?? {
                    label: d.statut,
                    className: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.stations?.nom ?? "—"}
                      </TableCell>
                      <TableCell>{d.partenaires?.nom ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {TYPE_LABELS[d.type_incident] ?? d.type_incident}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <span
                          className="text-sm line-clamp-2"
                          title={d.description}
                        >
                          {d.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statut.className}>
                          {statut.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                        {format(new Date(d.envoyee_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDelai(d.delai_prise_en_charge_minutes)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDelai(d.delai_resolution_minutes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetail(d)}
                          title="Voir détail"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} doléance{total > 1 ? "s" : ""} au total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>
                Page {page + 1} / {pageCount || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Dialog détail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la doléance</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Station</p>
                  <p className="font-medium">{detail.stations?.nom ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Partenaire</p>
                  <p className="font-medium">
                    {detail.partenaires?.nom ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {TYPE_LABELS[detail.type_incident] ?? detail.type_incident}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Badge
                    className={
                      STATUT_CONFIG[detail.statut]?.className ??
                      "bg-gray-100 text-gray-600"
                    }
                  >
                    {STATUT_CONFIG[detail.statut]?.label ?? detail.statut}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm bg-muted/50 rounded-md p-3">
                  {detail.description}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envoyée le</span>
                  <span>
                    {format(
                      new Date(detail.envoyee_at),
                      "dd MMMM yyyy à HH:mm",
                      { locale: fr },
                    )}
                  </span>
                </div>
                {detail.prise_en_charge_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Prise en charge le
                    </span>
                    <span>
                      {format(
                        new Date(detail.prise_en_charge_at),
                        "dd MMMM yyyy à HH:mm",
                        { locale: fr },
                      )}
                    </span>
                  </div>
                )}
                {detail.reglee_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Réglée le</span>
                    <span>
                      {format(
                        new Date(detail.reglee_at),
                        "dd MMMM yyyy à HH:mm",
                        { locale: fr },
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Délai prise en charge
                  </span>
                  <span className="font-medium">
                    {formatDelai(detail.delai_prise_en_charge_minutes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Délai résolution
                  </span>
                  <span className="font-medium">
                    {formatDelai(detail.delai_resolution_minutes)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
