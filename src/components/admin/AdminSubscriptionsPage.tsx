"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
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
  type AbonnementAvecRelations,
} from "@/services/adminService";

const PAGE_SIZE = 20;

const abonnementSchema = z.object({
  entreprise_id: z.string().min(1, "Entreprise requise"),
  partenaire_id: z.string().optional(),
  plan: z.string().min(1, "Plan requis"),
  montant: z.coerce.number().min(0).optional(),
  part_gerant: z.coerce.number().min(0).optional(),
  part_partenaire: z.coerce.number().min(0).optional(),
  date_debut: z.string().min(1, "Date de début requise"),
  date_fin: z.string().optional(),
});

type AbonnementForm = z.infer<typeof abonnementSchema>;

function getAbonnementStatut(ab: AbonnementAvecRelations): {
  label: string;
  className: string;
} {
  const now = new Date();
  const debut = new Date(ab.date_debut);
  const fin = ab.date_fin ? new Date(ab.date_fin) : null;
  if (!ab.is_active) {
    return { label: "Inactif", className: "bg-gray-100 text-gray-600" };
  }
  if (isAfter(debut, now)) {
    return { label: "À venir", className: "bg-orange-100 text-orange-700" };
  }
  if (fin && isBefore(fin, now)) {
    return { label: "Expiré", className: "bg-red-100 text-red-700" };
  }
  return { label: "Actif", className: "bg-green-100 text-green-700" };
}

export function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [editTarget, setEditTarget] = useState<AbonnementAvecRelations | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-abonnements", page, activeFilter],
    queryFn: () =>
      adminService.getAllAbonnements(
        page,
        PAGE_SIZE,
        activeFilter === "" ? undefined : activeFilter === "true",
      ),
  });

  const { data: entreprises } = useQuery({
    queryKey: ["admin-entreprises"],
    queryFn: () => adminService.getAllEntreprises(),
  });

  const { data: partenaires } = useQuery({
    queryKey: ["admin-partenaires"],
    queryFn: () => adminService.getPartenaires(),
  });

  const createMut = useMutation({
    mutationFn: (d: AbonnementForm) =>
      adminService.createAbonnement({
        entreprise_id: d.entreprise_id,
        partenaire_id: d.partenaire_id || undefined,
        plan: d.plan,
        montant: d.montant,
        part_gerant: d.part_gerant,
        part_partenaire: d.part_partenaire,
        date_debut: d.date_debut,
        date_fin: d.date_fin || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-abonnements"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Abonnement créé avec succès");
      setCreateOpen(false);
      createForm.reset();
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data: d,
    }: {
      id: string;
      data: Partial<AbonnementForm>;
    }) =>
      adminService.updateAbonnement(id, {
        plan: d.plan,
        montant: d.montant,
        part_gerant: d.part_gerant,
        part_partenaire: d.part_partenaire,
        date_fin: d.date_fin || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-abonnements"] });
      toast.success("Abonnement mis à jour");
      setEditTarget(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const createForm = useForm<AbonnementForm>({
    resolver: zodResolver(abonnementSchema) as Resolver<AbonnementForm>,
    defaultValues: {
      entreprise_id: "",
      partenaire_id: "",
      plan: "standard",
      date_debut: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const editForm = useForm<AbonnementForm>({
    resolver: zodResolver(abonnementSchema) as Resolver<AbonnementForm>,
  });

  const openEdit = (ab: AbonnementAvecRelations) => {
    setEditTarget(ab);
    editForm.reset({
      entreprise_id: ab.entreprise_id ?? "",
      partenaire_id: ab.partenaire_id ?? "",
      plan: ab.plan,
      montant: ab.montant ?? undefined,
      part_gerant: ab.part_gerant ?? undefined,
      part_partenaire: ab.part_partenaire ?? undefined,
      date_debut: ab.date_debut,
      date_fin: ab.date_fin ?? undefined,
    });
  };

  const abonnements = data?.data ?? [];
  const total = data?.count ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  const AbonnementFormFields = ({
    form,
    disableEntreprise = false,
  }: {
    form: ReturnType<typeof useForm<AbonnementForm>>;
    disableEntreprise?: boolean;
  }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="entreprise_id"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Entreprise *</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={disableEntreprise}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise">
                    {(entreprises ?? []).find((e) => e.id === field.value)?.nom}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(entreprises ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
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
        name="partenaire_id"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Partenaire co-financeur (optionnel)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun">
                    {field.value
                      ? (partenaires ?? []).find((p) => p.id === field.value)
                          ?.nom
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="">Aucun</SelectItem>
                {(partenaires ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
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
        name="plan"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Plan *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="montant"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Montant (Ar)</FormLabel>
            <FormControl>
              <Input type="number" min={0} placeholder="0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="part_gerant"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Part gérant (Ar)</FormLabel>
            <FormControl>
              <Input type="number" min={0} placeholder="0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="part_partenaire"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Part partenaire (Ar)</FormLabel>
            <FormControl>
              <Input type="number" min={0} placeholder="0" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="date_debut"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date début *</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="date_fin"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date fin</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Abonnements"
        description="Gestion des abonnements entreprises"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvel abonnement
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex gap-3">
        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v as "" | "true" | "false");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="true">Actifs</SelectItem>
            <SelectItem value="false">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : abonnements.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucun abonnement"
          description="Aucun abonnement ne correspond aux filtres sélectionnés."
          action={{
            label: "Créer un abonnement",
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Part gérant</TableHead>
                  <TableHead>Part partenaire</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abonnements.map((ab) => {
                  const statut = getAbonnementStatut(ab);
                  return (
                    <TableRow key={ab.id}>
                      <TableCell className="font-medium">
                        {ab.entreprises?.nom ?? "—"}
                      </TableCell>
                      <TableCell>{ab.partenaires?.nom ?? "—"}</TableCell>
                      <TableCell className="capitalize">{ab.plan}</TableCell>
                      <TableCell>
                        {ab.montant != null
                          ? `${ab.montant.toLocaleString("fr-FR")} Ar`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {ab.part_gerant != null
                          ? `${ab.part_gerant.toLocaleString("fr-FR")} Ar`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {ab.part_partenaire != null
                          ? `${ab.part_partenaire.toLocaleString("fr-FR")} Ar`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(ab.date_debut), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ab.date_fin
                          ? format(new Date(ab.date_fin), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statut.className}>
                          {statut.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(ab)}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
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
              {total} abonnement{total > 1 ? "s" : ""} au total
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

      {/* Dialog création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un abonnement</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((d) => createMut.mutate(d))}
              className="space-y-4"
            >
              <AbonnementFormFields form={createForm} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog modification */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;abonnement</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => {
                if (!editTarget) return;
                updateMut.mutate({ id: editTarget.id, data: d });
              })}
              className="space-y-4"
            >
              <AbonnementFormFields form={editForm} disableEntreprise />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updateMut.isPending}>
                  {updateMut.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
