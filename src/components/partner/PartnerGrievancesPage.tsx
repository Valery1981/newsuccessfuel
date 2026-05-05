"use client";

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
import { notifyPriseEnCharge } from "@/services/notificationService";
import {
  partnerService,
  type DoleanceWithStation,
} from "@/services/partnerService";
import { useAuthStore } from "@/stores/authStore";
import type { DoleanceStatut } from "@/types/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Fuel,
  HelpCircle,
  Inbox,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

type TypeIncident =
  | "panne_pistolet"
  | "eau_dans_cuve"
  | "panne_electrique"
  | "probleme_livraison"
  | "autre"
  | "tous";

type FiltreStatut = DoleanceStatut | "tous";

const INCIDENT_LABELS: Record<string, string> = {
  panne_pistolet: "Panne pistolet",
  eau_dans_cuve: "Eau dans cuve",
  panne_electrique: "Panne électrique",
  probleme_livraison: "Problème livraison",
  autre: "Autre",
};

const INCIDENT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  panne_pistolet: Fuel,
  eau_dans_cuve: Droplets,
  panne_electrique: Zap,
  probleme_livraison: Truck,
  autre: HelpCircle,
};

const CHART_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];

function StatutBadge({
  statut,
  urgence,
}: {
  statut: DoleanceStatut;
  urgence?: boolean;
}) {
  if (statut === "envoyee") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 ${urgence ? "bg-red-100 text-red-700 border-red-300" : "bg-orange-100 text-orange-700 border-orange-200"}`}
      >
        {urgence && <AlertCircle className="h-3 w-3" />}
        En attente
      </Badge>
    );
  }
  if (statut === "prise_en_charge") {
    return (
      <Badge
        variant="outline"
        className="bg-blue-100 text-blue-700 border-blue-200"
      >
        Prise en charge
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-green-100 text-green-700 border-green-200"
    >
      Réglée
    </Badge>
  );
}

function formatDelai(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function isUrgent(doleance: DoleanceWithStation): boolean {
  if (doleance.statut !== "envoyee") return false;
  if (!doleance.envoyee_at) return false;
  const diff = Date.now() - new Date(doleance.envoyee_at).getTime();
  return diff > 2 * 60 * 60 * 1000;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Timeline({ doleance }: { doleance: DoleanceWithStation }) {
  const steps = [
    {
      label: "Envoyée",
      date: doleance.envoyee_at,
      icon: Inbox,
      done: true,
      color: "text-orange-500",
    },
    {
      label: "Prise en charge",
      date: doleance.prise_en_charge_at,
      icon: Wrench,
      done: !!doleance.prise_en_charge_at,
      color: "text-blue-500",
    },
    {
      label: "Réglée",
      date: doleance.reglee_at,
      icon: CheckCircle2,
      done: !!doleance.reglee_at,
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const StepIcon = step.icon;
        return (
          <div key={i} className="flex items-start gap-3">
            <div
              className={`mt-0.5 ${step.done ? step.color : "text-muted-foreground/40"}`}
            >
              <StepIcon className="h-4 w-4" />
            </div>
            <div>
              <p
                className={`text-sm font-medium ${!step.done ? "text-muted-foreground/60" : ""}`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(step.date).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PartnerGrievancesPage() {
  const { compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>("tous");
  const [filtreType, setFiltreType] = useState<TypeIncident>("tous");
  const [filtreStation, setFiltreStation] = useState<string>("toutes");
  const [detailDoleance, setDetailDoleance] =
    useState<DoleanceWithStation | null>(null);

  const { data: partenaire, isLoading: loadingPartenaire } = useQuery({
    queryKey: ["partenaire", compte?.id],
    queryFn: () => partnerService.getPartenaireByCompteId(compte!.id),
    enabled: !!compte?.id,
  });

  const { data: doleances = [], isLoading: loadingDoleances } = useQuery({
    queryKey: ["doleances-partenaire", partenaire?.id],
    queryFn: () => partnerService.getDoleancesByPartenaire(partenaire!.id),
    enabled: !!partenaire?.id,
    refetchInterval: 60_000,
  });

  const { mutate: priseEnCharge, isPending: taking } = useMutation({
    mutationFn: async (doleanceId: string) => {
      await partnerService.priseEnChargeDoleance(doleanceId, compte!.id);
      const doleance = doleances.find((d) => d.id === doleanceId);
      if (doleance?.station_id) {
        void notifyPriseEnCharge(doleanceId, doleance.station_id);
      }
    },
    onSuccess: () => {
      toast.success("Doléance prise en charge");
      queryClient.invalidateQueries({ queryKey: ["doleances-partenaire"] });
      setDetailDoleance(null);
    },
    onError: () => toast.error("Erreur lors de la prise en charge"),
  });

  const stationsUniques = useMemo(() => {
    const map = new Map<string, string>();
    doleances.forEach((d) => {
      if (d.station_id && d.stations?.nom)
        map.set(d.station_id, d.stations.nom);
    });
    return Array.from(map.entries());
  }, [doleances]);

  const doleancesFiltrees = useMemo(
    () =>
      doleances.filter((d) => {
        if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false;
        if (filtreType !== "tous" && d.type_incident !== filtreType)
          return false;
        if (filtreStation !== "toutes" && d.station_id !== filtreStation)
          return false;
        return true;
      }),
    [doleances, filtreStatut, filtreType, filtreStation],
  );

  const stats = useMemo(() => {
    const envoyees = doleances.filter((d) => d.statut === "envoyee");
    const prises = doleances.filter((d) => d.statut === "prise_en_charge");
    const reglees = doleances.filter((d) => d.statut === "reglee");

    const delaisPC = doleances
      .filter((d) => d.delai_prise_en_charge_minutes !== null)
      .map((d) => d.delai_prise_en_charge_minutes as number);
    const delaisRes = doleances
      .filter((d) => d.delai_resolution_minutes !== null)
      .map((d) => d.delai_resolution_minutes as number);

    const avgPC =
      delaisPC.length > 0
        ? Math.round(delaisPC.reduce((a, b) => a + b, 0) / delaisPC.length)
        : null;
    const avgRes =
      delaisRes.length > 0
        ? Math.round(delaisRes.reduce((a, b) => a + b, 0) / delaisRes.length)
        : null;

    return {
      total: doleances.length,
      envoyees: envoyees.length,
      prises: prises.length,
      reglees: reglees.length,
      avgPC,
      avgRes,
    };
  }, [doleances]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    doleances.forEach((d) => {
      counts[d.type_incident] = (counts[d.type_incident] ?? 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: INCIDENT_LABELS[type] ?? type,
      count,
    }));
  }, [doleances]);

  if (loadingPartenaire || loadingDoleances) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Doléances"
        description="Consultez et gérez les doléances de votre réseau"
      />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total"
          value={stats.total}
          icon={Inbox}
          color="bg-slate-500"
        />
        <StatCard
          label="En attente"
          value={stats.envoyees}
          icon={Clock}
          color="bg-orange-500"
        />
        <StatCard
          label="En cours"
          value={stats.prises}
          icon={Wrench}
          color="bg-blue-500"
        />
        <StatCard
          label="Réglées"
          value={stats.reglees}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <StatCard
          label="Délai moy. réception"
          value={formatDelai(stats.avgPC)}
          icon={Clock}
          color="bg-purple-500"
        />
        <StatCard
          label="Délai moy. résolution"
          value={formatDelai(stats.avgRes)}
          icon={CheckCircle2}
          color="bg-teal-500"
        />
      </div>

      {/* Graphique */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4" />
              Types d&apos;incidents les plus fréquents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filtreStatut}
          onValueChange={(v) => setFiltreStatut((v ?? "tous") as FiltreStatut)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="envoyee">En attente</SelectItem>
            <SelectItem value="prise_en_charge">En cours</SelectItem>
            <SelectItem value="reglee">Réglées</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filtreType}
          onValueChange={(v) => setFiltreType((v ?? "tous") as TypeIncident)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type incident" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            {Object.entries(INCIDENT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {stationsUniques.length > 1 && (
          <Select
            value={filtreStation}
            onValueChange={(v) => setFiltreStation(v ?? "toutes")}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Station">
                {filtreStation !== "toutes"
                  ? stationsUniques.find(([id]) => id === filtreStation)?.[1]
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les stations</SelectItem>
              {stationsUniques.map(([id, nom]) => (
                <SelectItem key={id} value={id}>
                  {nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Liste */}
      {doleancesFiltrees.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune doléance"
          description="Aucune doléance ne correspond aux critères sélectionnés."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Date envoi
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Délai réception
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Délai résolution
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doleancesFiltrees.map((d) => {
                  const urgent = isUrgent(d);
                  const IncidentIcon =
                    INCIDENT_ICONS[d.type_incident] ?? HelpCircle;
                  return (
                    <TableRow
                      key={d.id}
                      className={urgent ? "bg-red-50/50" : undefined}
                    >
                      <TableCell className="font-medium">
                        {d.stations?.nom ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <IncidentIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="hidden sm:inline">
                            {INCIDENT_LABELS[d.type_incident] ??
                              d.type_incident}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px]">
                        <span className="line-clamp-1">{d.description}</span>
                      </TableCell>
                      <TableCell>
                        <StatutBadge
                          statut={d.statut ?? "envoyee"}
                          urgence={urgent}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {d.envoyee_at
                          ? new Date(d.envoyee_at).toLocaleDateString("fr-FR")
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDelai(d.delai_prise_en_charge_minutes)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDelai(d.delai_resolution_minutes)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.statut === "envoyee" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => priseEnCharge(d.id)}
                              disabled={taking}
                            >
                              Bien reçu
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDetailDoleance(d)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Dialog Détail */}
      <Dialog
        open={!!detailDoleance}
        onOpenChange={(open) => {
          if (!open) setDetailDoleance(null);
        }}
      >
        {detailDoleance && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const Icon =
                    INCIDENT_ICONS[detailDoleance.type_incident] ?? HelpCircle;
                  return <Icon className="h-4 w-4" />;
                })()}
                {INCIDENT_LABELS[detailDoleance.type_incident] ??
                  detailDoleance.type_incident}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Station
                </p>
                <p className="text-sm font-medium">
                  {detailDoleance.stations?.nom ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm">{detailDoleance.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Chronologie
                </p>
                <Timeline doleance={detailDoleance} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Délai réception
                  </p>
                  <p className="text-sm font-medium">
                    {formatDelai(detailDoleance.delai_prise_en_charge_minutes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Délai résolution
                  </p>
                  <p className="text-sm font-medium">
                    {formatDelai(detailDoleance.delai_resolution_minutes)}
                  </p>
                </div>
              </div>
              {detailDoleance.statut === "envoyee" && (
                <Button
                  className="w-full"
                  onClick={() => priseEnCharge(detailDoleance.id)}
                  disabled={taking}
                >
                  {taking ? "Traitement..." : "Marquer comme bien reçu"}
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </PageContainer>
  );
}
