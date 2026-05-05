"use client";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
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
import { Label } from "@/components/ui/label";
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
import { articleService } from "@/services/articleService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Loader2,
  Package,
  Plus,
  Search,
  Settings,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const supabase = createClient();

// La colonne DB s'appelle "famille" (pas famille_produit)
type Famille =
  | "lubrifiants"
  | "gpl"
  | "marchandises_generales"
  | "pieces_accessoires"
  | "services";

// Familles avec libellés (source : Guide Document)
const FAMILLES: {
  value: Famille;
  label: string;
  hasCategorieOption: boolean;
}[] = [
  { value: "lubrifiants", label: "Lubrifiants", hasCategorieOption: false },
  { value: "gpl", label: "GPL", hasCategorieOption: false },
  {
    value: "marchandises_generales",
    label: "Marchandises générales",
    hasCategorieOption: true,
  },
  {
    value: "pieces_accessoires",
    label: "Pièces & accessoires autos",
    hasCategorieOption: true,
  },
  { value: "services", label: "Services", hasCategorieOption: false },
];

const articleSchema = z.object({
  famille: z.enum([
    "lubrifiants",
    "gpl",
    "marchandises_generales",
    "pieces_accessoires",
    "services",
  ]),
  categorie_id: z.string().optional(),
  nom: z.string().min(2, "Nom requis (min 2 caractères)"),
  unite: z.string().min(1, "Unité requise"),
  conditionnement: z.string().optional(),
  code_barres: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleSchema>;

const categorieSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  famille: z.enum(["marchandises_generales", "pieces_accessoires"]),
});

type CategorieFormData = z.infer<typeof categorieSchema>;

interface Article {
  id: string;
  famille: string;
  nom: string;
  unite: string;
  conditionnement: string | null;
  code_barres: string | null;
  is_active: boolean;
  categorie_id: string | null;
}

