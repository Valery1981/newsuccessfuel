"use client";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { tresorerieService } from "@/services/tresorerieService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EcritureInsert =
  Database["public"]["Tables"]["ecritures_comptables"]["Insert"];
type LigneInsert = Database["public"]["Tables"]["lignes_ecriture"]["Insert"];
type OperationInsert =
  Database["public"]["Tables"]["operations_hors_av"]["Insert"];

const supabase = createClient();

interface Props {
  open: boolean;
  onClose: () => void;
}

type SousType =
  | "capital_apport"
  | "capital_retrait"
  | "cc_apport"
  | "cc_retrait"
  | "dividendes_affectation"
  | "dividendes_distribution";

const SOUS_TYPES: {
  value: SousType;
  label: string;
  needsTresorerie: boolean;
}[] = [
  {
    value: "capital_apport",
    label: "Apport en capital",
    needsTresorerie: true,
  },
  {
    value: "capital_retrait",
    label: "Retrait de capital",
    needsTresorerie: true,
  },
  {
    value: "cc_apport",
    label: "Apport Compte Courant Associé",
    needsTresorerie: true,
  },
  {
    value: "cc_retrait",
    label: "Retrait Compte Courant Associé",
    needsTresorerie: true,
  },
  {
    value: "dividendes_affectation",
    label: "Affectation dividendes (120 → 457)",
    needsTresorerie: false,
  },
  {
    value: "dividendes_distribution",
    label: "Distribution dividendes (457 → trésorerie)",
    needsTresorerie: true,
  },
];

const defaultForm = {
  sousType: "capital_apport" as SousType,
  montant: "",
  tresorerie_id: "",
  date_operation: new Date().toISOString().split("T")[0],
  libelle: "",
};

function buildLignes(
  sousType: SousType,
  montant: number,
  tresorerie:
    | { id: string; numero_compte: string | null; libelle: string }
    | undefined,
  ecritureId: string,
): LigneInsert[] {
  switch (sousType) {
    case "capital_apport":
      return [
        {
          ecriture_id: ecritureId,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: tresorerie?.id,
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecritureId,
          numero_compte: "101",
          libelle_compte: "Capital",
          debit: 0,
          credit: montant,
        },
      ];
    case "capital_retrait":
      return [
        {
          ecriture_id: ecritureId,
          numero_compte: "101",
          libelle_compte: "Capital",
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecritureId,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: tresorerie?.id,
          debit: 0,
          credit: montant,
        },
      ];
    case "cc_apport":
      return [
        {
          ecriture_id: ecritureId,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: tresorerie?.id,
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecritureId,
          numero_compte: "455",
          libelle_compte: "Comptes courants associés",
          debit: 0,
          credit: montant,
        },
      ];
    case "cc_retrait":
      return [
        {
          ecriture_id: ecritureId,
          numero_compte: "455",
          libelle_compte: "Comptes courants associés",
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecritureId,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: tresorerie?.id,
          debit: 0,
          credit: montant,
        },
      ];
    case "dividendes_affectation":
      return [
        {
          ecriture_id: ecritureId,
          numero_compte: "120",
          libelle_compte: "Résultat net",
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecritureId,
          numero_compte: "457",
          libelle_compte: "Dividendes à distribuer",
          debit: 0,
          credit: montant,
        },
      ];
    case "dividendes_distribution":
      return [
        {
          ecriture_id: ecritureId,
          numero_compte: "457",
          libelle_compte: "Dividendes à distribuer",
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecritureId,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: tresorerie?.id,
          debit: 0,
          credit: montant,
        },
      ];
  }
}

export function OperationsGerantDialog({ open, onClose }: Props) {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);

  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () => tresorerieService.getTresoreriesByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const sousTypeConfig = SOUS_TYPES.find((s) => s.value === form.sousType)!;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      const montant = Number(form.montant);
      if (!montant || montant <= 0) throw new Error("Montant invalide");
      if (sousTypeConfig.needsTresorerie && !form.tresorerie_id)
        throw new Error("Sélectionnez une trésorerie");

      const tresorerie = tresoreries?.find((t) => t.id === form.tresorerie_id);
      const libelle = form.libelle || sousTypeConfig.label;

      const { data: ecriture, error } = await supabase
        .from("ecritures_comptables")
        .insert({
          entreprise_id: entreprise.id,
          libelle,
          date_ecriture: form.date_operation,
          type_operation: "operation_gerant",
          is_central: true,
          created_by: compte?.session_id ?? null,
        } as EcritureInsert)
        .select()
        .single();
      if (error) throw error;

      const lignes = buildLignes(
        form.sousType,
        montant,
        tresorerie,
        ecriture.id,
      );
      const totalDebit = lignes.reduce((s, l) => s + (l.debit ?? 0), 0);
      const totalCredit = lignes.reduce((s, l) => s + (l.credit ?? 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01)
        throw new Error("Déséquilibre comptable");

      await supabase.from("lignes_ecriture").insert(lignes);
      await supabase.from("operations_hors_av").insert({
        entreprise_id: entreprise.id,
        type: "operation_gerant",
        libelle,
        date_operation: form.date_operation,
        montant,
        tresorerie_id: form.tresorerie_id || null,
        is_central: true,
        ecriture_id: ecriture.id,
      } as OperationInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Opération gérant enregistrée !");
      setForm(defaultForm);
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setForm(defaultForm);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opérations Gérant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Type d&apos;opération <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col gap-1.5">
              {SOUS_TYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium text-left transition-colors",
                    form.sousType === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted",
                  )}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      sousType: s.value,
                      tresorerie_id: "",
                    }))
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={form.date_operation}
              onChange={(e) =>
                setForm((p) => ({ ...p, date_operation: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Libellé</Label>
            <Input
              value={form.libelle}
              placeholder={sousTypeConfig.label}
              onChange={(e) =>
                setForm((p) => ({ ...p, libelle: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>
              Montant (MGA) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              value={form.montant}
              onChange={(e) =>
                setForm((p) => ({ ...p, montant: e.target.value }))
              }
            />
          </div>

          {sousTypeConfig.needsTresorerie && (
            <div className="space-y-1">
              <Label>
                Trésorerie <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.tresorerie_id}
                onValueChange={(v) =>
                  v && setForm((p) => ({ ...p, tresorerie_id: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Trésorerie...">
                    {
                      (tresoreries ?? []).find(
                        (t) => t.id === form.tresorerie_id,
                      )?.libelle
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(tresoreries ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setForm(defaultForm);
                onClose();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.montant}
            >
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
