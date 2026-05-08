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
import {
  partnerService,
  type ObjectifRow,
  type StationWithEntreprise,
} from "@/services/partnerService";
import { tmService } from "@/services/tmService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  Droplets,
  Flame,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Settings,
  ShoppingBag,
  Target,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StationStatus = Database["public"]["Enums"]["station_status"];

type FiltreStatut = StationStatus | "tous";
type VueMode = "grille" | "liste";

const OBJECTIF_TYPE_LABELS: Record<string, string> = {
  carburant_global: "Carburant global",
  carburant_specifique: "Carburant spécifique",
  boutique_ca: "Chiffre d'affaires boutique",
};

function StatutBadge({ statut }: { statut: StationStatus }) {
  const map: Record<StationStatus, { label: string; className: string }> = {
    en_attente: {
      label: "En attente",
      className: "bg-orange-100 text-orange-700 border-orange-200",
    },
    validee: {
      label: "Validée",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    suspendue: {
      label: "Suspendue",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  };
  const { label, className } = map[statut] ?? { label: statut, className: "" };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function ServicesBadges({ station }: { station: StationWithEntreprise }) {
  const services = [
    station.has_boutique && {
      label: "Boutique",
      icon: ShoppingBag,
      color: "text-blue-500",
    },
    station.has_lubrifiants && {
      label: "Lubrifiants",
      icon: Droplets,
      color: "text-yellow-500",
    },
    station.has_gpl && { label: "GPL", icon: Flame, color: "text-orange-500" },
    station.has_lavage && {
      label: "Lavage",
      icon: Car,
      color: "text-teal-500",
    },
  ].filter(Boolean) as {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[];

  if (services.length === 0)
    return (
      <span className="text-sm text-muted-foreground">
        Carburant uniquement
      </span>
    );

  return (
    <div className="flex flex-wrap gap-1.5">
      {services.map(({ label, icon: Icon, color }) => (
        <span
          key={label}
          title={label}
          className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
        >
          <Icon className={`h-3 w-3 ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function StationCard({
  station,
  onDetail,
}: {
  station: StationWithEntreprise;
  onDetail: (s: StationWithEntreprise) => void;
}) {
  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{station.nom}</CardTitle>
          <StatutBadge statut={station.status ?? "en_attente"} />
        </div>
        {station.entreprises?.nom && (
          <p className="text-xs text-muted-foreground">
            {station.entreprises.nom}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {station.adresse && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{station.adresse}</span>
          </div>
        )}
        {station.telephone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{station.telephone}</span>
          </div>
        )}
        <ServicesBadges station={station} />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs">
            {station.initialisation_validee ? (
              <span className="flex items-center gap-1 text-green-600">
                <Settings className="h-3 w-3" />
                Initialisée
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Settings className="h-3 w-3" />
                Non initialisée
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            onClick={() => onDetail(station)}
          >
            Détails
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ObjectifsSection({ stationId }: { stationId: string }) {
  const { data: objectifs = [], isLoading } = useQuery({
    queryKey: ["objectifs-station", stationId],
    queryFn: () => partnerService.getObjectifsByStation(stationId),
    enabled: !!stationId,
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des objectifs...
      </p>
    );
  }

  if (objectifs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun objectif actif pour la période en cours.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {objectifs.map((obj: ObjectifRow) => (
        <div
          key={obj.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="text-sm font-medium">
              {OBJECTIF_TYPE_LABELS[obj.type] ?? obj.type}
              {obj.type_carburant && (
                <span className="ml-1 text-muted-foreground">
                  ({obj.type_carburant})
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(obj.periode_debut).toLocaleDateString("fr-FR")} —{" "}
              {new Date(obj.periode_fin).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <p className="text-sm font-semibold">
            {obj.valeur.toLocaleString("fr-FR")}
          </p>
        </div>
      ))}
    </div>
  );
}

function StationDetailDialog({
  station,
  onClose,
}: {
  station: StationWithEntreprise | null;
  onClose: () => void;
}) {
  const { data: tms } = useQuery({
    queryKey: ["tms"],
    queryFn: () => tmService.getTMs(),
  });

  const handleAssignTM = async (tmId: string | null) => {
    if (!tmId) return;
    try {
      await tmService.assignTMToStation(station!.id, tmId);
      toast.success("TM assigné avec succès");
      window.location.reload();
    } catch {
      toast.error("Erreur lors de l'assignation du TM");
    }
  };

  const handleRemoveTM = async () => {
    try {
      await tmService.removeTMFromStation(station!.id);
      toast.success("TM retiré avec succès");
      window.location.reload();
    } catch {
      toast.error("Erreur lors du retrait du TM");
    }
  };

  if (!station) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {station.nom}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Infos générales */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Informations générales
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatutBadge statut={station.status ?? "en_attente"} />
                {station.initialisation_validee && (
                  <Badge
                    variant="outline"
                    className="bg-teal-50 text-teal-700 border-teal-200 text-xs"
                  >
                    Initialisée
                  </Badge>
                )}
              </div>
              {station.entreprises?.nom && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{station.entreprises.nom}</span>
                </div>
              )}
              {station.adresse && (
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{station.adresse}</span>
                </div>
              )}
              {station.telephone && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{station.telephone}</span>
                </div>
              )}
            </div>
          </section>

          {/* Assignation TM */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Territory Manager
            </h3>
            <div className="space-y-2">
              <Select
                value={
                  (station as StationWithEntreprise & { tm_id?: string | null })
                    .tm_id || ""
                }
                onValueChange={handleAssignTM}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assigner un TM">
                    {(
                      station as StationWithEntreprise & {
                        tm_id?: string | null;
                      }
                    ).tm_id
                      ? tms?.find(
                          (tm) =>
                            tm.id ===
                            (
                              station as StationWithEntreprise & {
                                tm_id?: string | null;
                              }
                            ).tm_id,
                        )?.nom
                      : "Aucun TM assigné"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun TM</SelectItem>
                  {tms?.map((tm) => (
                    <SelectItem key={tm.id} value={tm.id}>
                      {tm.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(station as StationWithEntreprise & { tm_id?: string | null })
                .tm_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveTM}
                  className="text-red-600"
                >
                  Retirer le TM
                </Button>
              )}
            </div>
          </section>

          {/* Services */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Services disponibles
            </h3>
            <ServicesBadges station={station} />
          </section>

          {/* Objectifs actifs */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Objectifs de la période en cours
            </h3>
            <ObjectifsSection stationId={station.id} />
          </section>

          {/* Date validation */}
          {station.valide_at && (
            <section className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Station validée le{" "}
                {new Date(station.valide_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerStationsPage() {
  const { compte } = useAuthStore();
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>("tous");
  const [vue, setVue] = useState<VueMode>("grille");
  const [stationDetail, setStationDetail] =
    useState<StationWithEntreprise | null>(null);

  const { data: partenaire, isLoading: loadingPartenaire } = useQuery({
    queryKey: ["partenaire", compte?.id],
    queryFn: () => partnerService.getPartenaireByCompteId(compte!.id),
    enabled: !!compte?.id,
  });

  const { data: stations = [], isLoading: loadingStations } = useQuery({
    queryKey: ["stations-partenaire", partenaire?.id],
    queryFn: () => partnerService.getStationsByPartenaire(partenaire!.id),
    enabled: !!partenaire?.id,
  });

  const stationsFiltrees = useMemo(
    () =>
      stations.filter((s) =>
        filtreStatut === "tous" ? true : s.status === filtreStatut,
      ),
    [stations, filtreStatut],
  );

  const stats = useMemo(
    () => ({
      total: stations.length,
      validees: stations.filter((s) => s.status === "validee").length,
      enAttente: stations.filter((s) => s.status === "en_attente").length,
      avecBoutique: stations.filter((s) => s.has_boutique).length,
    }),
    [stations],
  );

  if (loadingPartenaire || loadingStations) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Mes Stations"
        description="Vue d'ensemble des stations de votre réseau"
        actions={
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              size="icon"
              variant={vue === "grille" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => setVue("grille")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={vue === "liste" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => setVue("liste")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-slate-500 p-2.5">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total stations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-green-500 p-2.5">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.validees}</p>
              <p className="text-xs text-muted-foreground">Validées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-orange-500 p-2.5">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.enAttente}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-full bg-blue-500 p-2.5">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avecBoutique}</p>
              <p className="text-xs text-muted-foreground">Avec boutique</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre statut */}
      <div className="flex items-center gap-2">
        <Select
          value={filtreStatut}
          onValueChange={(v) => setFiltreStatut(v as FiltreStatut)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="validee">Validées</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="suspendue">Suspendues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contenu */}
      {stationsFiltrees.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune station"
          description="Aucune station ne correspond aux critères sélectionnés."
        />
      ) : vue === "grille" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stationsFiltrees.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              onDetail={setStationDetail}
            />
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Entreprise
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Adresse
                  </TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Initialisation
                  </TableHead>
                  <TableHead className="text-right">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationsFiltrees.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.nom}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {station.entreprises?.nom ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {station.adresse ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {station.adresse}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {station.has_boutique && (
                          <span title="Boutique">
                            <ShoppingBag
                              className="h-4 w-4 text-blue-500"
                              aria-hidden
                            />
                          </span>
                        )}
                        {station.has_lubrifiants && (
                          <span title="Lubrifiants">
                            <Droplets
                              className="h-4 w-4 text-yellow-500"
                              aria-hidden
                            />
                          </span>
                        )}
                        {station.has_gpl && (
                          <span title="GPL">
                            <Flame
                              className="h-4 w-4 text-orange-500"
                              aria-hidden
                            />
                          </span>
                        )}
                        {station.has_lavage && (
                          <span title="Lavage">
                            <Car
                              className="h-4 w-4 text-teal-500"
                              aria-hidden
                            />
                          </span>
                        )}
                        {!station.has_boutique &&
                          !station.has_lubrifiants &&
                          !station.has_gpl &&
                          !station.has_lavage && (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatutBadge statut={station.status ?? "en_attente"} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {station.initialisation_validee ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Validée
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" />
                          Non validée
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setStationDetail(station)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Dialog détail */}
      <StationDetailDialog
        station={stationDetail}
        onClose={() => setStationDetail(null)}
      />
    </PageContainer>
  );
}
