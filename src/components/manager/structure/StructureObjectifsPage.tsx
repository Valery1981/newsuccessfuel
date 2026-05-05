"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { articleService } from "@/services/articleService";
import { objectifService } from "@/services/objectifService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";

const CARBURANT_TYPES = [
  { value: "SP95", label: "SP95" },
  { value: "SP91", label: "SP91" },
  { value: "GO", label: "Gasoil" },
  { value: "Petrole", label: "Pétrole lampant" },
];

type ObjectifType = "carburant_global" | "carburant_specifique" | "boutique_ca";

const objectifSchema = z
  .object({
    station_id: z.string().min(1, "Station requise"),
    type: z.enum(["carburant_global", "carburant_specifique", "boutique_ca"]),
    type_carburant: z.string().optional(),
    valeur: z.number().positive("Valeur doit être positive"),
    periode_debut: z.string().min(1, "Date de début requise"),
    periode_fin: z.string().min(1, "Date de fin requise"),
  })
  .refine(
    (data) => data.type !== "carburant_specifique" || !!data.type_carburant,
    { message: "Type de carburant requis", path: ["type_carburant"] },
  )
  .refine((data) => data.periode_debut <= data.periode_fin, {
    message: "La fin doit être après le début",
    path: ["periode_fin"],
  });

type ObjectifFormData = z.infer<typeof objectifSchema>;

const seuilSchema = z.object({
  article_id: z.string().min(1, "Article requis"),
  station_id: z.string().min(1, "Station requise"),
  seuil_minimum: z.number().positive("Seuil doit être positif"),
});

type SeuilFormData = z.infer<typeof seuilSchema>;

const TYPE_LABELS: Record<ObjectifType, string> = {
  carburant_global: "Volume global carburant",
  carburant_specifique: "Volume carburant spécifique",
  boutique_ca: "CA Boutique",
};

function formatPeriode(debut: string, fin: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(debut)} → ${fmt(fin)}`;
}

// ─── Onglet Objectifs ────────────────────────────────────────────────────────

function ObjectifsTab({ entrepriseId }: { entrepriseId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: stations } = useQuery({
    queryKey: ["stations", entrepriseId],
    queryFn: () => stationService.getStationsByEntreprise(entrepriseId),
  });

  const stationIds = (stations ?? []).map((s) => s.id);

  const { data: objectifs, isLoading } = useQuery({
    queryKey: ["objectifs", entrepriseId],
    queryFn: () => objectifService.getObjectifsByStations(stationIds),
    enabled: stationIds.length > 0,
  });

  const [objectifDefaultValues] = useState<ObjectifFormData>(() => ({
    station_id: "",
    type: "carburant_global",
    type_carburant: undefined,
    valeur: 0,
    periode_debut: new Date().toISOString().split("T")[0],
    periode_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  }));

  const form = useForm<ObjectifFormData>({
    resolver: zodResolver(
      objectifSchema,
    ) as import("react-hook-form").Resolver<ObjectifFormData>,
    defaultValues: objectifDefaultValues,
  });

  const watchedType = useWatch({ control: form.control, name: "type" });

  const createMutation = useMutation({
    mutationFn: (data: ObjectifFormData) =>
      objectifService.createObjectif({
        station_id: data.station_id,
        type: data.type,
        type_carburant:
          data.type === "carburant_specifique"
            ? (data.type_carburant ?? null)
            : null,
        valeur: data.valeur,
        periode_debut: data.periode_debut,
        periode_fin: data.periode_fin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectifs"] });
      toast.success("Objectif créé avec succès");
      form.reset();
      setCreateOpen(false);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => objectifService.deleteObjectif(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectifs"] });
      toast.success("Objectif supprimé");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un objectif
        </Button>
      </div>

      {/* Dialog création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel objectif</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="station_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une station">
                            {
                              (stations ?? []).find((s) => s.id === field.value)
                                ?.nom
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(stations ?? []).map((s) => (
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d&apos;objectif *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="carburant_global">
                          Volume global carburant (L)
                        </SelectItem>
                        <SelectItem value="carburant_specifique">
                          Volume carburant spécifique (L)
                        </SelectItem>
                        <SelectItem value="boutique_ca">
                          CA Boutique (MGA)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedType === "carburant_specifique" && (
                <FormField
                  control={form.control}
                  name="type_carburant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de carburant *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner...">
                              {
                                CARBURANT_TYPES.find(
                                  (c) => c.value === (field.value ?? ""),
                                )?.label
                              }
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CARBURANT_TYPES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="valeur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valeur *{" "}
                      <span className="text-muted-foreground font-normal text-xs">
                        ({watchedType === "boutique_ca" ? "MGA" : "litres"})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 50000"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="periode_debut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Début *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="periode_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? "Enregistrement..."
                    : "Créer l'objectif"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget)
              }
              disabled={deleteMutation.isPending}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <PageLoading />
      ) : !objectifs || objectifs.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucun objectif défini"
          description="Définissez des objectifs de volume ou de chiffre d'affaires par station et par période."
          action={{
            label: "Ajouter un objectif",
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
                    <TableHead>Station</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Carburant</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objectifs.map((obj) => {
                    const station = (stations ?? []).find(
                      (s) => s.id === obj.station_id,
                    );
                    const objType = obj.type as ObjectifType;
                    const unite = obj.type === "boutique_ca" ? "MGA" : "L";
                    return (
                      <TableRow key={obj.id}>
                        <TableCell className="font-medium">
                          {station?.nom ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[objType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {obj.type_carburant ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {obj.type === "boutique_ca"
                            ? formatCurrency(obj.valeur)
                            : `${obj.valeur.toLocaleString("fr-FR")} ${unite}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatPeriode(obj.periode_debut, obj.periode_fin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(obj.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
    </>
  );
}

