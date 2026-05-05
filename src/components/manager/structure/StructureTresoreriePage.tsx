"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CreditCard,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { tresorerieService } from "@/services/tresorerieService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const TRESORERIE_TYPES = [
  {
    value: "banque",
    label: "Banque",
    icon: Banknote,
    color: "bg-blue-100 text-blue-700",
    prefix: "512",
  },
  {
    value: "mobile_money",
    label: "Mobile Money",
    icon: Smartphone,
    color: "bg-green-100 text-green-700",
    prefix: "513",
  },
  {
    value: "note_credit",
    label: "Note de Crédit",
    icon: CreditCard,
    color: "bg-purple-100 text-purple-700",
    prefix: "514",
  },
  {
    value: "caisse",
    label: "Caisse",
    icon: Wallet,
    color: "bg-amber-100 text-amber-700",
    prefix: "530",
  },
] as const;

export function StructureTresoreriePage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "caisse" as string,
    libelle: "",
  });

  const { data: tresoreries, isLoading } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () => tresorerieService.getTresoreriesByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      tresorerieService.createTresorerie({
        entreprise_id: entreprise!.id,
        type: formData.type as
          | "banque"
          | "mobile_money"
          | "note_credit"
          | "caisse",
        libelle: formData.libelle,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tresoreries"] });
      toast.success("Compte de trésorerie créé !");
      setIsDialogOpen(false);
      setFormData({ type: "caisse", libelle: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tresoreries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tresoreries"] });
      toast.success("Compte supprimé");
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setDeletingId(null);
    },
  });

  if (isLoading) return <PageLoading />;

  const filteredTresoreries = (tresoreries ?? []).filter(
    (t) => filterType === "all" || t.type === filterType,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Trésorerie"
        description="Gérez vos comptes de trésorerie (512 Banque, 513 Mobile Money, 514 Note de crédit, 530 Caisse)"
        actions={
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau compte
          </Button>
        }
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un compte de trésorerie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, type: v ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRESORERIE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} ({t.prefix}-xxx)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Libellé <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.libelle}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, libelle: e.target.value }))
                }
                placeholder="Ex: BNI Madagascar, Mvola, Caisse principale..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!formData.libelle.trim() || createMutation.isPending}
              >
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter by type */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
        >
          Tous ({(tresoreries ?? []).length})
        </Button>
        {TRESORERIE_TYPES.map((t) => {
          const count = (tresoreries ?? []).filter(
            (tr) => tr.type === t.value,
          ).length;
          if (count === 0) return null;
          return (
            <Button
              key={t.value}
              variant={filterType === t.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(t.value)}
            >
              {t.label} ({count})
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTresoreries.map((t) => {
          const typeInfo = TRESORERIE_TYPES.find((x) => x.value === t.type);
          const Icon = typeInfo?.icon ?? Wallet;
          const solde = t.solde_actuel ?? 0;
          const canDelete = solde === 0;

          return (
            <Card key={t.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeInfo?.color ?? ""}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{t.libelle}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {typeInfo?.label}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={!canDelete}
                    title={
                      canDelete
                        ? "Supprimer ce compte"
                        : "Solde non nul — impossible de supprimer"
                    }
                    onClick={() => setDeletingId(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(solde)}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    Compte : {t.numero_compte}
                  </p>
                  {!canDelete && (
                    <Badge
                      variant="outline"
                      className="text-xs text-amber-600 border-amber-300"
                    >
                      Solde non nul
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Supprimer ce compte de trésorerie ?"
        description="Cette action est irréversible. Le compte doit avoir un solde de 0 Ar."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </PageContainer>
  );
}
