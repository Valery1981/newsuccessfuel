"use client";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const supabase = createClient();

type TmSession = {
  id: string;
  nom: string;
  email: string;
  status: string | null;
  zone_geo: string | null;
  droits: Record<string, boolean> | null;
  must_change_password: boolean;
  created_at: string | null;
};

type StationOption = { id: string; nom: string };

const PARTNER_PAGES = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "stations", label: "Stations" },
  { key: "grievances", label: "Doléances" },
  { key: "validations", label: "Validations" },
  { key: "reports", label: "Rapports" },
] as const;

const createSchema = z.object({
  nom: z.string().min(2, "Nom requis (min 2 caractères)"),
  email: z.string().email("Email invalide"),
  motDePasseTemp: z.string().min(8, "Min 8 caractères"),
});
type CreateForm = z.infer<typeof createSchema>;

const resetSchema = z.object({
  motDePasseTemp: z.string().min(8, "Min 8 caractères"),
});
type ResetForm = z.infer<typeof resetSchema>;

function parseZoneGeo(zone_geo: string | null): string[] {
  if (!zone_geo) return [];
  try {
    return JSON.parse(zone_geo) as string[];
  } catch {
    return [];
  }
}

function parseDroits(
  droits: Record<string, boolean> | null,
): Record<string, boolean> {
  if (!droits) return {};
  return droits;
}

