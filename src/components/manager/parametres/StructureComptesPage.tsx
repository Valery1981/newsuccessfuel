"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// APEX 2026-05-15-01 : lecture via vue_plan_comptable_complet
// Source agrégée : plan_comptable_standard + plan_comptable_entreprise + tiers (401/411/421/460) + tresoreries (512/513/514/530)
type CompteSource =
  | "standard"
  | "entreprise"
  | "tiers"
  | "tiers_460"
  | "tresorerie";

interface CompteRow {
  id: string;
  numero: string;
  libelle: string;
  classe: number;
  is_centralisateur: boolean;
  numero_parent: string | null;
  is_modifiable: boolean;
  source: CompteSource;
  entreprise_id: string | null;
}

interface CompteNode {
  source: CompteSource;
  id: string;
  numero: string;
  libelle: string;
  is_centralisateur: boolean;
  numero_parent: string | null;
  classe: number;
  is_modifiable: boolean;
  sousComptes: CompteNode[];
}

const CLASS_LABELS: Record<number, string> = {
  1: "Classe 1 — Comptes de capitaux",
  2: "Classe 2 — Comptes d'immobilisations",
  3: "Classe 3 — Comptes de stocks",
  4: "Classe 4 — Comptes de tiers",
  5: "Classe 5 — Comptes de trésorerie",
  6: "Classe 6 — Comptes de charges",
  7: "Classe 7 — Comptes de produits",
};

const EDITABLE_CLASSES = [1, 2];

const sousCompteSchema = z.object({
  libelle: z.string().min(2, "Libellé requis (min 2 caractères)"),
});

type SousCompteFormData = z.infer<typeof sousCompteSchema>;

