"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Fuel, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateTypeCarburant,
  useDeleteTypeCarburant,
  useToggleTypeCarburantActif,
  useTypesCarburant,
  useUpdateTypeCarburant,
} from "@/hooks/useTypesCarburant";
import type { TypeCarburantRow } from "@/services/typesCarburantService";
import { createClient } from "@/utils/supabase/client";

const SCOPE_GLOBAL = "__global__";

const schema = z.object({
  code: z
    .string()
    .min(2, "Code requis (min 2 caractères)")
    .max(30)
    .regex(/^[A-Z0-9_]+$/i, "Lettres, chiffres et _ uniquement"),
  label: z.string().min(2, "Libellé requis").max(60),
  partenaire_scope: z.string().min(1, "Sélectionne un scope"),
  compte_stock: z.string().min(2, "Compte stock requis (ex: 310)"),
  compte_vente: z.string().min(2, "Compte vente requis (ex: 701)"),
  ordre: z.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

interface PartenaireOption {
  id: string;
  nom: string;
}

export function AdminTypesCarburantPage() {
  const supabase = useMemo(() => createClient(), []);
  const { data: types, isLoading } = useTypesCarburant();
  const createMut = useCreateTypeCarburant();
  const updateMut = useUpdateTypeCarburant();
  const toggleMut = useToggleTypeCarburantActif();
  const deleteMut = useDeleteTypeCarburant();

  const { data: partenaires } = useQuery<PartenaireOption[]>({
    queryKey: ["admin-partenaires-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partenaires")
        .select("id, nom")
        .eq("is_active", true)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as PartenaireOption[];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TypeCarburantRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TypeCarburantRow | null>(
    null,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      label: "",
      partenaire_scope: SCOPE_GLOBAL,
      compte_stock: "310",
      compte_vente: "701",
      ordre: 0,
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      code: "",
      label: "",
      partenaire_scope: SCOPE_GLOBAL,
      compte_stock: "310",
      compte_vente: "701",
      ordre: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (row: TypeCarburantRow) => {
    setEditing(row);
    form.reset({
      code: row.code,
      label: row.label,
      partenaire_scope: row.partenaire_id ?? SCOPE_GLOBAL,
      compte_stock: row.compte_stock,
      compte_vente: row.compte_vente,
      ordre: row.ordre ?? 0,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const partenaire_id =
      values.partenaire_scope === SCOPE_GLOBAL ? null : values.partenaire_scope;
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          input: {
            code: values.code,
            label: values.label,
            partenaire_id,
            compte_stock: values.compte_stock,
            compte_vente: values.compte_vente,
            ordre: values.ordre,
          },
        });
        toast.success("Type de carburant mis à jour");
      } else {
        await createMut.mutateAsync({
          code: values.code,
          label: values.label,
          partenaire_id,
          compte_stock: values.compte_stock,
          compte_vente: values.compte_vente,
          ordre: values.ordre,
        });
        toast.success("Type de carburant créé");
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(msg);
    }
  };

  const onToggle = async (row: TypeCarburantRow) => {
    try {
      await toggleMut.mutateAsync({ id: row.id, actif: !row.actif });
      toast.success(row.actif ? "Type désactivé" : "Type activé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const onConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success("Type supprimé");
      setConfirmDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(`Suppression impossible : ${msg}`);
    }
  };

  const partenaireNom = (id: string | null) => {
    if (!id) return null;
    return partenaires?.find((p) => p.id === id)?.nom ?? id;
  };

  const globaux = (types ?? []).filter((t) => !t.partenaire_id);
  const specifiques = (types ?? []).filter((t) => t.partenaire_id);

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Types de carburant"
        description="Référentiel global et personnalisations par partenaire"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Nouveau type
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">
          Types globaux ({globaux.length})
        </h2>
        {globaux.length === 0 ? (
          <EmptyState
            icon={Fuel}
            title="Aucun type global"
            description="Les types globaux sont visibles par tous les partenaires."
          />
        ) : (
          <TypesTable
            rows={globaux}
            partenaireNom={partenaireNom}
            onEdit={openEdit}
            onToggle={onToggle}
            onDelete={setConfirmDelete}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">
          Types spécifiques partenaires ({specifiques.length})
        </h2>
        {specifiques.length === 0 ? (
          <EmptyState
            icon={Fuel}
            title="Aucun type spécifique"
            description="Crée un type partenaire-spécifique pour renommer un carburant uniquement pour ses stations."
          />
        ) : (
          <TypesTable
            rows={specifiques}
            partenaireNom={partenaireNom}
            onEdit={openEdit}
            onToggle={onToggle}
            onDelete={setConfirmDelete}
          />
        )}
      </section>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le type" : "Nouveau type de carburant"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="partenaire_scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SCOPE_GLOBAL}>
                          Global (tous partenaires)
                        </SelectItem>
                        {partenaires?.map((p) => (
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

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ESSENCE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Libellé</FormLabel>
                      <FormControl>
                        <Input placeholder="Essence" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="compte_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compte stock</FormLabel>
                      <FormControl>
                        <Input placeholder="310" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="compte_vente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compte vente</FormLabel>
                      <FormControl>
                        <Input placeholder="701" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ordre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordre</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {editing ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Supprimer ce type ?"
        description={
          confirmDelete
            ? `Le type "${confirmDelete.label}" sera supprimé définitivement. Cette action échouera si des cuves, pistolets ou prix l'utilisent encore.`
            : ""
        }
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
    </PageContainer>
  );
}

interface TypesTableProps {
  rows: TypeCarburantRow[];
  partenaireNom: (id: string | null) => string | null;
  onEdit: (row: TypeCarburantRow) => void;
  onToggle: (row: TypeCarburantRow) => void;
  onDelete: (row: TypeCarburantRow) => void;
}

function TypesTable({
  rows,
  partenaireNom,
  onEdit,
  onToggle,
  onDelete,
}: TypesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead>Partenaire</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Vente</TableHead>
            <TableHead className="text-center">Ordre</TableHead>
            <TableHead className="text-center">Actif</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge variant="outline">{row.code}</Badge>
              </TableCell>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {partenaireNom(row.partenaire_id) ?? "— Global —"}
              </TableCell>
              <TableCell className="text-center font-mono text-xs">
                {row.compte_stock}
              </TableCell>
              <TableCell className="text-center font-mono text-xs">
                {row.compte_vente}
              </TableCell>
              <TableCell className="text-center">{row.ordre}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={row.actif}
                  onCheckedChange={() => onToggle(row)}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(row)}
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggle(row)}
                  title={row.actif ? "Désactiver" : "Activer"}
                >
                  <Power className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete(row)}
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
