"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, UserCheck, UserX, Eye } from "lucide-react";
import { format } from "date-fns";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { adminService, type CompteGerant, type PartenaireRow } from "@/services/adminService";

const partenaireSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  type: z.enum(["officiel", "non_officiel"]),
  contact_nom: z.string().optional(),
  contact_email: z
    .string()
    .min(1, "Email obligatoire (identifiant de connexion)")
    .email("Email invalide"),
  contact_telephone: z.string().optional(),
});

type PartenaireForm = z.infer<typeof partenaireSchema>;

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{
    type: "gerant" | "partenaire";
    id: string;
    nom: string;
    current: boolean;
  } | null>(null);
  const [detailPartenaire, setDetailPartenaire] = useState<PartenaireRow | null>(null);
  const [detailGerant, setDetailGerant] = useState<CompteGerant | null>(null);
  const [provisionalAccess, setProvisionalAccess] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const { data: gerants, isLoading: gerantsLoading } = useQuery({
    queryKey: ["admin-gerants"],
    queryFn: () => adminService.getGerants(),
  });

  const { data: partenaires, isLoading: partenairesLoading } = useQuery({
    queryKey: ["admin-partenaires"],
    queryFn: () => adminService.getPartenaires(),
  });

  const toggleGerantMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminService.updateCompteActif(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gerants"] });
      toast.success(
        confirmToggle?.current ? "Compte désactivé" : "Compte activé"
      );
      setConfirmToggle(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const togglePartenaireMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminService.updatePartenaireActif(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-partenaires"] });
      toast.success(
        confirmToggle?.current ? "Partenaire désactivé" : "Partenaire activé"
      );
      setConfirmToggle(null);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const createPartenaireMut = useMutation({
    mutationFn: (data: PartenaireForm) =>
      adminService.createPartenaire({
        nom: data.nom,
        type: data.type,
        contact_nom: data.contact_nom || undefined,
        contact_email: data.contact_email.trim(),
        contact_telephone: data.contact_telephone || undefined,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-partenaires"] });
      toast.success("Partenaire et compte créés");
      setCreateOpen(false);
      form.reset();
      setProvisionalAccess({
        email: res.loginEmail,
        password: res.oneTimePassword,
      });
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création"
      ),
  });

  const form = useForm<PartenaireForm>({
    resolver: zodResolver(partenaireSchema),
    defaultValues: { nom: "", type: "officiel", contact_nom: "", contact_email: "", contact_telephone: "" },
  });

  const filteredGerants = (gerants ?? []).filter(
    (g) =>
      g.nom.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPartenaires = (partenaires ?? []).filter(
    (p) =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      (p.contact_email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmToggle = () => {
    if (!confirmToggle) return;
    const newActive = !confirmToggle.current;
    if (confirmToggle.type === "gerant") {
      toggleGerantMut.mutate({ id: confirmToggle.id, is_active: newActive });
    } else {
      togglePartenaireMut.mutate({ id: confirmToggle.id, is_active: newActive });
    }
  };

  const isToggeling = toggleGerantMut.isPending || togglePartenaireMut.isPending;

  return (
    <PageContainer>
      <PageHeader
        title="Utilisateurs"
        description="Gestion des gérants et partenaires"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau partenaire
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="gerants">
        <TabsList>
          <TabsTrigger value="gerants">
            Gérants {gerants ? `(${gerants.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="partenaires">
            Partenaires {partenaires ? `(${partenaires.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerants" className="mt-4">
          {gerantsLoading ? (
            <PageLoading />
          ) : filteredGerants.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Aucun gérant trouvé"
              description="Aucun gérant ne correspond à votre recherche."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGerants.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.nom}</TableCell>
                      <TableCell>{g.email}</TableCell>
                      <TableCell>{g.telephone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={g.is_active ? "default" : "secondary"}
                          className={
                            g.is_active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-500"
                          }
                        >
                          {g.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(g.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDetailGerant(g)}
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setConfirmToggle({
                                type: "gerant",
                                id: g.id,
                                nom: g.nom,
                                current: g.is_active,
                              })
                            }
                            title={g.is_active ? "Désactiver" : "Activer"}
                          >
                            {g.is_active ? (
                              <UserX className="w-4 h-4 text-red-500" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="partenaires" className="mt-4">
          {partenairesLoading ? (
            <PageLoading />
          ) : filteredPartenaires.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Aucun partenaire trouvé"
              description="Aucun partenaire ne correspond à votre recherche."
              action={{ label: "Créer un partenaire", onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartenaires.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nom}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.type === "officiel"
                              ? "border-blue-300 text-blue-700"
                              : "border-gray-300 text-gray-600"
                          }
                        >
                          {p.type === "officiel" ? "Officiel" : "Non officiel"}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.contact_nom ?? "—"}</TableCell>
                      <TableCell>{p.contact_email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={p.is_active ? "default" : "secondary"}
                          className={
                            p.is_active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-500"
                          }
                        >
                          {p.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDetailPartenaire(p)}
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setConfirmToggle({
                                type: "partenaire",
                                id: p.id,
                                nom: p.nom,
                                current: p.is_active,
                              })
                            }
                            title={p.is_active ? "Désactiver" : "Activer"}
                          >
                            {p.is_active ? (
                              <UserX className="w-4 h-4 text-red-500" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!provisionalAccess}
        onOpenChange={(open) => {
          if (!open) setProvisionalAccess(null);
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Accès provisoire du partenaire</AlertDialogTitle>
            <AlertDialogDescription className="text-left sm:text-left">
              <span className="sr-only">Identifiants provisoires du partenaire</span>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Transmettez ces informations une seule fois au partenaire. Le mot de passe
                  est à usage unique : à la première connexion, il devra en choisir un
                  nouveau.
                </p>
                {provisionalAccess && (
                  <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-2 text-foreground">
                    <div>
                      <span className="text-muted-foreground">Email : </span>
                      {provisionalAccess.email}
                    </div>
                    <div className="break-all">
                      <span className="text-muted-foreground">Mot de passe : </span>
                      {provisionalAccess.password}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            {provisionalAccess && (
              <>
                <AlertDialogAction
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    void navigator.clipboard.writeText(provisionalAccess.password);
                    toast.success("Mot de passe copié");
                  }}
                >
                  Copier le mot de passe
                </AlertDialogAction>
                <AlertDialogAction
                  type="button"
                  variant="outline"
                  className="border-amber-600/50"
                  onClick={() => {
                    const text = `Email : ${provisionalAccess.email}\nMot de passe provisoire : ${provisionalAccess.password}`;
                    void navigator.clipboard.writeText(text);
                    toast.success("Identifiants copiés");
                  }}
                >
                  Copier tout
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog création partenaire */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un partenaire</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => createPartenaireMut.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du partenaire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="officiel">Officiel</SelectItem>
                        <SelectItem value="non_officiel">Non officiel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom complet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email du contact *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@exemple.com" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Identifiant de connexion à l’espace partenaire (unique).
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone du contact</FormLabel>
                    <FormControl>
                      <Input placeholder="+261 ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createPartenaireMut.isPending}>
                  {createPartenaireMut.isPending ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirm toggle */}
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        title={
          confirmToggle?.current
            ? "Désactiver le compte"
            : "Activer le compte"
        }
        description={
          confirmToggle?.current
            ? `Désactiver le compte de ${confirmToggle?.nom} ? Cet utilisateur ne pourra plus se connecter.`
            : `Activer le compte de ${confirmToggle?.nom} ?`
        }
        confirmLabel={confirmToggle?.current ? "Désactiver" : "Activer"}
        variant={confirmToggle?.current ? "destructive" : "default"}
        onConfirm={handleConfirmToggle}
        loading={isToggeling}
      />

      {/* Détail gérant */}
      <Sheet open={!!detailGerant} onOpenChange={(o) => !o && setDetailGerant(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Détail gérant</SheetTitle>
          </SheetHeader>
          {detailGerant && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="font-medium">{detailGerant.nom}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{detailGerant.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <p className="font-medium">{detailGerant.telephone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge
                  className={
                    detailGerant.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }
                >
                  {detailGerant.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="font-medium">
                  {format(new Date(detailGerant.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Détail partenaire */}
      <Sheet open={!!detailPartenaire} onOpenChange={(o) => !o && setDetailPartenaire(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Détail partenaire</SheetTitle>
          </SheetHeader>
          {detailPartenaire && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="font-medium">{detailPartenaire.nom}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <Badge variant="outline">
                  {detailPartenaire.type === "officiel" ? "Officiel" : "Non officiel"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="font-medium">{detailPartenaire.contact_nom ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email contact</p>
                <p className="font-medium">{detailPartenaire.contact_email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Téléphone contact</p>
                <p className="font-medium">{detailPartenaire.contact_telephone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge
                  className={
                    detailPartenaire.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }
                >
                  {detailPartenaire.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="font-medium">
                  {format(new Date(detailPartenaire.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
