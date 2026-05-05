"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type StationAvecRelations,
} from "@/services/adminService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";

type StationStatus = Database["public"]["Enums"]["station_status"];

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<
  StationStatus,
  { label: string; className: string }
> = {
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

type ConfirmAction = {
  station: StationAvecRelations;
  newStatus: StationStatus;
  label: string;
};

export function AdminStationsPage() {
  const { compte } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StationStatus | "tous">(
    "tous",
  );
  const [partenaireFilter, setPartenaireFilter] = useState<string>("tous");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [motifRejet, setMotifRejet] = useState("");

  const statutPourApi = statusFilter === "tous" ? undefined : statusFilter;
  const partenairePourApi =
    partenaireFilter === "tous" ? undefined : partenaireFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stations", page, statusFilter, partenaireFilter],
    queryFn: () =>
      adminService.getAllStations(
        page,
        PAGE_SIZE,
        statutPourApi,
        partenairePourApi,
      ),
  });

  const { data: partenaires } = useQuery({
    queryKey: ["admin-partenaires"],
    queryFn: () => adminService.getPartenaires(),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({
      id,
      status,
      motif,
    }: {
      id: string;
      status: StationStatus;
      motif?: string;
    }) =>
      adminService.updateStationStatus(
        id,
        status,
        status === "validee" ? (compte?.id ?? undefined) : undefined,
        motif,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-stations-en-attente"] });
      toast.success(
        `Station ${confirmAction?.label.toLowerCase()} avec succès`,
      );
      setConfirmAction(null);
      setMotifRejet("");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const stations = data?.data ?? [];
  const total = data?.count ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  return (
    <PageContainer>
      <PageHeader
        title="Stations"
        description="Gestion de toutes les stations du réseau"
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter((v ?? "tous") as StationStatus | "tous");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="validee">Validée</SelectItem>
            <SelectItem value="suspendue">Suspendue</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={partenaireFilter}
          onValueChange={(v) => {
            setPartenaireFilter(v ?? "tous");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les partenaires">
              {partenaireFilter !== "tous"
                ? (partenaires ?? []).find((p) => p.id === partenaireFilter)
                    ?.nom
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les partenaires</SelectItem>
            {(partenaires ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "tous" || partenaireFilter !== "tous") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("tous");
              setPartenaireFilter("tous");
              setPage(0);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : stations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune station trouvée"
          description="Aucune station ne correspond aux filtres sélectionnés."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((s) => {
                  const cfg = STATUS_CONFIG[s.status];
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nom}</TableCell>
                      <TableCell>
                        {s.entreprises?.nom ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.partenaires?.nom ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {s.adresse ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === "en_attente" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() =>
                                setConfirmAction({
                                  station: s,
                                  newStatus: "validee",
                                  label: "Valider",
                                })
                              }
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Valider
                            </Button>
                          )}
                          {s.status === "validee" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() =>
                                setConfirmAction({
                                  station: s,
                                  newStatus: "suspendue",
                                  label: "Suspendre",
                                })
                              }
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Suspendre
                            </Button>
                          )}
                          {s.status === "suspendue" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() =>
                                setConfirmAction({
                                  station: s,
                                  newStatus: "validee",
                                  label: "Réactiver",
                                })
                              }
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Réactiver
                            </Button>
                          )}
                        </div>
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
              {total} station{total > 1 ? "s" : ""} au total
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

      {/* Motif de rejet dialog — suspendue */}
      <Dialog
        open={!!confirmAction && confirmAction.newStatus === "suspendue"}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmAction(null);
            setMotifRejet("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspendre la station</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Suspension de{" "}
            <span className="font-medium">{confirmAction?.station.nom}</span>.
            Veuillez saisir le motif obligatoire.
          </p>
          <div className="space-y-1.5">
            <Textarea
              placeholder="Motif de suspension..."
              rows={3}
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmAction(null);
                setMotifRejet("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!motifRejet.trim() || updateStatusMut.isPending}
              onClick={() => {
                if (!confirmAction) return;
                updateStatusMut.mutate({
                  id: confirmAction.station.id,
                  status: confirmAction.newStatus,
                  motif: motifRejet.trim(),
                });
              }}
            >
              Confirmer la suspension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog — validation / réactivation */}
      <ConfirmDialog
        open={!!confirmAction && confirmAction.newStatus !== "suspendue"}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={`${confirmAction?.label} la station`}
        description={
          confirmAction?.newStatus === "validee" &&
          confirmAction?.station.status === "en_attente"
            ? `Valider la station "${confirmAction?.station.nom}" ? Elle sera accessible aux gérants.`
            : `Réactiver la station "${confirmAction?.station.nom}" ?`
        }
        confirmLabel={confirmAction?.label ?? "Confirmer"}
        variant="default"
        onConfirm={() => {
          if (!confirmAction) return;
          updateStatusMut.mutate({
            id: confirmAction.station.id,
            status: confirmAction.newStatus,
          });
        }}
        loading={updateStatusMut.isPending}
      />
    </PageContainer>
  );
}
