"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stationService } from "@/services/stationService";
import { tiersService } from "@/services/tiersService";
import { useAuthStore } from "@/stores/authStore";
import type { TiersType } from "@/types/supabase";

const fournisseurSchema = z.object({
  nom: z.string().min(2, "Nom minimum 2 caractères"),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  nif: z.string().optional(),
  stat: z.string().optional(),
  sin: z.string().optional(),
  rcs: z.string().optional(),
  station_id: z.string().optional(),
  is_partenaire_carburant: z.boolean().default(false),
});
type FournisseurFormData = z.infer<typeof fournisseurSchema>;

const clientSchema = z.object({
  nom: z.string().min(2, "Nom minimum 2 caractères"),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  nif: z.string().optional(),
  stat: z.string().optional(),
  rcs: z.string().optional(),
  station_id: z.string().optional(),
  credit_autorise: z.boolean().default(false),
});
type ClientFormData = z.infer<typeof clientSchema>;

const employeSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  poste: z.string().optional(),
  date_embauche: z.string().optional(),
  matricule: z.string().optional(),
  cin: z.string().optional(),
  reference_employe: z.string().optional(),
  statut_employe: z.enum(["actif", "suspendu", "sorti"]).default("actif"),
  station_id: z.string().optional(),
});
type EmployeFormData = z.infer<typeof employeSchema>;

const TAB_ICONS = {
  fournisseur: Building2,
  client: UserCheck,
  employe: Users,
};

const TAB_LABELS = {
  fournisseur: "Fournisseurs",
  client: "Clients",
  employe: "Employés",
};

// ── Shared station type ───────────────────────────────────────────────────────

interface Station {
  id: string;
  nom: string;
}

// ── TiersTable ────────────────────────────────────────────────────────────────

interface TiersTableProps {
  type: TiersType;
  entrepriseId: string;
}

