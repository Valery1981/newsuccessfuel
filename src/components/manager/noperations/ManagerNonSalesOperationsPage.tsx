"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Building,
  Calculator,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { EcriturePreview } from "@/components/compta/EcriturePreview";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { stationService } from "@/services/stationService";
import { tresorerieService } from "@/services/tresorerieService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";
import { ChargesCourantesDialog } from "./ChargesCourantesDialog";
import { EncaissementCreancesDialog } from "./EncaissementCreancesDialog";
import { ImmobilisationsDialog } from "./ImmobilisationsDialog";
import { OperationsGerantDialog } from "./OperationsGerantDialog";
import { ReglementDettesDialog } from "./ReglementDettesDialog";
import { SalairesDialog } from "./SalairesDialog";

type EcritureInsert =
  Database["public"]["Tables"]["ecritures_comptables"]["Insert"];
type LigneInsert = Database["public"]["Tables"]["lignes_ecriture"]["Insert"];
type OperationInsert =
  Database["public"]["Tables"]["operations_hors_av"]["Insert"];

const supabase = createClient();

interface Operation {
  id: string;
  type: string;
  libelle: string;
  date_operation: string;
  montant: number;
  station_id: string | null;
  is_central: boolean;
}

export interface ManagerNonSalesOperationsPageProps {
  /** Ouvre directement le dialog d'une opération (pour routes dédiées §5.1) */
  initialDialog?:
    | "virement-interne"
    | "encaissement-creances"
    | "reglement-dettes"
    | "charges-courantes"
    | "salaires"
    | "charges-fiscales"
    | "operations-gerant"
    | "immobilisations";
}