export function PartnerUsersPage() {
  const { compte } = useAuthStore();
  const queryClient = useQueryClient();

  const [confirmDeactivate, setConfirmDeactivate] = useState<TmSession | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<TmSession | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TmSession | null>(null);
  const [resetTarget, setResetTarget] = useState<TmSession | null>(null);
  const [generatedPw, setGeneratedPw] = useState("");
  const [generatedResetPw, setGeneratedResetPw] = useState("");

  // Zone + droits for create/edit
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDroits, setSelectedDroits] = useState<Record<string, boolean>>(
    {},
  );

  const { data: sessions = [], isLoading } = useQuery<TmSession[]>({
    queryKey: ["partner-sessions", compte?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_utilisateurs")
        .select(
          "id, nom, email, status, zone_geo, droits, must_change_password, created_at",
        )
        .eq("compte_parent_id", compte!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s) => {
        const r = s as Record<string, unknown>;
        return {
          id: r.id as string,
          nom: r.nom as string,
          email: r.email as string,
          status: r.status as string | null,
          zone_geo: r.zone_geo as string | null,
          droits: r.droits as Record<string, boolean> | null,
          must_change_password: (r.must_change_password as boolean) ?? true,
          created_at: r.created_at as string | null,
        };
      });
    },
    enabled: !!compte?.id,
  });

  const { data: stations = [] } = useQuery<StationOption[]>({
    queryKey: ["partner-stations-options", compte?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stations")
        .select("id, nom")
        .eq("partenaire_id", compte!.id)
        .order("nom");
      return (data ?? []).map((s) => {
        const r = s as Record<string, unknown>;
        return { id: r.id as string, nom: r.nom as string };
      });
    },
    enabled: !!compte?.id,
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  function openCreate() {
    createForm.reset();
    setGeneratedPw("");
    setSelectedStations([]);
    const defaultDroits: Record<string, boolean> = {};
    PARTNER_PAGES.forEach((p) => {
      defaultDroits[p.key] = true;
    });
    setSelectedDroits(defaultDroits);
    setCreateOpen(true);
  }

  function openEdit(tm: TmSession) {
    setEditTarget(tm);
    setSelectedStations(parseZoneGeo(tm.zone_geo));
    setSelectedDroits(parseDroits(tm.droits));
  }

  const createMutation = useMutation({
    mutationFn: async (formData: CreateForm) => {
      const res = await fetch("/api/auth/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          poste: "Territory Manager",
          zone_geo: JSON.stringify(selectedStations),
          droits: selectedDroits,
        }),
        credentials: "same-origin",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur création session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-sessions"] });
      toast.success(
        "Territory Manager créé ! Il devra changer son mot de passe.",
      );
      setCreateOpen(false);
      createForm.reset();
      setGeneratedPw("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateZoneDroitsMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("sessions_utilisateurs")
        .update({
          zone_geo: JSON.stringify(selectedStations),
          droits: selectedDroits as unknown as import("@/types/supabase").Json,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-sessions"] });
      toast.success("Zone et droits mis à jour");
      setEditTarget(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      const { error } = await supabase
        .from("sessions_utilisateurs")
        .update({ status: activate ? "active" : "suspendue" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["partner-sessions"] });
      toast.success(vars.activate ? "Session réactivée" : "Session désactivée");
      setConfirmDeactivate(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sessions_utilisateurs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-sessions"] });
      toast.success("Session supprimée");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch("/api/auth/reset-session-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, newPassword: password }),
        credentials: "same-origin",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur reset mot de passe");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-sessions"] });
      toast.success("Mot de passe réinitialisé");
      setResetTarget(null);
      resetForm.reset();
      setGeneratedResetPw("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function toggleStation(id: string) {
    setSelectedStations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleDroit(key: string) {
    setSelectedDroits((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <PageContainer>
      <PageHeader
        title="Utilisateurs"
        description="Territory Managers — gestion des sessions et des droits d'accès"
        actions={
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nouveau TM
          </Button>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun Territory Manager"
          description="Créez des comptes Territory Manager pour déléguer la supervision de vos stations."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Zone (stations)</TableHead>
                    <TableHead>Droits</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((tm) => {
                    const zone = parseZoneGeo(tm.zone_geo);
                    const droits = parseDroits(tm.droits);
                    const activePages = PARTNER_PAGES.filter(
                      (p) => droits[p.key],
                    ).length;
                    const isActive = tm.status === "active";
                    return (
                      <TableRow
                        key={tm.id}
                        className={!isActive ? "opacity-60" : ""}
                      >
                        <TableCell className="font-medium text-sm">
                          {tm.nom}
                          {tm.must_change_password && (
                            <Badge
                              variant="outline"
                              className="ml-1.5 text-xs text-amber-600 border-amber-300"
                            >
                              MDP temp
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tm.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {zone.length === 0 ? (
                              <span className="text-muted-foreground text-xs">
                                Aucune station
                              </span>
                            ) : (
                              <span className="text-xs font-medium">
                                {zone.length} station
                                {zone.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Shield className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span className="text-xs">
                              {activePages}/{PARTNER_PAGES.length} pages
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              isActive
                                ? "bg-green-100 text-green-800 text-xs"
                                : "bg-red-100 text-red-800 text-xs"
                            }
                          >
                            {isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(tm.created_at ?? "")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(tm)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Zone &amp; droits
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setResetTarget(tm);
                                  resetForm.reset();
                                  setGeneratedResetPw("");
                                }}
                              >
                                <KeyRound className="w-4 h-4 mr-2" />
                                Réinitialiser MDP
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isActive ? (
                                <DropdownMenuItem
                                  className="text-amber-600"
                                  onClick={() => setConfirmDeactivate(tm)}
                                >
                                  <UserX className="w-4 h-4 mr-2" />
                                  Désactiver
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-700"
                                  onClick={() =>
                                    toggleStatusMutation.mutate({
                                      id: tm.id,
                                      activate: true,
                                    })
                                  }
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Réactiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setConfirmDelete(tm)}
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau Territory Manager</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input
                  {...createForm.register("nom")}
                  placeholder="Prénom Nom"
                />
                {createForm.formState.errors.nom && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.nom.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  {...createForm.register("email")}
                  placeholder="tm@reseau.com"
                  type="email"
                />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Mot de passe temporaire</Label>
              <div className="flex gap-2">
                <Input
                  {...createForm.register("motDePasseTemp")}
                  placeholder="Min 8 caractères"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const pw = nanoid(12);
                    setGeneratedPw(pw);
                    createForm.setValue("motDePasseTemp", pw);
                  }}
                  title="Générer"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {generatedPw && (
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {generatedPw}
                </p>
              )}
              {createForm.formState.errors.motDePasseTemp && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.motDePasseTemp.message}
                </p>
              )}
            </div>

            {/* Stations zone */}
            {stations.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Stations assignées (zone)
                </Label>
                <div className="grid grid-cols-2 gap-1.5 border rounded-md p-3 max-h-36 overflow-y-auto">
                  {stations.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`create-st-${s.id}`}
                        checked={selectedStations.includes(s.id)}
                        onCheckedChange={() => toggleStation(s.id)}
                      />
                      <label
                        htmlFor={`create-st-${s.id}`}
                        className="text-xs cursor-pointer"
                      >
                        {s.nom}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Droits */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Droits d&apos;accès par page
              </Label>
              <div className="grid grid-cols-2 gap-1.5 border rounded-md p-3">
                {PARTNER_PAGES.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`create-droit-${p.key}`}
                      checked={!!selectedDroits[p.key]}
                      onCheckedChange={() => toggleDroit(p.key)}
                    />
                    <label
                      htmlFor={`create-droit-${p.key}`}
                      className="text-xs cursor-pointer"
                    >
                      {p.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Créer le Territory Manager
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Zone & Droits Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zone &amp; droits — {editTarget?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {stations.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Stations assignées
                </Label>
                <div className="grid grid-cols-2 gap-1.5 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {stations.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-st-${s.id}`}
                        checked={selectedStations.includes(s.id)}
                        onCheckedChange={() => toggleStation(s.id)}
                      />
                      <label
                        htmlFor={`edit-st-${s.id}`}
                        className="text-xs cursor-pointer"
                      >
                        {s.nom}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Droits d&apos;accès
              </Label>
              <div className="grid grid-cols-2 gap-1.5 border rounded-md p-3">
                {PARTNER_PAGES.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-droit-${p.key}`}
                      checked={!!selectedDroits[p.key]}
                      onCheckedChange={() => toggleDroit(p.key)}
                    />
                    <label
                      htmlFor={`edit-droit-${p.key}`}
                      className="text-xs cursor-pointer"
                    >
                      {p.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() =>
                editTarget &&
                updateZoneDroitsMutation.mutate({ id: editTarget.id })
              }
              disabled={updateZoneDroitsMutation.isPending}
            >
              {updateZoneDroitsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Réinitialiser MDP — {resetTarget?.nom}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={resetForm.handleSubmit(
              (d) =>
                resetTarget &&
                resetPasswordMutation.mutate({
                  id: resetTarget.id,
                  password: d.motDePasseTemp,
                }),
            )}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe temporaire</Label>
              <div className="flex gap-2">
                <Input {...resetForm.register("motDePasseTemp")} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const pw = nanoid(12);
                    setGeneratedResetPw(pw);
                    resetForm.setValue("motDePasseTemp", pw);
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {resetForm.formState.errors.motDePasseTemp && (
                <p className="text-xs text-destructive">
                  {resetForm.formState.errors.motDePasseTemp.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Réinitialiser
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Désactiver cette session ?"
        description={`La session de "${confirmDeactivate?.nom}" sera suspendue.`}
        confirmLabel="Désactiver"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeactivate)
            toggleStatusMutation.mutate({
              id: confirmDeactivate.id,
              activate: false,
            });
        }}
        loading={toggleStatusMutation.isPending}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Supprimer la session"
        description={`Supprimer définitivement la session de ${confirmDelete?.nom} ? Action irréversible.`}
        onConfirm={() => {
          if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
        }}
        loading={deleteMutation.isPending}
        confirmLabel="Supprimer"
        variant="destructive"
      />
    </PageContainer>
  );
}
