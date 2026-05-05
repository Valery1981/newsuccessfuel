"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDatetime, getErrorMessage, truncate } from "@/lib/utils";
import {
  doleanceService,
  TYPE_INCIDENT_LABELS,
  type Doleance,
  type TypeIncident,
} from "@/services/doleanceService";
import {
  notifyDoleanceReglee,
  notifyNouvelleDoceleance,
} from "@/services/notificationService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import type { DoleanceStatut } from "@/types/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquarePlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const PAGE_SIZE = 20;

const nouvelleDoleanceSchema = z.object({
  station_id: z.string().uuid("Sélectionnez une station"),
  type_incident: z.enum([
    "panne_pistolet",
    "eau_dans_cuve",
    "panne_electrique",
    "probleme_livraison",
    "autre",
  ]),
  description: z
    .string()
    .min(10, "Décrivez le problème (au moins 10 caractères)"),
});

type NouvelleDoleanceForm = z.infer<typeof nouvelleDoleanceSchema>;

function StatutBadge({ statut }: { statut: DoleanceStatut }) {
  if (statut === "reglee")
    return (
      <Badge className="bg-green-600 text-white text-xs whitespace-nowrap">
        Réglée
      </Badge>
    );
  if (statut === "prise_en_charge")
    return (
      <Badge className="bg-blue-600 text-white text-xs whitespace-nowrap">
        Prise en charge
      </Badge>
    );
  return (
    <Badge className="bg-orange-500 text-white text-xs whitespace-nowrap">
      Envoyée
    </Badge>
  );
}

function formatDelaiMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function DoleancesPage() {
  const { compte, entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  const [filtreStation, setFiltreStation] = useState<string>("toutes");
  const [filtreStatut, setFiltreStatut] = useState<DoleanceStatut | "tous">(
    "tous",
  );
  const [filtreType, setFiltreType] = useState<TypeIncident | "tous">("tous");
  const [page, setPage] = useState(0);

  const [dialogNouvelle, setDialogNouvelle] = useState(false);
  const [detail, setDetail] = useState<Doleance | null>(null);
  const [doleanceARegler, setDoleanceARegler] = useState<Doleance | null>(null);

  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const stationIds = useMemo(() => stations.map((s) => s.id), [stations]);

  const { data: doleances = [], isLoading: doleancesLoading } = useQuery({
    queryKey: ["doleances-manager", stationIds],
    queryFn: () => doleanceService.getDoleancesByStations(stationIds),
    enabled: stationIds.length > 0,
  });

  const stats = useMemo(
    () => doleanceService.computeStats(doleances),
    [doleances],
  );

  const filtrées = useMemo(() => {
    return doleances.filter((d) => {
      if (filtreStation !== "toutes" && d.station_id !== filtreStation)
        return false;
      if (filtreStatut !== "tous" && d.statut !== filtreStatut) return false;
      if (filtreType !== "tous" && d.type_incident !== filtreType) return false;
      return true;
    });
  }, [doleances, filtreStation, filtreStatut, filtreType]);

  const totalPages = Math.max(1, Math.ceil(filtrées.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageRows = filtrées.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );

  const form = useForm<NouvelleDoleanceForm>({
    resolver: zodResolver(nouvelleDoleanceSchema),
    defaultValues: {
      station_id: "",
      type_incident: "panne_pistolet",
      description: "",
    },
  });

  const mutationCreer = useMutation({
    mutationFn: async (values: NouvelleDoleanceForm) => {
      const st = stations.find((s) => s.id === values.station_id);
      const partenaireId =
        st && "partenaire_id" in st
          ? (st.partenaire_id as string | null)
          : null;
      if (!partenaireId) {
        toast.warning(
          "Cette station n'a pas de partenaire lié : la doléance sera enregistrée sans destinataire partenaire.",
        );
      }
      const result = await doleanceService.creerDoleance({
        station_id: values.station_id,
        partenaire_id: partenaireId,
        type_incident: values.type_incident,
        description: values.description,
      });
      if (result?.id && partenaireId) {
        void notifyNouvelleDoceleance(
          result.id,
          partenaireId,
          (st as { nom?: string } | undefined)?.nom ?? "",
          values.type_incident,
        );
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doleances-manager"] });
      toast.success("Doléance envoyée au partenaire");
      setDialogNouvelle(false);
      form.reset({
        station_id: "",
        type_incident: "panne_pistolet",
        description: "",
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const mutationReglee = useMutation({
    mutationFn: async (d: Doleance) => {
      if (!compte?.id) throw new Error("Session non disponible");
      await doleanceService.marquerReglee(d.id, compte.id);
      if (d.partenaire_id) {
        void notifyDoleanceReglee(d.id, d.partenaire_id, d.station_nom ?? "");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doleances-manager"] });
      toast.success("Doléance marquée comme réglée");
      setDoleanceARegler(null);
      setDetail(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const loading =
    stationsLoading || (stationIds.length > 0 && doleancesLoading);

  if (!entreprise?.id) {
    return (
      <PageContainer>
        <PageHeader
          title="Doléances"
          description="Gérez les réclamations et doléances liées à vos stations"
        />
        <EmptyState
          title="Entreprise requise"
          description="Connectez-vous avec un compte gérant pour accéder aux doléances."
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Doléances"
          description="Gérez les réclamations et doléances liées à vos stations"
        />
        <PageLoading />
      </PageContainer>
    );
  }

  if (stations.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          title="Doléances"
          description="Gérez les réclamations et doléances liées à vos stations"
        />
        <EmptyState
          title="Aucune station"
          description="Créez au moins une station pour déclarer des doléances."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Doléances"
        description="Workflow station → partenaire : création, suivi et clôture lorsque le problème est résolu"
        actions={
          <Button
            onClick={() => setDialogNouvelle(true)}
            size="sm"
            className="gap-2"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Nouvelle doléance
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.en_cours}</p>
            <p className="text-xs text-muted-foreground">
              Envoyée ou prise en charge
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réglées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.reglees}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Délai moyen résolution
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatDelaiMinutes(stats.delai_moyen_resolution_minutes)}
            </p>
            <p className="text-xs text-muted-foreground">Doléances clôturées</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Station</p>
          <Select
            value={filtreStation}
            onValueChange={(v) => {
              setFiltreStation(v ?? "toutes");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Station">
                {filtreStation !== "toutes"
                  ? stations.find((s) => s.id === filtreStation)?.nom
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les stations</SelectItem>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Statut</p>
          <Select
            value={filtreStatut}
            onValueChange={(v) => {
              setFiltreStatut((v ?? "tous") as DoleanceStatut | "tous");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous</SelectItem>
              <SelectItem value="envoyee">Envoyée</SelectItem>
              <SelectItem value="prise_en_charge">Prise en charge</SelectItem>
              <SelectItem value="reglee">Réglée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Type</p>
          <Select
            value={filtreType}
            onValueChange={(v) => {
              setFiltreType((v ?? "tous") as TypeIncident | "tous");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              {(Object.keys(TYPE_INCIDENT_LABELS) as TypeIncident[]).map(
                (k) => (
                  <SelectItem key={k} value={k}>
                    {TYPE_INCIDENT_LABELS[k]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Partenaire</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">
                Description
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden lg:table-cell">Envoyée</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune doléance pour ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.station_nom ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.partenaire_nom ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {TYPE_INCIDENT_LABELS[d.type_incident]}
                  </TableCell>
                  <TableCell className="hidden max-w-[240px] md:table-cell text-muted-foreground text-sm">
                    {truncate(d.description, 80)}
                  </TableCell>
                  <TableCell>
                    <StatutBadge statut={d.statut} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDatetime(d.envoyee_at)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetail(d)}
                    >
                      Détail
                    </Button>
                    {d.statut === "prise_en_charge" && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setDoleanceARegler(d)}
                      >
                        Réglé
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtrées.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Page {pageSafe + 1} / {totalPages} ({filtrées.length} résultat
            {filtrées.length > 1 ? "s" : ""})
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageSafe <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageSafe >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogNouvelle} onOpenChange={setDialogNouvelle}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle doléance</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => mutationCreer.mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="station_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une station">
                            {stations.find((s) => s.id === field.value)?.nom}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type_incident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d&apos;incident</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(TYPE_INCIDENT_LABELS) as TypeIncident[]
                        ).map((k) => (
                          <SelectItem key={k} value={k}>
                            {TYPE_INCIDENT_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Décrivez le problème…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogNouvelle(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={mutationCreer.isPending}>
                  {mutationCreer.isPending ? "Envoi…" : "Envoyer au partenaire"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la doléance</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatutBadge statut={detail.statut} />
                <span className="text-muted-foreground">
                  {TYPE_INCIDENT_LABELS[detail.type_incident]}
                </span>
              </div>
              <p>
                <span className="font-medium">Station :</span>{" "}
                {detail.station_nom ?? "—"}
              </p>
              <p>
                <span className="font-medium">Partenaire :</span>{" "}
                {detail.partenaire_nom ?? "—"}
              </p>
              <p className="whitespace-pre-wrap">{detail.description}</p>
              <div className="rounded-md border p-3 space-y-1 text-muted-foreground">
                <p>Envoyée le {formatDatetime(detail.envoyee_at)}</p>
                {detail.prise_en_charge_at && (
                  <p>
                    Prise en charge le{" "}
                    {formatDatetime(detail.prise_en_charge_at)}
                  </p>
                )}
                {detail.reglee_at && (
                  <p>Réglée le {formatDatetime(detail.reglee_at)}</p>
                )}
                <p>
                  Délai accusé réception :{" "}
                  {formatDelaiMinutes(detail.delai_prise_en_charge_minutes)}
                </p>
                <p>
                  Délai résolution :{" "}
                  {formatDelaiMinutes(detail.delai_resolution_minutes)}
                </p>
              </div>
              {detail.statut === "prise_en_charge" && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setDoleanceARegler(detail);
                  }}
                >
                  Marquer comme réglée
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!doleanceARegler}
        onOpenChange={(o) => !o && setDoleanceARegler(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la clôture</AlertDialogTitle>
            <AlertDialogDescription>
              Indiquez que le problème signalé est résolu côté station. Cette
              action clôt la doléance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                doleanceARegler && mutationReglee.mutate(doleanceARegler)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