export function ManagerNonSalesOperationsPage({
  initialDialog,
}: ManagerNonSalesOperationsPageProps = {}) {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  // Map kebab-case initialDialog to dialog keys
  const dialogKeyMap: Record<string, string> = {
    "virement-interne": "virement",
    "encaissement-creances": "creance",
    "reglement-dettes": "dette",
    "charges-courantes": "charge",
    salaires: "salaire",
    "charges-fiscales": "charge-fiscale",
    "operations-gerant": "gerant",
    immobilisations: "immobilisation",
  };

  const [dialogOpen, setDialogOpen] = useState<string | null>(
    initialDialog ? (dialogKeyMap[initialDialog] ?? null) : null,
  );

  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () =>
      entreprise
        ? tresorerieService.getTresoreriesByEntreprise(entreprise.id)
        : [],
    enabled: !!entreprise?.id,
  });

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: operations, isLoading } = useQuery({
    queryKey: ["operations-hors-av", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("operations_hors_av")
        .select("*")
        .eq("entreprise_id", entreprise.id)
        .order("date_operation", { ascending: false })
        .limit(50);
      return (data ?? []) as Operation[];
    },
    enabled: !!entreprise?.id,
  });

  // Virement Interne Form
  const [virementForm, setVirementForm] = useState({
    tresorerie_source_id: "",
    tresorerie_dest_id: "",
    montant: "",
    libelle: "",
    date_operation: new Date().toISOString().split("T")[0],
    station_id: "",
    is_central: false,
  });

  const virementMutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      if (
        !virementForm.tresorerie_source_id ||
        !virementForm.tresorerie_dest_id
      )
        throw new Error("Sélectionnez les deux trésoreries");
      if (virementForm.tresorerie_source_id === virementForm.tresorerie_dest_id)
        throw new Error("Source et destination doivent être différentes");
      if (!virementForm.montant || Number(virementForm.montant) <= 0)
        throw new Error("Montant invalide");

      // Create écriture comptable (partie double)
      const sourceAccount = tresoreries?.find(
        (t) => t.id === virementForm.tresorerie_source_id,
      );
      const destAccount = tresoreries?.find(
        (t) => t.id === virementForm.tresorerie_dest_id,
      );

      const ecritureData: EcritureInsert = {
        entreprise_id: entreprise.id,
        libelle: virementForm.libelle || "Virement interne",
        date_ecriture: virementForm.date_operation,
        type_operation: "virement_interne",
        station_id: virementForm.station_id || null,
        is_central: virementForm.is_central,
      };
      const { data: ecriture, error: ecritureError } = await supabase
        .from("ecritures_comptables")
        .insert(ecritureData)
        .select()
        .single();
      if (ecritureError) throw ecritureError;

      // Lignes: Débit trésorerie dest + Crédit trésorerie source
      const lignes: LigneInsert[] = [
        {
          ecriture_id: ecriture.id,
          numero_compte: destAccount?.numero_compte ?? "",
          libelle_compte: destAccount?.libelle ?? "Trésorerie destination",
          tresorerie_id: virementForm.tresorerie_dest_id,
          debit: Number(virementForm.montant),
          credit: 0,
        },
        {
          ecriture_id: ecriture.id,
          numero_compte: sourceAccount?.numero_compte ?? "",
          libelle_compte: sourceAccount?.libelle ?? "Trésorerie source",
          tresorerie_id: virementForm.tresorerie_source_id ?? "",
          debit: 0,
          credit: Number(virementForm.montant),
        },
      ];
      const { error: lignesError } = await supabase
        .from("lignes_ecriture")
        .insert(lignes);
      if (lignesError) throw lignesError;

      // Record operation
      const operationData: OperationInsert = {
        entreprise_id: entreprise.id,
        type: "virement_interne",
        libelle: virementForm.libelle || "Virement interne",
        date_operation: virementForm.date_operation,
        montant: Number(virementForm.montant),
        station_id: virementForm.station_id || null,
        is_central: virementForm.is_central,
        tresorerie_id: virementForm.tresorerie_source_id ?? "",
        tresorerie_destination_id: virementForm.tresorerie_dest_id,
        ecriture_id: ecriture.id,
      };
      await supabase.from("operations_hors_av").insert(operationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      queryClient.invalidateQueries({ queryKey: ["tresoreries"] });
      toast.success("Virement interne effectué !");
      setDialogOpen(null);
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Opérations Hors Achat & Vente"
        description="Virements internes, charges, salaires, opérations du gérant, immobilisations"
      />

      {/* Operation type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            id: "virement",
            label: "Virement Interne",
            icon: ArrowLeftRight,
            color: "bg-blue-50 text-blue-700 border-blue-200",
          },
          {
            id: "charge",
            label: "Charges Courantes",
            icon: TrendingDown,
            color: "bg-red-50 text-red-700 border-red-200",
          },
          {
            id: "salaire",
            label: "Salaires",
            icon: Users,
            color: "bg-green-50 text-green-700 border-green-200",
          },
          {
            id: "creance",
            label: "Encaissement Créances",
            icon: TrendingUp,
            color: "bg-amber-50 text-amber-700 border-amber-200",
          },
          {
            id: "dette",
            label: "Règlement Dettes",
            icon: DollarSign,
            color: "bg-purple-50 text-purple-700 border-purple-200",
          },
          {
            id: "gerant",
            label: "Opérations Gérant",
            icon: Building,
            color: "bg-slate-50 text-slate-700 border-slate-200",
          },
          {
            id: "immobilisation",
            label: "Immobilisations",
            icon: Calculator,
            color: "bg-cyan-50 text-cyan-700 border-cyan-200",
          },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => setDialogOpen(op.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-sm font-medium transition-all hover:shadow-md ${op.color}`}
          >
            <op.icon className="w-5 h-5" />
            <span className="text-center text-xs">{op.label}</span>
          </button>
        ))}
      </div>

      {/* Virement Interne Dialog */}
      <Dialog
        open={dialogOpen === "virement"}
        onOpenChange={(open) => !open && setDialogOpen(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Virement Interne</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={virementForm.date_operation}
                onChange={(e) =>
                  setVirementForm((p) => ({
                    ...p,
                    date_operation: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Trésorerie source (Crédit){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={virementForm.tresorerie_source_id}
                onValueChange={(v) =>
                  setVirementForm((p) => ({
                    ...p,
                    tresorerie_source_id: v ?? "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner...">
                    {
                      (tresoreries ?? []).find(
                        (t) => t.id === virementForm.tresorerie_source_id,
                      )?.libelle
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(tresoreries ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.libelle} ({formatCurrency(t.solde_actuel ?? 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Trésorerie destination (Débit){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={virementForm.tresorerie_dest_id}
                onValueChange={(v) =>
                  setVirementForm((p) => ({
                    ...p,
                    tresorerie_dest_id: v ?? "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner...">
                    {
                      (tresoreries ?? []).find(
                        (t) => t.id === virementForm.tresorerie_dest_id,
                      )?.libelle
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(tresoreries ?? [])
                    .filter((t) => t.id !== virementForm.tresorerie_source_id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.libelle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Montant (MGA) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={virementForm.montant}
                onChange={(e) =>
                  setVirementForm((p) => ({ ...p, montant: e.target.value }))
                }
                placeholder="0"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input
                value={virementForm.libelle}
                onChange={(e) =>
                  setVirementForm((p) => ({ ...p, libelle: e.target.value }))
                }
                placeholder="Virement de caisse vers banque..."
              />
            </div>
            <div className="space-y-2">
              <Label>Station (ou Central)</Label>
              <Select
                value={virementForm.station_id}
                onValueChange={(v) =>
                  setVirementForm((p) => ({
                    ...p,
                    station_id: v ?? "",
                    is_central: v === "central",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Analytique...">
                    {virementForm.station_id === "central"
                      ? "Central (entreprise)"
                      : (stations ?? []).find(
                          (s) => s.id === virementForm.station_id,
                        )?.nom}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central (entreprise)</SelectItem>
                  {(stations ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* APEX-16-final : Aperçu écriture comptable (§5.5-23) */}
            {virementForm.tresorerie_source_id &&
              virementForm.tresorerie_dest_id &&
              Number(virementForm.montant) > 0 && (
                <EcriturePreview
                  title="Écriture qui sera générée"
                  currency="MGA"
                  lignes={[
                    {
                      libelleCompte:
                        (tresoreries ?? []).find(
                          (t) => t.id === virementForm.tresorerie_dest_id,
                        )?.libelle ?? "Trésorerie destination",
                      debit: Number(virementForm.montant),
                      credit: 0,
                      libelle: "Réception virement",
                    },
                    {
                      libelleCompte:
                        (tresoreries ?? []).find(
                          (t) => t.id === virementForm.tresorerie_source_id,
                        )?.libelle ?? "Trésorerie source",
                      debit: 0,
                      credit: Number(virementForm.montant),
                      libelle: "Sortie virement",
                    },
                  ]}
                />
              )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => virementMutation.mutate()}
                disabled={
                  virementMutation.isPending ||
                  !virementForm.tresorerie_source_id ||
                  !virementForm.tresorerie_dest_id ||
                  !virementForm.montant
                }
              >
                Effectuer le virement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChargesCourantesDialog
        open={dialogOpen === "charge"}
        onClose={() => setDialogOpen(null)}
      />
      <SalairesDialog
        open={dialogOpen === "salaire"}
        onClose={() => setDialogOpen(null)}
      />
      <EncaissementCreancesDialog
        open={dialogOpen === "creance"}
        onClose={() => setDialogOpen(null)}
      />
      <ReglementDettesDialog
        open={dialogOpen === "dette"}
        onClose={() => setDialogOpen(null)}
      />
      <OperationsGerantDialog
        open={dialogOpen === "gerant"}
        onClose={() => setDialogOpen(null)}
      />
      <ImmobilisationsDialog
        open={dialogOpen === "immobilisation"}
        onClose={() => setDialogOpen(null)}
      />

      {/* Operations history */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des opérations</CardTitle>
        </CardHeader>
        <CardContent>
          {(operations ?? []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune opération enregistrée
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(operations ?? []).map((op) => (
                    <TableRow key={op.id}>
                      <TableCell>{formatDate(op.date_operation)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {op.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{op.libelle}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(op.montant)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
