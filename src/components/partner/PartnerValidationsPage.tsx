"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  type StationWithEntreprise,
} from "@/services/partnerService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  Car,
  CheckCircle,
  Clock,
  Droplets,
  Flame,
  Info,
  MapPin,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StationStatus = Database["public"]["Enums"]["station_status"];

type FiltreStatut = StationStatus | "tous";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
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
        </div>
      </CardContent>
    </Card>
  );
}

function StatutBadge({ statut }: { statut: StationStatus }) {
  const map: Record<StationStatus, { label: string; className: string }> = {
    en_attente: {
      label: "En attente",
      className: "bg-orange-100 text-orange-700 border-orange-200",
    },
    validee: {
      label: "Active",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    suspendue: {
      label: "Suspendue",
      className: "bg-red-100 text-red-700 border-red-200",
    },
    rejetee: {
      label: "Rejetée",
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

function ServicesIcons({ station }: { station: StationWithEntreprise }) {
  return (
    <div className="flex items-center gap-1.5">
      {station.has_boutique && (
        <span title="Boutique">
          <ShoppingBag className="w-4 h-4 text-blue-500" />
        </span>
      )}
      {station.has_lubrifiants && (
        <span title="Lubrifiants">
          <Droplets className="w-4 h-4 text-yellow-500" />
        </span>
      )}
      {station.has_gpl && (
        <span title="GPL">
          <Flame className="w-4 h-4 text-orange-500" />
        </span>
      )}
      {station.has_lavage && (
        <span title="Lavage">
          <Car className="w-4 h-4 text-teal-500" />
        </span>
      )}
      {!station.has_boutique &&
        !station.has_lubrifiants &&
        !station.has_gpl &&
        !station.has_lavage && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
    </div>
  );
}

export function PartnerValidationsPage() {
  const { compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>("tous");
  const [stationAValider, setStationAValider] =
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

  const { mutate: valider, isPending: validating } = useMutation({
    mutationFn: (stationId: string) =>
      partnerService.validerStation(stationId, compte!.id),
    onSuccess: (_, stationId) => {
      const station = stations.find((s) => s.id === stationId);
      toast.success(`Station "${station?.nom ?? ""}" validée avec succès`);
      queryClient.invalidateQueries({ queryKey: ["stations-partenaire"] });
      setStationAValider(null);
    },
    onError: () => toast.error("Erreur lors de la validation"),
  });

  if (loadingPartenaire || loadingStations) return <PageLoading />;

  const isOfficiel = partenaire?.type === "officiel";

  const stationsFiltrees = stations.filter((s) =>
    filtreStatut === "tous" ? true : s.status === filtreStatut,
  );

  const stats = {
    total: stations.length,
    validees: stations.filter((s) => s.status === "validee").length,
    enAttente: stations.filter((s) => s.status === "en_attente").length,
    suspendues: stations.filter((s) => s.status === "suspendue").length,
  };

  return (
    <PageContainer>
      <PageHeader
        title="Validations des Stations"
        description="Gérez les demandes de validation de votre réseau"
      />

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total réseau"
          value={stats.total}
          icon={Building2}
          color="bg-slate-500"
        />
        <StatCard
          label="Validées"
          value={stats.validees}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          label="En attente"
          value={stats.enAttente}
          icon={Clock}
          color="bg-orange-500"
        />
        <StatCard
          label="Suspendues"
          value={stats.suspendues}
          icon={XCircle}
          color="bg-red-500"
        />
      </div>

      {/* Bannière info si non officiel */}
      {!isOfficiel && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            La validation de vos stations est assurée par l&apos;équipe
            SuccessFuel. Vous pouvez consulter l&apos;état de vos stations
            ci-dessous en lecture seule.
          </p>
        </div>
      )}

      {/* Filtre */}
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
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="validee">Validées</SelectItem>
            <SelectItem value="suspendue">Suspendues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {stationsFiltrees.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune station"
          description="Aucune station ne correspond aux critères sélectionnés."
        />
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
                  <TableHead className="hidden sm:table-cell">
                    Date création
                  </TableHead>
                  <TableHead>Statut</TableHead>
                  {isOfficiel && (
                    <TableHead className="text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stationsFiltrees.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.nom}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {station.entreprises?.nom ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {station.adresse ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {station.adresse}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ServicesIcons station={station} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {station.created_at
                          ? new Date(station.created_at).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatutBadge statut={station.status ?? "en_attente"} />
                    </TableCell>
                    {isOfficiel && (
                      <TableCell className="text-right">
                        {station.status === "en_attente" && (
                          <Button
                            size="sm"
                            onClick={() => setStationAValider(station)}
                          >
                            Valider
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Dialog confirmation */}
      <Dialog
        open={!!stationAValider}
        onOpenChange={(open) => {
          if (!open) setStationAValider(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la validation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir valider la station{" "}
              <strong>{stationAValider?.nom}</strong> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStationAValider(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => stationAValider && valider(stationAValider.id)}
              disabled={validating}
            >
              {validating ? "Validation..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
