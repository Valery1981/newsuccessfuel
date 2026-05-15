"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  stationService,
  type ModificationRequest,
} from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Car,
  CheckCircle,
  Clock,
  Droplets,
  Flame,
  Fuel,
  Loader2,
  MapPin,
  ParkingSquare,
  Pencil,
  Phone,
  Plus,
  Store,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Service options (mirrored from StationCommercialProfilePage) ─────────────

const SERVICE_OPTIONS = [
  {
    key: "has_marchandises_generales",
    label: "Marchandises générales",
    icon: Store,
    category: "boutique" as const,
  },
  {
    key: "has_lubrifiants",
    label: "Lubrifiants",
    icon: Droplets,
    category: "boutique" as const,
  },
  { key: "has_gpl", label: "GPL", icon: Flame, category: "boutique" as const },
  {
    key: "has_lavage",
    label: "Lavage auto",
    icon: Car,
    category: "service" as const,
  },
  {
    key: "has_parking",
    label: "Parking",
    icon: ParkingSquare,
    category: "service" as const,
  },
  {
    key: "has_vulcanisation",
    label: "Vulcanisation",
    icon: Wrench,
    category: "service" as const,
  },
];

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  validee: { label: "Active", variant: "default" },
  en_attente: { label: "En attente", variant: "secondary" },
  suspendue: { label: "Suspendue", variant: "destructive" },
  rejetee: { label: "Rejetée", variant: "destructive" },
};

// ─── Create Station Dialog ─────────────────────────────────────────────────────

function CreateStationDialog({
  open,
  onClose,
  entrepriseId,
}: {
  open: boolean;
  onClose: () => void;
  entrepriseId: string;
}) {
  const queryClient = useQueryClient();
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      stationService.createStation({
        nom: nom.trim(),
        adresse: adresse.trim() || null,
        telephone: telephone.trim() || null,
        entreprise_id: entrepriseId,
        status: "en_attente",
        onboarding_step: "station_info",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations", entrepriseId] });
      toast.success("Station créée — en attente de validation partenaire.");
      setNom("");
      setAdresse("");
      setTelephone("");
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle station</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>
              Nom de la station <span className="text-destructive">*</span>
            </Label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Station Nord"
            />
          </div>
          <div className="space-y-1">
            <Label>Adresse</Label>
            <Input
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Lot II, Antananarivo"
            />
          </div>
          <div className="space-y-1">
            <Label>Téléphone</Label>
            <Input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+261 20 22 xxx xx"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La station sera soumise à validation par votre partenaire ou TM.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              disabled={!nom.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Services Dialog ──────────────────────────────────────────────────────

function EditServicesDialog({
  station,
  compteId,
  onClose,
}: {
  station: { id: string; nom: string; [key: string]: unknown } | null;
  compteId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [services, setServices] = useState<Record<string, boolean>>(() => ({
    has_boutique: !!station?.has_boutique,
    has_marchandises_generales: !!station?.has_marchandises_generales,
    has_lubrifiants: !!station?.has_lubrifiants,
    has_gpl: !!station?.has_gpl,
    has_lavage: !!station?.has_lavage,
    has_parking: !!station?.has_parking,
    has_vulcanisation: !!station?.has_vulcanisation,
  }));

  const toggle = (key: string) => {
    setServices((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const hasBoutique = SERVICE_OPTIONS.filter(
        (s) => s.category === "boutique",
      ).some((s) => updated[s.key]);
      updated.has_boutique = hasBoutique;
      return updated;
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      stationService.createModificationRequest(station!.id, compteId, services),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
      toast.success(
        "Demande de modification envoyée — en attente de validation.",
      );
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!station) return null;

  return (
    <Dialog open={!!station} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Modifier les services — {station.nom as string}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Les modifications seront soumises à validation par votre partenaire
            ou TM avant d&apos;être appliquées.
          </p>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Boutique
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_OPTIONS.filter((s) => s.category === "boutique").map(
                (opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggle(opt.key)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-xs font-medium ${
                      services[opt.key]
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                ),
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Services
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_OPTIONS.filter((s) => s.category === "service").map(
                (opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggle(opt.key)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-xs font-medium ${
                      services[opt.key]
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Envoyer la demande
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ManagerStationsPage() {
  const { entreprise, compte } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    nom: string;
    [key: string]: unknown;
  } | null>(null);

  const { data: stations, isLoading } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () => stationService.getStationsByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id,
  });

  const stationIds = (stations ?? []).map((s) => s.id);

  const { data: pendingRequests = [] } = useQuery<ModificationRequest[]>({
    queryKey: ["pending-requests", stationIds.join(",")],
    queryFn: () => stationService.getPendingRequestsByEntreprise(stationIds),
    enabled: stationIds.length > 0,
  });

  const pendingByStation = pendingRequests.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.station_id] = (acc[r.station_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Mes Stations"
        description="Gérez vos stations-service"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle station
          </Button>
        }
      />

      {!stations || stations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune station"
          description="Créez votre première station-service."
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => {
            const statusCfg =
              STATUS_LABELS[station.status ?? "en_attente"] ??
              STATUS_LABELS.en_attente;
            const hasPending = (pendingByStation[station.id] ?? 0) > 0;
            return (
              <Card key={station.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{station.nom}</CardTitle>
                    <Badge
                      variant={statusCfg.variant}
                      className="text-xs shrink-0"
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>
                  {hasPending && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 mt-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      Modification en attente de validation
                    </div>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2 flex-1">
                  {station.adresse && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{station.adresse}</span>
                    </div>
                  )}
                  {station.telephone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{station.telephone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {[
                        station.has_boutique && "Boutique",
                        station.has_lavage && "Carwash",
                        station.has_lubrifiants && "Lubrifiants",
                        station.has_gpl && "GPL",
                      ]
                        .filter(Boolean)
                        .join(", ") || "Carburant uniquement"}
                    </span>
                  </div>
                  {station.status === "validee" ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Station active
                    </div>
                  ) : station.status === "rejetee" ? (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      Station rejetée — contactez votre partenaire
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="pt-0 pb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() =>
                      setEditTarget(
                        station as unknown as {
                          id: string;
                          nom: string;
                          [key: string]: unknown;
                        },
                      )
                    }
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier les services
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <CreateStationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        entrepriseId={entreprise?.id ?? ""}
      />

      <EditServicesDialog
        key={editTarget?.id ?? "none"}
        station={editTarget}
        compteId={compte?.id ?? ""}
        onClose={() => setEditTarget(null)}
      />
    </PageContainer>
  );
}
