"use client";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { UserPermissionsModal } from "@/components/manager/permissions/UserPermissionsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  MoreHorizontal,
  Plus,
  RefreshCw,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const supabase = createClient();

type SessionRow = {
  id: string;
  nom: string;
  email: string;
  status: string | null;
  poste: string | null;
  must_change_password: boolean;
  created_at: string | null;
};

const createSchema = z.object({
  nom: z.string().min(2, "Nom requis (min 2 caractères)"),
  email: z.string().email("Email invalide"),
  poste: z.string().optional(),
  motDePasseTemp: z.string().min(8, "Min 8 caractères"),
});
type CreateForm = z.infer<typeof createSchema>;

const resetSchema = z.object({
  motDePasseTemp: z.string().min(8, "Min 8 caractères"),
});
type ResetForm = z.infer<typeof resetSchema>;

export function ManagerUsersPage() {
  const { compte } = useAuthStore();
  const queryClient = useQueryClient();

  const [confirmDeactivate, setConfirmDeactivate] = useState<SessionRow | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<SessionRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<SessionRow | null>(null);
  const [generatedPw, setGeneratedPw] = useState("");
  const [generatedResetPw, setGeneratedResetPw] = useState("");
  const [permissionsTarget, setPermissionsTarget] = useState<SessionRow | null>(
    null,
  );

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions", compte?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_utilisateurs")
        .select(
          "id, nom, email, status, poste, must_change_password, created_at",
        )
        .eq("compte_parent_id", compte!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SessionRow[];
    },
    enabled: !!compte?.id,
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const motDePasseTemp = useWatch({
    control: createForm.control,
    name: "motDePasseTemp",
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      const res = await fetch("/api/auth/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur création session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(
        "Session créée ! L'employé devra changer son mot de passe.",
      );
      setCreateOpen(false);
      createForm.reset();
      setGeneratedPw("");
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
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
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
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session supprimée");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const resetMotDePasseTemp = useWatch({
    control: resetForm.control,
    name: "motDePasseTemp",
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetForm) => {
      if (!resetTarget) return;
      const res = await fetch("/api/auth/reset-session-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: resetTarget.id,
          motDePasseTemp: data.motDePasseTemp,
        }),
        credentials: "same-origin",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur réinitialisation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(
        "Mot de passe réinitialisé — l'employé devra le changer à sa prochaine connexion.",
      );
      setResetTarget(null);
      resetForm.reset();
      setGeneratedResetPw("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Sessions Employés"
        description="Créez et gérez les accès de vos employés à l'application"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle session
          </Button>
        }
      />

      {!sessions || sessions.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune session employé"
          description="Créez une session pour donner accès à un employé."
        />
      ) : (
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{s.nom}</span>
                        {s.must_change_password && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] w-fit"
                          >
                            Changement mdp requis
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.poste ?? "—"}
                    </TableCell>
                    <TableCell>
                      {s.status === "active" ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Suspendu</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.created_at ? formatDate(s.created_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setResetTarget(s);
                              resetForm.reset();
                              setGeneratedResetPw("");
                            }}
                          >
                            <KeyRound className="w-4 h-4 mr-2" />
                            Réinitialiser mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {s.status === "active" ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmDeactivate(s)}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Désactiver
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: s.id,
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
                            onClick={() => setConfirmDelete(s)}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Session Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            createForm.reset();
            setGeneratedPw("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle session employé</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>
                Nom complet <span className="text-destructive">*</span>
              </Label>
              <Input
                {...createForm.register("nom")}
                placeholder="Jean Rakoto"
              />
              {createForm.formState.errors.nom && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.nom.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                {...createForm.register("email")}
                placeholder="jean@station.mg"
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Poste</Label>
              <Input
                {...createForm.register("poste")}
                placeholder="Pompiste, Caissier..."
              />
            </div>
            <div className="space-y-1">
              <Label>
                Mot de passe temporaire{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={generatedPw || motDePasseTemp || ""}
                  onChange={(e) => {
                    setGeneratedPw("");
                    createForm.setValue("motDePasseTemp", e.target.value);
                  }}
                  placeholder="Min 8 caractères"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Générer automatiquement"
                  onClick={() => {
                    const pw = nanoid(14);
                    setGeneratedPw(pw);
                    createForm.setValue("motDePasseTemp", pw);
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {createForm.formState.errors.motDePasseTemp && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.motDePasseTemp.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                L&apos;employé devra changer ce mot de passe à sa première
                connexion.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  createForm.reset();
                  setGeneratedPw("");
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Créer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            resetForm.reset();
            setGeneratedResetPw("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser — {resetTarget?.nom}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={resetForm.handleSubmit((d) => resetMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>
                Nouveau mot de passe temporaire{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={generatedResetPw || resetMotDePasseTemp || ""}
                  onChange={(e) => {
                    setGeneratedResetPw("");
                    resetForm.setValue("motDePasseTemp", e.target.value);
                  }}
                  placeholder="Min 8 caractères"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const pw = nanoid(14);
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetTarget(null);
                  resetForm.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={resetMutation.isPending}>
                {resetMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Réinitialiser
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Désactiver la session"
        description={`Désactiver l'accès de ${confirmDeactivate?.nom} ?`}
        onConfirm={() =>
          confirmDeactivate &&
          toggleStatusMutation.mutate({
            id: confirmDeactivate.id,
            activate: false,
          })
        }
        loading={toggleStatusMutation.isPending}
        confirmLabel="Désactiver"
        variant="destructive"
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Supprimer la session"
        description={`Supprimer définitivement la session de ${confirmDelete?.nom} ? Action irréversible.`}
        onConfirm={() =>
          confirmDelete && deleteMutation.mutate(confirmDelete.id)
        }
        loading={deleteMutation.isPending}
        confirmLabel="Supprimer"
        variant="destructive"
      />

      {permissionsTarget && (
        <UserPermissionsModal
          open={!!permissionsTarget}
          onClose={() => setPermissionsTarget(null)}
          sessionId={permissionsTarget.id}
          sessionNom={permissionsTarget.nom}
        />
      )}
    </PageContainer>
  );
}