function buildTree(rows: CompteRow[]): CompteNode[] {
  // Index par numero pour lookups parent/enfant. En cas de doublon (très rare),
  // on privilégie la source 'entreprise' > 'standard' > tiers/trésorerie.
  const priority: Record<CompteSource, number> = {
    entreprise: 4,
    standard: 3,
    tiers: 2,
    tiers_460: 2,
    tresorerie: 2,
  };
  const nodesByNumero = new Map<string, CompteNode>();

  for (const c of rows) {
    const existing = nodesByNumero.get(c.numero);
    if (existing && priority[existing.source] >= priority[c.source]) continue;
    nodesByNumero.set(c.numero, {
      source: c.source,
      id: c.id,
      numero: c.numero,
      libelle: c.libelle,
      is_centralisateur: c.is_centralisateur,
      numero_parent: c.numero_parent,
      classe: c.classe,
      is_modifiable: c.is_modifiable,
      sousComptes: [],
    });
  }

  const roots: CompteNode[] = [];

  for (const node of nodesByNumero.values()) {
    if (node.numero_parent && nodesByNumero.has(node.numero_parent)) {
      nodesByNumero.get(node.numero_parent)!.sousComptes.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of nodesByNumero.values()) {
    node.sousComptes.sort((a, b) => a.numero.localeCompare(b.numero));
  }
  roots.sort((a, b) => a.numero.localeCompare(b.numero));

  return roots;
}

function CompteRow({
  node,
  depth,
  canEdit,
  onAddSousCompte,
  onDelete,
}: {
  node: CompteNode;
  depth: number;
  canEdit: boolean;
  onAddSousCompte: (node: CompteNode) => void;
  onDelete?: (node: CompteNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.sousComptes.length > 0;

  return (
    <>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors ${depth === 0 ? "font-semibold" : ""}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 inline-block" />
        )}

        <span className="flex-1 text-sm">{node.libelle}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {node.is_centralisateur && (
            <Badge variant="outline" className="text-xs py-0 h-5">
              <Layers className="w-3 h-3 mr-1" />
              Centralisateur
            </Badge>
          )}
          {node.source === "entreprise" && (
            <Badge variant="secondary" className="text-xs py-0 h-5">
              Personnalisé
            </Badge>
          )}
          {node.source === "tiers" && (
            <Badge variant="secondary" className="text-xs py-0 h-5">
              Tiers
            </Badge>
          )}
          {node.source === "tiers_460" && (
            <Badge variant="outline" className="text-xs py-0 h-5">
              Resp. opérationnelle
            </Badge>
          )}
          {node.source === "tresorerie" && (
            <Badge variant="secondary" className="text-xs py-0 h-5">
              Trésorerie
            </Badge>
          )}
          {canEdit && node.is_modifiable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onAddSousCompte(node)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Sous-compte
            </Button>
          )}
          {onDelete &&
            node.source === "entreprise" &&
            node.sousComptes.length === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(node)}
                title="Supprimer ce sous-compte (solde nul requis)"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
        </div>
      </div>

      {expanded &&
        node.sousComptes.map((child) => (
          <CompteRow
            key={child.id}
            node={child}
            depth={depth + 1}
            canEdit={canEdit}
            onAddSousCompte={onAddSousCompte}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

export function StructureComptesPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeClass, setActiveClass] = useState("1");
  const [dialogParent, setDialogParent] = useState<CompteNode | null>(null);
  const [deletingNode, setDeletingNode] = useState<CompteNode | null>(null);

  // APEX 2026-05-15-01 : lecture unique via vue agrégée (filtre RLS hérite des tables sources)
  const { data: comptes, isLoading: comptesLoading } = useQuery({
    queryKey: ["plan-comptable-complet", entreprise?.id],
    queryFn: async () => {
      const query = supabase
        .from("vue_plan_comptable_complet")
        .select("*")
        .order("numero");
      // Filtrer : standard (entreprise_id null) OR entreprise courante
      const filter = entreprise?.id
        ? query.or(`entreprise_id.is.null,entreprise_id.eq.${entreprise.id}`)
        : query.is("entreprise_id", null);
      const { data, error } = await filter;
      if (error) throw error;
      return (data ?? []) as unknown as CompteRow[];
    },
  });

  const form = useForm<SousCompteFormData>({
    resolver: zodResolver(
      sousCompteSchema,
    ) as import("react-hook-form").Resolver<SousCompteFormData>,
    defaultValues: { libelle: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SousCompteFormData) => {
      if (!entreprise || !dialogParent) throw new Error("Session invalide");

      const { data: genNumero, error: rpcError } = await supabase.rpc(
        "generer_numero_sous_compte",
        {
          p_entreprise_id: entreprise.id,
          p_numero_parent: dialogParent.numero,
        },
      );
      if (rpcError) throw rpcError;

      const { error } = await supabase
        .from("plan_comptable_entreprise")
        .insert({
          entreprise_id: entreprise.id,
          numero: genNumero as string,
          numero_parent: dialogParent.numero,
          libelle: data.libelle,
          classe: dialogParent.classe,
          is_centralisateur: false,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["plan-comptable-complet"],
      });
      toast.success("Sous-compte ajouté avec succès");
      form.reset();
      setDialogParent(null);
    },
    onError: (err) => toast.error("Erreur : " + (err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (node: CompteNode) => {
      const { count } = await supabase
        .from("lignes_ecriture")
        .select("id", { count: "exact", head: true })
        .eq("numero_compte", node.numero);
      if ((count ?? 0) > 0)
        throw new Error("Ce compte a des mouvements — impossible de supprimer");
      const { error } = await supabase
        .from("plan_comptable_entreprise")
        .delete()
        .eq("id", node.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["plan-comptable-complet"],
      });
      toast.success("Sous-compte supprimé");
      setDeletingNode(null);
    },
    onError: (err) => {
      toast.error((err as Error).message);
      setDeletingNode(null);
    },
  });

  if (comptesLoading) return <PageLoading />;

  const allComptes = comptes ?? [];

  const classeNumbers = [1, 2, 3, 4, 5, 6, 7];

  return (
    <PageContainer>
      <PageHeader
        title="Plan Comptable"
        description="Consultez le plan comptable standard. Personnalisez les classes 1 et 2 en ajoutant des sous-comptes."
      />

      {/* Dialog ajout sous-compte */}
      <Dialog
        open={!!dialogParent}
        onOpenChange={(o) => {
          if (!o) {
            setDialogParent(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un sous-compte</DialogTitle>
          </DialogHeader>
          {dialogParent && (
            <div className="mb-4 p-3 bg-muted rounded-md text-sm">
              <span className="text-muted-foreground">Compte parent : </span>
              <span className="font-medium">{dialogParent.libelle}</span>
              <p className="text-xs text-muted-foreground mt-1">
                Le numéro sera généré automatiquement.
              </p>
            </div>
          )}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="libelle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé du sous-compte *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Matériels de bureau" {...field} />
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
                    setDialogParent(null);
                    form.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Enregistrement..." : "Ajouter"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Tabs value={activeClass} onValueChange={setActiveClass} className="mt-2">
        <TabsList className="flex-wrap h-auto gap-1">
          {classeNumbers.map((n) => (
            <TabsTrigger key={n} value={String(n)} className="text-xs">
              Classe {n}
              {!EDITABLE_CLASSES.includes(n) && (
                <Lock className="w-3 h-3 ml-1 opacity-50" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {classeNumbers.map((n) => {
          const canEdit = EDITABLE_CLASSES.includes(n);
          const classeRows = allComptes.filter((c) => c.classe === n);
          const tree = buildTree(classeRows);

          return (
            <TabsContent key={n} value={String(n)} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      {CLASS_LABELS[n]}
                    </CardTitle>
                    {!canEdit && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Lecture seule
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {tree.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Aucun compte dans cette classe.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {tree.map((node) => (
                        <CompteRow
                          key={node.id}
                          node={node}
                          depth={0}
                          canEdit={canEdit}
                          onAddSousCompte={setDialogParent}
                          onDelete={canEdit ? setDeletingNode : undefined}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
      <ConfirmDialog
        open={!!deletingNode}
        onOpenChange={(open) => !open && setDeletingNode(null)}
        title="Supprimer ce sous-compte ?"
        description={`"${deletingNode?.libelle}" sera supprimé définitivement. Le solde doit être nul et aucun mouvement ne doit exister.`}
        confirmLabel="Supprimer"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deletingNode && deleteMutation.mutate(deletingNode)}
      />
    </PageContainer>
  );
}
