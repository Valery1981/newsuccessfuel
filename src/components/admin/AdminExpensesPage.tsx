"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { exportCsv } from "@/lib/exportCsv";
import { adminService } from "@/services/adminService";
import { useAuthStore } from "@/stores/authStore";

const CATEGORIES = [
  "Hébergement / Serveurs",
  "Licences logicielles",
  "Maintenance technique",
  "Marketing",
  "Frais bancaires",
  "Salaires équipe",
  "Autres",
];

export function AdminExpensesPage() {
  const { compte } = useAuthStore();
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);

  const [form, setForm] = useState({
    date_depense: new Date().toISOString().split("T")[0],
    categorie: "",
    description: "",
    montant: "",
  });

  const { data: depenses, isLoading } = useQuery({
    queryKey: ["admin-depenses"],
    queryFn: () => adminService.getDepenses(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      adminService.createDepense({
        date_depense: form.date_depense,
        categorie: form.categorie,
        description: form.description || undefined,
        montant: parseFloat(form.montant),
        created_by: compte?.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-depenses"] });
      toast.success("Dépense enregistrée");
      setOpenForm(false);
      setForm({
        date_depense: new Date().toISOString().split("T")[0],
        categorie: "",
        description: "",
        montant: "",
      });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const totalGeneral = (depenses ?? []).reduce((s, d) => s + d.montant, 0);

  const handleExport = () => {
    if (!depenses?.length) return;
    exportCsv(
      depenses.map((d) => ({
        Date: d.date_depense,
        Catégorie: d.categorie,
        Description: d.description ?? "",
        "Montant (MGA)": d.montant,
        Devise: d.devise,
      })),
      "depenses-plateforme",
    );
  };

  const isFormValid =
    form.date_depense &&
    form.categorie &&
    form.montant &&
    !isNaN(parseFloat(form.montant)) &&
    parseFloat(form.montant) > 0;

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Dépenses plateforme"
        description="Suivi des dépenses opérationnelles de SuccessFuel"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Exporter CSV
            </Button>
            <Button size="sm" onClick={() => setOpenForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nouvelle dépense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">
              Total dépenses (MGA)
            </p>
            <p className="text-3xl font-bold mt-1 text-red-600">
              {totalGeneral.toLocaleString("fr-FR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">
              Nombre d&apos;entrées
            </p>
            <p className="text-3xl font-bold mt-1">{(depenses ?? []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Catégories</p>
            <p className="text-3xl font-bold mt-1">
              {new Set((depenses ?? []).map((d) => d.categorie)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          {(depenses ?? []).length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Historique vide"
              description="Ajoutez la première dépense plateforme."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Montant (MGA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(depenses ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(d.date_depense), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{d.categorie}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {d.montant.toLocaleString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date_depense}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date_depense: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select
                value={form.categorie}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categorie: v ?? "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Montant (MGA)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.montant}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montant: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optionnel)</Label>
              <Textarea
                rows={2}
                placeholder="Détails..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <Button
              className="w-full"
              disabled={!isFormValid || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Enregistrer la dépense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
