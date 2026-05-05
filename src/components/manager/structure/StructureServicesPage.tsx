"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Wrench, Pencil, PowerOff, Power } from "lucide-react";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuthStore } from "@/stores/authStore";
import { articleService } from "@/services/articleService";
import { stationService } from "@/services/stationService";
import { createClient } from "@/utils/supabase/client";
import { formatCurrency } from "@/lib/utils";

const supabase = createClient();

interface ArticleService {
  id: string;
  nom: string;
  unite: string;
  code_barres: string | null;
  is_active: boolean;
  created_at: string;
}

interface PrixVente {
  id: string;
  article_id: string | null;
  station_id: string | null;
  prix_vente: number;
  date_effet: string;
}

const serviceSchema = z.object({
  nom: z.string().min(2, "Nom requis (min 2 caractères)"),
  unite: z.string().min(1, "Unité requise"),
  code_barres: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

function PrixParStation({
  articleId,
  stations,
}: {
  articleId: string;
  stations: Array<{ id: string; nom: string }>;
}) {
  const queryClient = useQueryClient();

  const { data: prix } = useQuery({
    queryKey: ["prix-service", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prix_vente_articles")
        .select("*")
        .eq("article_id", articleId);
      if (error) throw error;
      return (data ?? []) as PrixVente[];
    },
  });

  const setPrixMutation = useMutation({
    mutationFn: ({ stationId, prix: p }: { stationId: string; prix: number }) =>
      articleService.setPrixVente(articleId, stationId, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prix-service", articleId] });
      toast.success("Prix enregistré");
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const [editingPrix, setEditingPrix] = useState<Record<string, string>>({});

  function getPrixForStation(stationId: string): number | null {
    const p = (prix ?? []).find((x) => x.station_id === stationId);
    return p ? p.prix_vente : null;
  }

  return (
    <div className="space-y-2">
      {stations.map((station) => {
        const current = getPrixForStation(station.id);
        const editing = editingPrix[station.id] ?? (current != null ? String(current) : "");
        return (
          <div key={station.id} className="flex items-center gap-3">
            <span className="text-sm flex-1 text-muted-foreground">{station.nom}</span>
            <Input
              type="number"
              className="w-32 h-7 text-sm"
              placeholder="Prix MGA"
              value={editing}
              onChange={(e) =>
                setEditingPrix((prev) => ({ ...prev, [station.id]: e.target.value }))
              }
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={!editing || setPrixMutation.isPending}
              onClick={() =>
                setPrixMutation.mutate({ stationId: station.id, prix: Number(editing) })
              }
            >
              OK
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function StructureServicesPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<ArticleService | null>(null);
  const [prixDialogService, setPrixDialogService] = useState<ArticleService | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ArticleService | null>(null);

  const { data: services, isLoading: svcLoading } = useQuery({
    queryKey: ["articles-services", entreprise?.id],
    queryFn: () =>
      entreprise ? articleService.getArticlesByEntreprise(entreprise.id, "services") : [],
    enabled: !!entreprise?.id,
  });

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () => (entreprise ? stationService.getStationsByEntreprise(entreprise.id) : []),
    enabled: !!entreprise?.id,
  });

  const { data: prixList } = useQuery({
    queryKey: ["prix-services-all", entreprise?.id],
    queryFn: async () => {
      if (!entreprise || !services || services.length === 0) return [];
      const ids = services.map((s) => s.id);
      const { data, error } = await supabase
        .from("prix_vente_articles")
        .select("*")
        .in("article_id", ids);
      if (error) throw error;
      return (data ?? []) as PrixVente[];
    },
    enabled: !!entreprise?.id && (services?.length ?? 0) > 0,
  });

  const createForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as import("react-hook-form").Resolver<ServiceFormData>,
    defaultValues: { nom: "", unite: "prestation", code_barres: "" },
  });

  const editForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as import("react-hook-form").Resolver<ServiceFormData>,
    defaultValues: { nom: "", unite: "prestation", code_barres: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: ServiceFormData) => {
      if (!entreprise) throw new Error("Session invalide");
      return articleService.createArticle({
        entreprise_id: entreprise.id,
        famille: "services",
        nom: data.nom,
        unite: data.unite,
        code_barres: data.code_barres || null,
        is_service: true,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-services"] });
      toast.success("Service créé avec succès");
      createForm.reset();
      setCreateOpen(false);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ServiceFormData) => {
      if (!editService) throw new Error("Aucun service sélectionné");
      return articleService.updateArticle(editService.id, {
        nom: data.nom,
        unite: data.unite,
        code_barres: data.code_barres || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-services"] });
      toast.success("Service modifié avec succès");
      setEditService(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (svc: ArticleService) => {
      const { error } = await supabase
        .from("articles")
        .update({ is_active: !svc.is_active })
        .eq("id", svc.id);
      if (error) throw error;
    },
    onSuccess: (_, svc) => {
      queryClient.invalidateQueries({ queryKey: ["articles-services"] });
      toast.success(svc.is_active ? "Service désactivé" : "Service activé");
      setToggleTarget(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  function openEdit(svc: ArticleService) {
    setEditService(svc);
    editForm.reset({ nom: svc.nom, unite: svc.unite, code_barres: svc.code_barres ?? "" });
  }

  function getPrixResume(articleId: string): string {
    const stationPrix = (prixList ?? []).filter((p) => p.article_id === articleId);
    if (stationPrix.length === 0) return "—";
    return stationPrix
      .map((p) => {
        const station = (stations ?? []).find((s) => s.id === p.station_id);
        return station ? `${station.nom}: ${formatCurrency(p.prix_vente)}` : formatCurrency(p.prix_vente);
      })
      .join(" · ");
  }

  if (svcLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Services"
        description="Gérez les services proposés dans vos stations (lavage, vulcanisation…)"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un service
          </Button>
        }
      />

      {/* Dialog création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau service</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du service *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Lavage voiture, Vulcanisation..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="unite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité *</FormLabel>
                    <FormControl>
                      <Input placeholder="prestation, heure..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="code_barres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code-barres</FormLabel>
                    <FormControl>
                      <Input placeholder="Optionnel" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Enregistrement..." : "Créer le service"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog modification */}
      <Dialog open={!!editService} onOpenChange={(o) => { if (!o) setEditService(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le service</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du service *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="unite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="code_barres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code-barres</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditService(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog prix par station */}
      <Dialog
        open={!!prixDialogService}
        onOpenChange={(o) => { if (!o) setPrixDialogService(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Prix par station — {prixDialogService?.nom}</DialogTitle>
          </DialogHeader>
          {prixDialogService && (stations ?? []).length > 0 ? (
            <PrixParStation
              articleId={prixDialogService.id}
              stations={stations ?? []}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune station configurée.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation toggle */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(o) => { if (!o) setToggleTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? "Désactiver" : "Activer"} ce service ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? `Le service "${toggleTarget?.nom}" ne sera plus disponible.`
                : `Le service "${toggleTarget?.nom}" sera remis en service.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleTarget && toggleMutation.mutate(toggleTarget)}
              disabled={toggleMutation.isPending}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contenu */}
      {!services || services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Aucun service configuré"
          description="Ajoutez vos premiers services (lavage, vulcanisation…) pour les intégrer au POS boutique."
          action={{ label: "Ajouter un service", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Code-barres</TableHead>
                    <TableHead>Prix (par station)</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium">{svc.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{svc.unite}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {svc.code_barres ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {getPrixResume(svc.id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={svc.is_active ? "default" : "secondary"}>
                          {svc.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setPrixDialogService(svc as unknown as ArticleService)}
                          >
                            Prix
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(svc as unknown as ArticleService)}
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setToggleTarget(svc as unknown as ArticleService)}
                            title={svc.is_active ? "Désactiver" : "Activer"}
                          >
                            {svc.is_active ? (
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
