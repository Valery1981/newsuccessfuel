"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, PowerOff, Truck } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  camionService,
  type CamionAvecCompartiments,
} from "@/services/camionService";
import { useAuthStore } from "@/stores/authStore";

const compartimentSchema = z.object({
  numero: z.number().int().positive(),
  volume_max: z.number().positive("Volume requis"),
});

const camionSchema = z.object({
  numero_immat: z.string().min(2, "Immatriculation requise (min 2 caractères)"),
  transporteur: z.string().optional(),
  capacite_totale: z
    .number()
    .positive("Capacité doit être positive")
    .optional(),
  nombre_compartiments: z.number().int().min(1).max(20),
  compartiments: z.array(compartimentSchema),
});

type CamionFormData = z.infer<typeof camionSchema>;

function buildDefaultCompartiments(
  count: number,
): { numero: number; volume_max: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    numero: i + 1,
    volume_max: 0,
  }));
}

function CamionForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  defaultValues?: Partial<CamionFormData>;
  onSubmit: (data: CamionFormData) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const form = useForm<CamionFormData>({
    resolver: zodResolver(
      camionSchema,
    ) as import("react-hook-form").Resolver<CamionFormData>,
    defaultValues: {
      numero_immat: "",
      transporteur: "",
      nombre_compartiments: 1,
      compartiments: buildDefaultCompartiments(1),
      ...defaultValues,
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "compartiments",
  });

  const nbCompartiments = form.watch("nombre_compartiments");

  function handleNbCompartimentsChange(val: number) {
    const clamped = Math.max(1, Math.min(20, val));
    form.setValue("nombre_compartiments", clamped);
    const current = form.getValues("compartiments");
    const updated = Array.from({ length: clamped }, (_, i) => ({
      numero: i + 1,
      volume_max: current[i]?.volume_max ?? 0,
    }));
    replace(updated);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="numero_immat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immatriculation *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: MG 1234 AB" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transporteur"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transporteur</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nom du transporteur"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacite_totale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacité totale (L)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 30000"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre_compartiments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nb compartiments *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={field.value}
                    onChange={(e) =>
                      handleNbCompartimentsChange(Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {nbCompartiments > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Volume par compartiment (L)</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`compartiments.${index}.volume_max`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Compartiment {index + 1}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 10000"
                          value={f.value || ""}
                          onChange={(e) => f.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function StructureCamionsPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCamion, setEditCamion] = useState<CamionAvecCompartiments | null>(
    null,
  );
  const [toggleTarget, setToggleTarget] =
    useState<CamionAvecCompartiments | null>(null);

  const { data: camions, isLoading } = useQuery({
    queryKey: ["camions", entreprise?.id],
    queryFn: () =>
      entreprise ? camionService.getCamionsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: CamionFormData) => {
      if (!entreprise) throw new Error("Session invalide");
      return camionService.createCamion(
        {
          entreprise_id: entreprise.id,
          numero_immat: data.numero_immat,
          transporteur: data.transporteur || null,
          capacite_totale: data.capacite_totale ?? null,
          nombre_compartiments: data.nombre_compartiments,
          is_active: true,
        },
        data.compartiments,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camions"] });
      toast.success("Camion ajouté avec succès");
      setCreateOpen(false);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CamionFormData) => {
      if (!editCamion) throw new Error("Aucun camion sélectionné");
      return camionService.updateCamion(
        editCamion.id,
        {
          numero_immat: data.numero_immat,
          transporteur: data.transporteur || null,
          capacite_totale: data.capacite_totale ?? null,
          nombre_compartiments: data.nombre_compartiments,
        },
        data.compartiments,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camions"] });
      toast.success("Camion modifié avec succès");
      setEditCamion(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const toggleMutation = useMutation({
    mutationFn: (camion: CamionAvecCompartiments) =>
      camionService.toggleActive(camion.id, !camion.is_active),
    onSuccess: (_, camion) => {
      queryClient.invalidateQueries({ queryKey: ["camions"] });
      toast.success(camion.is_active ? "Camion désactivé" : "Camion activé");
      setToggleTarget(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Camions & Véhicules"
        description="Gérez votre flotte de camions et leurs compartiments"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un camion
          </Button>
        }
      />

      {/* Dialog création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau camion</DialogTitle>
          </DialogHeader>
          <CamionForm
            onSubmit={(data) => createMutation.mutate(data)}
            isPending={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog modification */}
      <Dialog
        open={!!editCamion}
        onOpenChange={(o) => {
          if (!o) setEditCamion(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le camion</DialogTitle>
          </DialogHeader>
          {editCamion && (
            <CamionForm
              defaultValues={{
                numero_immat: editCamion.numero_immat,
                transporteur: editCamion.transporteur ?? "",
                capacite_totale: editCamion.capacite_totale ?? undefined,
                nombre_compartiments:
                  editCamion.nombre_compartiments ?? undefined,
                compartiments: editCamion.compartiments,
              }}
              onSubmit={(data) => updateMutation.mutate(data)}
              isPending={updateMutation.isPending}
              onCancel={() => setEditCamion(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation toggle */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(o) => {
          if (!o) setToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? "Désactiver" : "Activer"} ce camion ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? `Le camion ${toggleTarget?.numero_immat} sera marqué comme inactif.`
                : `Le camion ${toggleTarget?.numero_immat} sera remis en service.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                toggleTarget && toggleMutation.mutate(toggleTarget)
              }
              disabled={toggleMutation.isPending}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contenu */}
      {!camions || camions.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Aucun camion enregistré"
          description="Ajoutez votre premier camion pour gérer les réceptions de carburant."
          action={{
            label: "Ajouter un camion",
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Immatriculation</TableHead>
                    <TableHead>Transporteur</TableHead>
                    <TableHead className="text-right">Capacité (L)</TableHead>
                    <TableHead className="text-right">Compartiments</TableHead>
                    <TableHead>Détail compartiments</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {camions.map((camion) => (
                    <TableRow key={camion.id}>
                      <TableCell className="font-medium font-mono">
                        {camion.numero_immat}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {camion.transporteur ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {camion.capacite_totale != null
                          ? camion.capacite_totale.toLocaleString("fr-FR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {camion.nombre_compartiments}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {camion.compartiments.length > 0
                          ? camion.compartiments
                              .map(
                                (c) =>
                                  `C${c.numero}: ${c.volume_max.toLocaleString("fr-FR")}L`,
                              )
                              .join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={camion.is_active ? "default" : "secondary"}
                        >
                          {camion.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditCamion(camion)}
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setToggleTarget(camion)}
                            title={camion.is_active ? "Désactiver" : "Activer"}
                          >
                            {camion.is_active ? (
                              <PowerOff className="w-3.5 h-3.5 text-destructive" />
                            ) : (
                              <Power className="w-3.5 h-3.5 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