function TiersTable({ type, entrepriseId }: TiersTableProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: tiersList, isLoading } = useQuery({
    queryKey: ["tiers", entrepriseId, type],
    queryFn: () => tiersService.getTiersByEntreprise(entrepriseId, type),
  });

  const { data: stations } = useQuery({
    queryKey: ["stations", entrepriseId],
    queryFn: () => stationService.getStationsByEntreprise(entrepriseId),
    enabled: !!entrepriseId,
  });

  const hasMultipleStations = (stations ?? []).length > 1;

  const deleteMutation = useMutation({
    mutationFn: tiersService.deleteTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers", entrepriseId] });
      toast.success("Tiers supprimé");
      setDeletingId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <PageLoading />;

  const Icon = TAB_ICONS[type];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {type === "employe"
            ? "Nouvel employé"
            : type === "client"
              ? "Nouveau client"
              : "Nouveau fournisseur"}
        </Button>
      </div>

      {type === "fournisseur" && (
        <FournisseurDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          entrepriseId={entrepriseId}
          stations={stations ?? []}
          hasMultipleStations={hasMultipleStations}
        />
      )}
      {type === "client" && (
        <ClientDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          entrepriseId={entrepriseId}
          stations={stations ?? []}
          hasMultipleStations={hasMultipleStations}
        />
      )}
      {type === "employe" && (
        <EmployeDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          entrepriseId={entrepriseId}
          stations={stations ?? []}
          hasMultipleStations={hasMultipleStations}
        />
      )}

      {!tiersList?.length ? (
        <EmptyState
          icon={Icon}
          title={`Aucun ${type} enregistré`}
          description={`Ajoutez votre premier ${type === "employe" ? "employé" : type}`}
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                {type === "fournisseur" && <TableHead>Partenaire</TableHead>}
                {type === "client" && <TableHead>Crédit</TableHead>}
                {type === "employe" && (
                  <>
                    <TableHead>Poste</TableHead>
                    <TableHead>Statut</TableHead>
                  </>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tiersList ?? []).map((tiers) => (
                <TableRow key={tiers.id}>
                  <TableCell className="font-medium">{tiers.nom}</TableCell>
                  <TableCell>{tiers.telephone ?? "—"}</TableCell>
                  <TableCell>{tiers.email ?? "—"}</TableCell>
                  {type === "fournisseur" && (
                    <TableCell>
                      {tiers.is_partenaire_carburant ? (
                        <Badge className="bg-amber-100 text-amber-800">
                          Partenaire carburant
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {type === "client" && (
                    <TableCell>
                      {tiers.credit_autorise ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          Crédit OK
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {type === "employe" && (
                    <>
                      <TableCell>{tiers.poste ?? "—"}</TableCell>
                      <TableCell>
                        <StatutBadge
                          statut={
                            (tiers as { statut_employe?: string })
                              .statut_employe
                          }
                        />
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(tiers.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Supprimer ce tiers ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  );
}

// ── Helper badge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut?: string }) {
  if (!statut || statut === "actif")
    return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
  if (statut === "suspendu")
    return <Badge className="bg-yellow-100 text-yellow-800">Suspendu</Badge>;
  return <Badge className="bg-red-100 text-red-800">Sorti</Badge>;
}

// ── Dialog Fournisseur ────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entrepriseId: string;
  stations: Station[];
  hasMultipleStations: boolean;
}

function FournisseurDialog({
  open,
  onOpenChange,
  entrepriseId,
  stations,
  hasMultipleStations,
}: DialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FournisseurFormData>({
    resolver: zodResolver(
      fournisseurSchema,
    ) as import("react-hook-form").Resolver<FournisseurFormData>,
    defaultValues: { is_partenaire_carburant: false },
  });

  const mutation = useMutation({
    mutationFn: (data: FournisseurFormData) =>
      tiersService.createTiers({
        nom: data.nom,
        telephone: data.telephone,
        adresse: data.adresse,
        email: data.email,
        nif: data.nif,
        rib: data.stat,
        stat: data.stat,
        sin: data.sin,
        rcs: data.rcs,
        station_id: data.station_id || null,
        is_partenaire_carburant: data.is_partenaire_carburant,
        credit_autorise: false,
        entreprise_id: entrepriseId,
        type: "fournisseur" as TiersType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers", entrepriseId] });
      toast.success("Fournisseur créé");
      onOpenChange(false);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau fournisseur</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input {...register("nom")} placeholder="Raison sociale" />
              {errors.nom && (
                <p className="text-destructive text-xs">{errors.nom.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input {...register("telephone")} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input {...register("email")} type="email" />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Adresse</Label>
              <Input {...register("adresse")} />
            </div>
            <div className="col-span-2 pt-1 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Informations légales (optionnel)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">STAT</Label>
                  <Input {...register("stat")} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SIN</Label>
                  <Input {...register("sin")} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RCS</Label>
                  <Input {...register("rcs")} className="text-sm" />
                </div>
              </div>
            </div>
            {hasMultipleStations && (
              <div className="col-span-2 space-y-1">
                <Label>Station (optionnel — toutes si vide)</Label>
                <Select
                  onValueChange={(v: string | null) =>
                    setValue("station_id", !v || v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les stations</SelectItem>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                checked={watch("is_partenaire_carburant") ?? false}
                onCheckedChange={(v) => setValue("is_partenaire_carburant", v)}
              />
              <Label>Partenaire carburant (solde global)</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog Client ─────────────────────────────────────────────────────────────

function ClientDialog({
  open,
  onOpenChange,
  entrepriseId,
  stations,
  hasMultipleStations,
}: DialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(
      clientSchema,
    ) as import("react-hook-form").Resolver<ClientFormData>,
    defaultValues: { credit_autorise: false },
  });

  const mutation = useMutation({
    mutationFn: (data: ClientFormData) =>
      tiersService.createTiers({
        nom: data.nom,
        telephone: data.telephone,
        adresse: data.adresse,
        email: data.email,
        nif: data.nif,
        stat: data.stat,
        rcs: data.rcs,
        station_id: data.station_id || null,
        credit_autorise: data.credit_autorise,
        is_partenaire_carburant: false,
        entreprise_id: entrepriseId,
        type: "client" as TiersType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers", entrepriseId] });
      toast.success("Client créé");
      onOpenChange(false);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input {...register("nom")} placeholder="Nom ou raison sociale" />
              {errors.nom && (
                <p className="text-destructive text-xs">{errors.nom.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input {...register("telephone")} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input {...register("email")} type="email" />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Adresse</Label>
              <Input {...register("adresse")} />
            </div>
            <div className="col-span-2 pt-1 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Informations légales (optionnel)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">NIF</Label>
                  <Input {...register("nif")} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">STAT</Label>
                  <Input {...register("stat")} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RCS</Label>
                  <Input {...register("rcs")} className="text-sm" />
                </div>
              </div>
            </div>
            {hasMultipleStations && (
              <div className="col-span-2 space-y-1">
                <Label>Station rattachée (optionnel)</Label>
                <Select
                  onValueChange={(v: string | null) =>
                    setValue("station_id", !v || v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les stations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les stations</SelectItem>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                checked={watch("credit_autorise") ?? false}
                onCheckedChange={(v) => setValue("credit_autorise", v)}
              />
              <Label>Crédit autorisé</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog Employé ────────────────────────────────────────────────────────────

function EmployeDialog({
  open,
  onOpenChange,
  entrepriseId,
  stations,
  hasMultipleStations,
}: DialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeFormData>({
    resolver: zodResolver(
      employeSchema,
    ) as import("react-hook-form").Resolver<EmployeFormData>,
    defaultValues: { statut_employe: "actif" },
  });

  const mutation = useMutation({
    mutationFn: (data: EmployeFormData) =>
      tiersService.createTiers({
        nom: data.prenom ? `${data.nom} ${data.prenom}` : data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        adresse: data.adresse,
        email: data.email,
        poste: data.poste,
        date_embauche: data.date_embauche,
        matricule: data.matricule,
        cin: data.cin,
        reference_employe: data.reference_employe,
        statut_employe: data.statut_employe,
        station_id: data.station_id || null,
        credit_autorise: false,
        is_partenaire_carburant: false,
        entreprise_id: entrepriseId,
        type: "employe" as TiersType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers", entrepriseId] });
      toast.success("Employé créé");
      onOpenChange(false);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel employé</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input {...register("nom")} placeholder="Nom de famille" />
              {errors.nom && (
                <p className="text-destructive text-xs">{errors.nom.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Prénom</Label>
              <Input {...register("prenom")} placeholder="Prénom" />
            </div>
            <div className="space-y-1">
              <Label>Téléphone</Label>
              <Input {...register("telephone")} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input {...register("email")} type="email" />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Poste</Label>
              <Input
                {...register("poste")}
                placeholder="Pompiste, Caissière..."
              />
            </div>
            <div className="space-y-1">
              <Label>Date d&apos;embauche</Label>
              <Input {...register("date_embauche")} type="date" />
            </div>
            <div className="space-y-1">
              <Label>Matricule</Label>
              <Input {...register("matricule")} placeholder="EMP-001" />
            </div>
            <div className="space-y-1">
              <Label>CIN</Label>
              <Input {...register("cin")} placeholder="N° pièce d'identité" />
            </div>
            <div className="space-y-1">
              <Label>Référence</Label>
              <Input {...register("reference_employe")} />
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select
                defaultValue="actif"
                onValueChange={(v: string | null) =>
                  setValue(
                    "statut_employe",
                    (v ?? "actif") as "actif" | "suspendu" | "sorti",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                  <SelectItem value="sorti">Sorti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasMultipleStations && (
              <div className="col-span-2 space-y-1">
                <Label>Station rattachée</Label>
                <Select
                  onValueChange={(v: string | null) =>
                    setValue("station_id", v ?? "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export function StructureTiersPage() {
  const { entreprise } = useAuthStore();

  if (!entreprise) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Tiers"
        description="Gérez vos fournisseurs, clients et employés"
      />
      <Tabs defaultValue="fournisseur">
        <TabsList>
          {(["fournisseur", "client", "employe"] as TiersType[]).map((type) => {
            const Icon = TAB_ICONS[type];
            return (
              <TabsTrigger key={type} value={type} className="gap-2">
                <Icon className="w-4 h-4" />
                {TAB_LABELS[type]}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {(["fournisseur", "client", "employe"] as TiersType[]).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <TiersTable type={type} entrepriseId={entreprise.id} />
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
}