// ─── Onglet Seuils d'alerte ──────────────────────────────────────────────────

function SeuilsTab({ entrepriseId }: { entrepriseId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: stations } = useQuery({
    queryKey: ["stations", entrepriseId],
    queryFn: () => stationService.getStationsByEntreprise(entrepriseId),
  });

  const { data: articles } = useQuery({
    queryKey: ["articles-non-service", entrepriseId],
    queryFn: async () => {
      const all = await articleService.getArticlesByEntreprise(entrepriseId);
      return all.filter((a) => a.famille !== "services");
    },
    enabled: !!entrepriseId,
  });

  const { data: seuils, isLoading } = useQuery({
    queryKey: ["seuils-alerte", entrepriseId],
    queryFn: () => objectifService.getSeuilsByEntreprise(entrepriseId),
  });

  const form = useForm<SeuilFormData>({
    resolver: zodResolver(
      seuilSchema,
    ) as import("react-hook-form").Resolver<SeuilFormData>,
    defaultValues: { article_id: "", station_id: "", seuil_minimum: 0 },
  });

  const upsertMutation = useMutation({
    mutationFn: (data: SeuilFormData) =>
      objectifService.upsertSeuil({
        article_id: data.article_id,
        station_id: data.station_id,
        seuil_minimum: data.seuil_minimum,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seuils-alerte"] });
      toast.success("Seuil d'alerte enregistré");
      form.reset();
      setCreateOpen(false);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => objectifService.deleteSeuil(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seuils-alerte"] });
      toast.success("Seuil supprimé");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Définir un seuil
        </Button>
      </div>

      {/* Dialog création/modification */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seuil d&apos;alerte stock</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => upsertMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="article_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un article">
                            {
                              (articles ?? []).find((a) => a.id === field.value)
                                ?.nom
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(articles ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nom}{" "}
                            <span className="text-muted-foreground text-xs">
                              ({a.unite})
                            </span>
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
                name="station_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une station">
                            {
                              (stations ?? []).find((s) => s.id === field.value)
                                ?.nom
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(stations ?? []).map((s) => (
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
                name="seuil_minimum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil minimum *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 50"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Une alerte sera déclenchée si le stock descend en dessous
                      de cette valeur.
                    </p>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer ce seuil d&apos;alerte ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Plus aucune alerte ne sera émise pour cet article dans cette
              station.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget)
              }
              disabled={deleteMutation.isPending}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <PageLoading />
      ) : !seuils || seuils.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucun seuil d'alerte défini"
          description="Définissez des seuils minimum pour être alerté lorsque le stock est bas."
          action={{
            label: "Définir un seuil",
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
                    <TableHead>Article</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead className="text-right">Seuil minimum</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seuils.map((s) => {
                    const art = s.article;
                    const sta = s.station;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {art?.nom ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {art?.unite ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sta?.nom ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {s.seuil_minimum.toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(s.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
    </>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export function StructureObjectifsPage() {
  const { entreprise } = useAuthStore();

  if (!entreprise) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Objectifs & Seuils d'alerte"
        description="Définissez les objectifs de performance et les seuils de stock minimum par station"
      />

      <Tabs defaultValue="objectifs" className="mt-2">
        <TabsList>
          <TabsTrigger value="objectifs" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Objectifs
          </TabsTrigger>
          <TabsTrigger value="seuils" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Seuils d&apos;alerte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="objectifs" className="mt-4">
          <ObjectifsTab entrepriseId={entreprise.id} />
        </TabsContent>

        <TabsContent value="seuils" className="mt-4">
          <SeuilsTab entrepriseId={entreprise.id} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
