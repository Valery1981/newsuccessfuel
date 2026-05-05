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
import { comptesService } from "@/services/comptesService";
import { stationService } from "@/services/stationService";
import { tiersService } from "@/services/tiersService";
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
type DetteInsert = Database["public"]["Tables"]["dettes"]["Insert"];

const supabase = createClient();

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "cash" | "credit" | "mixte";

export function ChargesCourantesDialog({ open, onClose }: Props) {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    date_operation: new Date().toISOString().split("T")[0],
    libelle: "",
    numero_compte_charge: "",
    libelle_compte_charge: "",
    montant: "",
    mode: "cash" as Mode,
    montant_cash: "",
    montant_credit: "",
    fournisseur_id: "",
    tresorerie_id: "",
    echeance: "",
    station_id: "",
    is_central: false,
  });

  const { data: chargeAccounts } = useQuery({
    queryKey: ["charge-accounts", entreprise?.id],
    queryFn: () => comptesService.getChargeAccounts(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const { data: fournisseurs } = useQuery({
    queryKey: ["fournisseurs", entreprise?.id],
    queryFn: () => tiersService.getFournisseurs(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () => tresorerieService.getTresoreriesByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () => stationService.getStationsByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      if (!form.numero_compte_charge)
        throw new Error("Sélectionnez un type de charge");
      const montant = Number(form.montant);
      if (!montant || montant <= 0) throw new Error("Montant invalide");

      const montantCash =
        form.mode === "cash"
          ? montant
          : form.mode === "credit"
            ? 0
            : Number(form.montant_cash) || 0;
      const montantCredit =
        form.mode === "credit"
          ? montant
          : form.mode === "cash"
            ? 0
            : Number(form.montant_credit) || 0;

      if (
        form.mode === "mixte" &&
        Math.abs(montantCash + montantCredit - montant) > 0.01
      ) {
        throw new Error(
          "La somme cash + crédit doit être égale au montant total",
        );
      }
      if (
        (form.mode === "cash" || form.mode === "mixte") &&
        !form.tresorerie_id
      ) {
        throw new Error("Sélectionnez une trésorerie pour le paiement cash");
      }
      if (
        (form.mode === "credit" || form.mode === "mixte") &&
        !form.fournisseur_id
      ) {
        throw new Error("Sélectionnez un fournisseur pour la partie crédit");
      }
      if ((form.mode === "credit" || form.mode === "mixte") && !form.echeance) {
        throw new Error("Date d'échéance requise pour la partie crédit");
      }

      const tresorerie = tresoreries?.find((t) => t.id === form.tresorerie_id);
      const fournisseur = fournisseurs?.find(
        (f) => f.id === form.fournisseur_id,
      );

      const ecritureData: EcritureInsert = {
        entreprise_id: entreprise.id,
        libelle: form.libelle || "Charge courante",
        date_ecriture: form.date_operation,
        type_operation: "charge_courante",
        station_id: form.station_id || null,
        is_central: form.is_central,
        created_by: compte?.session_id ?? null,
      };
      const { data: ecriture, error: ecritureError } = await supabase
        .from("ecritures_comptables")
        .insert(ecritureData)
        .select()
        .single();
      if (ecritureError) throw ecritureError;

      const lignes: LigneInsert[] = [
        {
          ecriture_id: ecriture.id,
          numero_compte: form.numero_compte_charge,
          libelle_compte: form.libelle_compte_charge,
          debit: montant,
          credit: 0,
        },
      ];
      if (montantCash > 0 && tresorerie) {
        lignes.push({
          ecriture_id: ecriture.id,
          numero_compte: tresorerie.numero_compte ?? "",
          libelle_compte: tresorerie.libelle,
          tresorerie_id: form.tresorerie_id,
          debit: 0,
          credit: montantCash,
        });
      }
      if (montantCredit > 0 && fournisseur) {
        lignes.push({
          ecriture_id: ecriture.id,
          numero_compte: fournisseur.compte_principal ?? "401",
          libelle_compte: fournisseur.nom,
          tiers_id: form.fournisseur_id,
          debit: 0,
          credit: montantCredit,
        });
      }

      const totalDebit = lignes.reduce((s, l) => s + (l.debit ?? 0), 0);
      const totalCredit = lignes.reduce((s, l) => s + (l.credit ?? 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("Déséquilibre comptable — vérifiez les montants");
      }

      const { error: lignesError } = await supabase
        .from("lignes_ecriture")
        .insert(lignes);
      if (lignesError) throw lignesError;

      const operationData: OperationInsert = {
        entreprise_id: entreprise.id,
        type: "charge_courante",
        libelle: form.libelle || "Charge courante",
        date_operation: form.date_operation,
        montant,
        station_id: form.station_id || null,
        is_central: form.is_central,
        tiers_id: form.fournisseur_id || null,
        tresorerie_id: form.tresorerie_id || null,
        echeance: form.echeance || null,
        ecriture_id: ecriture.id,
      };
      await supabase.from("operations_hors_av").insert(operationData);

      if (montantCredit > 0 && fournisseur) {
        const detteData: DetteInsert = {
          entreprise_id: entreprise.id,
          fournisseur_id: form.fournisseur_id,
          type_dette: "charge",
          reference_id: ecriture.id,
          reference_numero: form.libelle || "Charge courante",
          montant_initial: montantCredit,
          echeance: form.echeance || null,
        };
        await supabase.from("dettes").insert(detteData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Charge courante enregistrée !");
      resetForm();
      onClose();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  function resetForm() {
    setForm({
      date_operation: new Date().toISOString().split("T")[0],
      libelle: "",
      numero_compte_charge: "",
      libelle_compte_charge: "",
      montant: "",
      mode: "cash",
      montant_cash: "",
      montant_credit: "",
      fournisseur_id: "",
      tresorerie_id: "",
      echeance: "",
      station_id: "",
      is_central: false,
    });
  }

  const handleSelectCharge = (numero: string) => {
    const found = chargeAccounts?.find((c) => c.numero === numero);
    setForm((p) => ({
      ...p,
      numero_compte_charge: numero,
      libelle_compte_charge: found?.libelle ?? "",
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Charges Courantes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Analytique</Label>
              <Select
                value={form.station_id}
                onValueChange={(v) =>
                  v &&
                  setForm((p) => ({
                    ...p,
                    station_id: v === "central" ? "" : v,
                    is_central: v === "central",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Station / Central">
                    {form.is_central
                      ? "Central"
                      : (stations ?? []).find((s) => s.id === form.station_id)
                          ?.nom}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central</SelectItem>
                  {(stations ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              Type de charge <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.numero_compte_charge}
              onValueChange={(v) => v && handleSelectCharge(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type de charge...">
                  {
                    (chargeAccounts ?? []).find(
                      (c) => c.numero === form.numero_compte_charge,
                    )?.libelle
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(chargeAccounts ?? []).map((c) => (
                  <SelectItem key={c.numero} value={c.numero}>
                    {c.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Libellé</Label>
            <Input
              value={form.libelle}
              placeholder="Loyer mensuel juin 2026..."
              onChange={(e) =>
                setForm((p) => ({ ...p, libelle: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>
              Montant total (MGA) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              value={form.montant}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  montant: e.target.value,
                  montant_cash: e.target.value,
                  montant_credit: "",
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Mode de règlement <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              {(["cash", "credit", "mixte"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    form.mode === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      mode: m,
                      montant_cash: m !== "credit" ? p.montant : "",
                      montant_credit: "",
                    }))
                  }
                >
                  {m === "cash"
                    ? "Cash total"
                    : m === "credit"
                      ? "Crédit total"
                      : "Mixte"}
                </button>
              ))}
            </div>
          </div>

          {(form.mode === "cash" || form.mode === "mixte") && (
            <div className="space-y-1">
              {form.mode === "mixte" && (
                <Label>
                  Montant cash (MGA) <span className="text-destructive">*</span>
                </Label>
              )}
              {form.mode === "cash" && (
                <Label>
                  Trésorerie <span className="text-destructive">*</span>
                </Label>
              )}
              {form.mode === "mixte" && (
                <Input
                  type="number"
                  min={0}
                  value={form.montant_cash}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, montant_cash: e.target.value }))
                  }
                />
              )}
              <Select
                value={form.tresorerie_id}
                onValueChange={(v) =>
                  v && setForm((p) => ({ ...p, tresorerie_id: v }))
                }
              >
                <SelectTrigger>
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

          {(form.mode === "credit" || form.mode === "mixte") && (
            <>
              {form.mode === "mixte" && (
                <div className="space-y-1">
                  <Label>
                    Montant crédit (MGA){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.montant_credit}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, montant_credit: e.target.value }))
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>
                  Fournisseur <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.fournisseur_id}
                  onValueChange={(v) =>
                    v && setForm((p) => ({ ...p, fournisseur_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Fournisseur...">
                      {
                        (fournisseurs ?? []).find(
                          (f) => f.id === form.fournisseur_id,
                        )?.nom
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(fournisseurs ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  Date d&apos;échéance{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.echeance}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, echeance: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                mutation.isPending ||
                !form.numero_compte_charge ||
                !form.montant
              }
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