export function StructureArticlesPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("lubrifiants");
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [categorieDialogOpen, setCategorieDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["articles-all", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("entreprise_id", entreprise.id)
        .order("nom");
      if (error) throw error;
      return (data ?? []) as Article[];
    },
    enabled: !!entreprise?.id,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", entreprise?.id],
    queryFn: () =>
      entreprise ? articleService.getCategories(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const articleForm = useForm<ArticleFormData>({
    resolver: zodResolver(
      articleSchema,
    ) as import("react-hook-form").Resolver<ArticleFormData>,
    defaultValues: {
      famille: "lubrifiants",
      nom: "",
      unite: "unité",
      conditionnement: "",
      code_barres: "",
    },
  });

  const categorieForm = useForm<CategorieFormData>({
    resolver: zodResolver(
      categorieSchema,
    ) as import("react-hook-form").Resolver<CategorieFormData>,
    defaultValues: {
      nom: "",
      famille: "marchandises_generales",
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: (data: ArticleFormData) => {
      if (!entreprise) throw new Error("Session invalide");
      return articleService.createArticle({
        entreprise_id: entreprise.id,
        famille: data.famille,
        categorie_id: data.categorie_id || null,
        nom: data.nom,
        unite: data.unite,
        conditionnement: data.conditionnement || null,
        code_barres: data.code_barres || null,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-all"] });
      toast.success("Article créé avec succès");
      articleForm.reset();
      setArticleDialogOpen(false);
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  const updateArticleMutation = useMutation({
    mutationFn: (data: ArticleFormData) => {
      if (!editingArticle) throw new Error("Article manquant");
      return articleService.updateArticle(editingArticle.id, {
        famille: data.famille,
        categorie_id: data.categorie_id || null,
        nom: data.nom,
        unite: data.unite,
        conditionnement: data.conditionnement || null,
        code_barres: data.code_barres || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-all"] });
      toast.success("Article mis à jour");
      setEditingArticle(null);
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("articles")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["articles-all"] });
      toast.success(vars.is_active ? "Article activé" : "Article désactivé");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => articleService.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-all"] });
      toast.success("Article archivé");
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error((error as Error).message);
      setDeletingId(null);
    },
  });

  const createCategorieMutation = useMutation({
    mutationFn: (data: CategorieFormData) => {
      if (!entreprise) throw new Error("Session invalide");
      return articleService.createCategorie({
        entreprise_id: entreprise.id,
        nom: data.nom,
        famille: data.famille,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie créée avec succès");
      categorieForm.reset();
      setCategorieDialogOpen(false);
    },
    onError: (error) => toast.error("Erreur : " + (error as Error).message),
  });

  const watchedFamille = articleForm.watch("famille");
  const familleCategoriesOptions = (categories ?? []).filter(
    (c) => c.famille === watchedFamille,
  );
  const selectedFamilleInfo = FAMILLES.find((f) => f.value === watchedFamille);

  const openEditDialog = (article: Article) => {
    setEditingArticle(article);
    articleForm.reset({
      famille: article.famille as Famille,
      nom: article.nom,
      unite: article.unite,
      conditionnement: article.conditionnement ?? "",
      code_barres: article.code_barres ?? "",
      categorie_id: article.categorie_id ?? undefined,
    });
  };

  const handleArticleSubmit = (data: ArticleFormData) => {
    if (editingArticle) {
      updateArticleMutation.mutate(data);
    } else {
      createArticleMutation.mutate(data);
    }
  };

  const getFilteredArticles = (famille: string) =>
    (articles ?? []).filter((a) => {
      if (a.famille !== famille) return false;
      if (!showInactive && !a.is_active) return false;
      if (
        searchQuery &&
        !a.nom.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });

  if (articlesLoading || categoriesLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Articles & Produits"
        description="Gérez votre catalogue d'articles (Lubrifiants, GPL, Marchandises, Pièces, Services)"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingArticle(null);
              articleForm.reset({
                famille: (activeTab as Famille) ?? "lubrifiants",
                nom: "",
                unite: "unité",
                conditionnement: "",
                code_barres: "",
              });
              setArticleDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvel article
          </Button>
        }
      />

      {/* Article dialog (create + edit) */}
      <Dialog
        open={articleDialogOpen || !!editingArticle}
        onOpenChange={(open) => {
          if (!open) {
            setArticleDialogOpen(false);
            setEditingArticle(null);
            articleForm.reset();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Modifier l'article" : "Nouvel article"}
            </DialogTitle>
          </DialogHeader>
          <Form {...articleForm}>
            <form
              onSubmit={articleForm.handleSubmit(handleArticleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={articleForm.control}
                name="famille"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Famille *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FAMILLES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedFamilleInfo?.hasCategorieOption &&
                familleCategoriesOptions.length > 0 && (
                  <FormField
                    control={articleForm.control}
                    name="categorie_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sans catégorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {familleCategoriesOptions.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nom}
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
                control={articleForm.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'article" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={articleForm.control}
                  name="unite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité *</FormLabel>
                      <FormControl>
                        <Input placeholder="unité, L, kg..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={articleForm.control}
                  name="conditionnement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conditionnement</FormLabel>
                      <FormControl>
                        <Input placeholder="carton 12u..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={articleForm.control}
                name="code_barres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code-barres</FormLabel>
                    <FormControl>
                      <Input placeholder="Scan ou saisie manuelle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setArticleDialogOpen(false);
                    setEditingArticle(null);
                    articleForm.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createArticleMutation.isPending ||
                    updateArticleMutation.isPending
                  }
                >
                  {(createArticleMutation.isPending ||
                    updateArticleMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingArticle ? "Enregistrer" : "Créer l'article"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Catégorie dialog */}
      <Dialog open={categorieDialogOpen} onOpenChange={setCategorieDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
          </DialogHeader>
          <Form {...categorieForm}>
            <form
              onSubmit={categorieForm.handleSubmit((d) =>
                createCategorieMutation.mutate(d),
              )}
              className="space-y-4"
            >
              <FormField
                control={categorieForm.control}
                name="famille"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Famille</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="marchandises_generales">
                          Marchandises générales
                        </SelectItem>
                        <SelectItem value="pieces_accessoires">
                          Pièces & accessoires
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categorieForm.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la catégorie</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Boissons, Huiles moteur..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={createCategorieMutation.isPending}
                className="w-full"
              >
                {createCategorieMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Créer la catégorie
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInactive((v) => !v)}
          className="gap-1.5"
        >
          {showInactive ? (
            <ToggleRight className="w-4 h-4 text-primary" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          {showInactive ? "Inactifs visibles" : "Actifs seulement"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="flex-wrap h-auto gap-1">
          {FAMILLES.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="text-xs">
              {f.label}
              <Badge variant="secondary" className="ml-1.5 text-xs py-0 px-1.5">
                {
                  (articles ?? []).filter(
                    (a) => a.famille === f.value && a.is_active,
                  ).length
                }
              </Badge>
            </TabsTrigger>
          ))}
          <TabsTrigger value="settings" className="text-xs">
            <Settings className="w-3.5 h-3.5 mr-1" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        {FAMILLES.map((f) => {
          const filtered = getFilteredArticles(f.value);
          return (
            <TabsContent key={f.value} value={f.value} className="mt-4">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title={`Aucun article dans ${f.label}`}
                  description={
                    searchQuery
                      ? "Aucun résultat pour cette recherche."
                      : "Créez votre premier article avec le bouton ci-dessus."
                  }
                />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {f.hasCategorieOption && (
                              <TableHead>Catégorie</TableHead>
                            )}
                            <TableHead>Nom</TableHead>
                            <TableHead>Unité</TableHead>
                            <TableHead>Conditionnement</TableHead>
                            <TableHead>Code-barres</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((article) => {
                            const cat = f.hasCategorieOption
                              ? (categories ?? []).find(
                                  (c) => c.id === article.categorie_id,
                                )
                              : null;
                            return (
                              <TableRow
                                key={article.id}
                                className={
                                  !article.is_active ? "opacity-50" : ""
                                }
                              >
                                {f.hasCategorieOption && (
                                  <TableCell className="text-sm text-muted-foreground">
                                    {cat?.nom ?? "—"}
                                  </TableCell>
                                )}
                                <TableCell className="font-medium">
                                  {article.nom}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {article.unite}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {article.conditionnement ?? "—"}
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">
                                  {article.code_barres ?? "—"}
                                </TableCell>
                                <TableCell>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleStatusMutation.mutate({
                                        id: article.id,
                                        is_active: !article.is_active,
                                      })
                                    }
                                    title={
                                      article.is_active
                                        ? "Cliquer pour désactiver"
                                        : "Cliquer pour activer"
                                    }
                                  >
                                    <Badge
                                      variant={
                                        article.is_active
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="cursor-pointer hover:opacity-80"
                                    >
                                      {article.is_active ? "Actif" : "Inactif"}
                                    </Badge>
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => openEditDialog(article)}
                                      title="Modifier"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeletingId(article.id)}
                                      title="Archiver"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
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
            </TabsContent>
          );
        })}

        {/* Settings tab — categories management */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base font-semibold">
                    Catégories d&apos;articles
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Disponibles pour Marchandises générales et Pièces &
                    accessoires
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCategorieDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nouvelle catégorie
                </Button>
              </div>
              {(categories ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucune catégorie créée.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Famille</TableHead>
                      <TableHead>Articles actifs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(categories ?? []).map((cat) => {
                      const famille = FAMILLES.find(
                        (f) => f.value === cat.famille,
                      );
                      const count = (articles ?? []).filter(
                        (a) => a.categorie_id === cat.id && a.is_active,
                      ).length;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">
                            {cat.nom}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {famille?.label ?? cat.famille}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{count}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Archiver cet article ?"
        description="L'article sera marqué inactif et n'apparaîtra plus dans les formulaires de vente/achat."
        confirmLabel="Archiver"
        variant="destructive"
        loading={deleteArticleMutation.isPending}
        onConfirm={() => deletingId && deleteArticleMutation.mutate(deletingId)}
      />
    </PageContainer>
  );
}
