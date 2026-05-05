"use client";

import { EcriturePreview } from "@/components/compta/EcriturePreview";
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

type SousType = "acquisition_cash" | "acquisition_credit" | "cession";

const defaultForm = {
  sousType: "acquisition_cash" as SousType,
  libelle: "",
  numero_compte_immo: "",
  libelle_compte_immo: "",
  montant: "",
  tresorerie_id: "",
  fournisseur_id: "",
  echeance: "",
  prix_vente: "",
  date_operation: new Date().toISOString().split("T")[0],
};

export function ImmobilisationsDialog({ open, onClose }: Props) {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);

  const { data: immoAccounts } = useQuery({
    queryKey: ["immo-accounts"],
    queryFn: () => comptesService.getImmobilisationAccounts(),
    enabled: open,
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

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      if (!form.numero_compte_immo)
        throw new Error("Sélectionnez un compte d'immobilisation");
      const montant = Number(form.montant);
      if (!montant || montant <= 0) throw new Error("Montant invalide");

      const tresorerie = tresoreries?.find((t) => t.id === form.tresorerie_id);
      const fournisseur = fournisseurs?.find(
        (f) => f.id === form.fournisseur_id,
      );
      const opType =
        form.sousType === "cession"
          ? "cession_immobilisation"
          : "acquisition_immobilisation";

      if (form.sousType === "acquisition_cash" && !form.tresorerie_id)
        throw new Error("Sélectionnez une trésorerie");
      if (form.sousType === "acquisition_credit" && !form.fournisseur_id)
        throw new Error("Sélectionnez un fournisseur");
      if (form.sousType === "acquisition_credit" && !form.echeance)
        throw new Error("Date d'échéance requise");
      if (form.sousType === "cession" && !form.prix_vente)
        throw new Error("Saisissez le prix de cession");
      if (form.sousType === "cession" && !form.tresorerie_id)
        throw new Error("Sélectionnez une trésorerie de réception");

      const prixVente = Number(form.prix_vente);
      const libelle =
        form.libelle ||
        `${form.sousType === "cession" ? "Cession" : "Acquisition"} — ${form.libelle_compte_immo}`;

      const { data: ecriture, error } = await supabase
        .from("ecritures_comptables")
        .insert({
          entreprise_id: entreprise.id,
          libelle,
          date_ecriture: form.date_operation,
          type_operation: opType,
          is_central: true,
          created_by: compte?.session_id ?? null,
        } as EcritureInsert)
        .select()
        .single();
      if (error) throw error;

      let lignes: LigneInsert[] = [];

      if (form.sousType === "acquisition_cash") {
        lignes = [
          {
            ecriture_id: ecriture.id,
            numero_compte: form.numero_compte_immo,
            libelle_compte: form.libelle_compte_immo,
            debit: montant,
            credit: 0,
          },
          {
            ecriture_id: ecriture.id,
            numero_compte: tresorerie?.numero_compte ?? "",
            libelle_compte: tresorerie?.libelle ?? "",
            tresorerie_id: form.tresorerie_id,
            debit: 0,
            credit: montant,
          },
        ];
      } else if (form.sousType === "acquisition_credit") {
        lignes = [
          {
            ecriture_id: ecriture.id,
            numero_compte: form.numero_compte_immo,
            libelle_compte: form.libelle_compte_immo,
            debit: montant,
            credit: 0,
          },
          {
            ecriture_id: ecriture.id,
            numero_compte: fournisseur?.compte_principal ?? "401",
            libelle_compte: fournisseur?.nom ?? "",
            tiers_id: form.fournisseur_id,
            debit: 0,
            credit: montant,
          },
        ];
      } else {
        const gain = prixVente - montant;
        if (gain > 0) {
          lignes = [
            {
              ecriture_id: ecriture.id,
              numero_compte: tresorerie?.numero_compte ?? "",
              libelle_compte: tresorerie?.libelle ?? "",
              tresorerie_id: form.tresorerie_id,
              debit: prixVente,
              credit: 0,
            },
            {
              ecriture_id: ecriture.id,
              numero_compte: form.numero_compte_immo,
              libelle_compte: form.libelle_compte_immo,
              debit: 0,
              credit: montant,
            },
            {
              ecriture_id: ecriture.id,
              numero_compte: "753",
              libelle_compte: "Gains sur cessions d'immobilisations",
              debit: 0,
              credit: gain,
            },
          ];
        } else if (gain < 0) {
          lignes = [
            {
              ecriture_id: ecriture.id,
              numero_compte: tresorerie?.numero_compte ?? "",
              libelle_compte: tresorerie?.libelle ?? "",
              tresorerie_id: form.tresorerie_id,
              debit: prixVente,
              credit: 0,
            },
            {
              ecriture_id: ecriture.id,
              numero_compte: "653",
              libelle_compte: "Pertes sur cessions d'immobilisations",
              debit: Math.abs(gain),
              credit: 0,
            },
            {
              ecriture_id: ecriture.id,
              numero_compte: form.numero_compte_immo,
              libelle_compte: form.libelle_compte_immo,
              debit: 0,
              credit: montant,
            },
          ];
        } else {
          lignes = [
            {
              ecriture_id: ecriture.id,
              numero_compte: tresorerie?.numero_compte ?? "",
              libelle_compte: tresorerie?.libelle ?? "",
              tresorerie_id: form.tresorerie_id,
              debit: prixVente,
              credit: 0,
            },
            {
              ecriture_id: ecriture.id,
              numero_compte: form.numero_compte_immo,
              libelle_compte: form.libelle_compte_immo,
              debit: 0,
              credit: montant,
            },
          ];
        }
      }

      const totalDebit = lignes.reduce((s, l) => s + (l.debit ?? 0), 0);
      const totalCredit = lignes.reduce((s, l) => s + (l.credit ?? 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01)
        throw new Error("Déséquilibre comptable — vérifiez les montants");

      await supabase.from("lignes_ecriture").insert(lignes);
      await supabase.from("operations_hors_av").insert({
        entreprise_id: entreprise.id,
        type: opType,
        libelle,
        date_operation: form.date_operation,
        montant,
        tresorerie_id: form.tresorerie_id || null,
        tiers_id: form.fournisseur_id || null,
        is_central: true,
        ecriture_id: ecriture.id,
      } as OperationInsert);

      if (form.sousType === "acquisition_credit" && fournisseur) {
        await supabase.from("dettes").insert({
          entreprise_id: entreprise.id,
          fournisseur_id: form.fournisseur_id,
          type_dette: "immobilisation",
          reference_id: ecriture.id,
          reference_numero: libelle,
          montant_initial: montant,
          echeance: form.echeance || null,
        } as DetteInsert);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Immobilisation enregistrée !");
      setForm(defaultForm);
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const SOUS_TYPES: { value: SousType; label: string }[] = [
    { value: "acquisition_cash", label: "Acquisition — Paiement comptant" },
    { value: "acquisition_credit", label: "Acquisition — À crédit" },
    { value: "cession", label: "Cession d'immobilisation" },
  ];

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
          <DialogTitle>Immobilisations</DialogTitle>
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
                      fournisseur_id: "",
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
            <Label>
              Compte d&apos;immobilisation{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.numero_compte_immo}
              onValueChange={(v) => {
                if (!v) return;
                const c = immoAccounts?.find((x) => x.numero === v);
                setForm((p) => ({
                  ...p,
                  numero_compte_immo: v,
                  libelle_compte_immo: c?.libelle ?? "",
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Matériels et mobilier...">
                  {
                    (immoAccounts ?? []).find(
                      (c) => c.numero === form.numero_compte_immo,
                    )?.libelle
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(immoAccounts ?? []).map((c) => (
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
              placeholder="Ordinateur portable Dell..."
              onChange={(e) =>
                setForm((p) => ({ ...p, libelle: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>
              {form.sousType === "cession"
                ? "Valeur comptable (MGA)"
                : "Montant (MGA)"}{" "}
              <span className="text-destructive">*</span>
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

          {form.sousType === "cession" && (
            <div className="space-y-1">
              <Label>
                Prix de cession (MGA){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={form.prix_vente}
                onChange={(e) =>
                  setForm((p) => ({ ...p, prix_vente: e.target.value }))
                }
              />
              {form.montant && form.prix_vente && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    Number(form.prix_vente) >= Number(form.montant)
                      ? "text-green-600"
                      : "text-destructive",
                  )}
                >
                  {Number(form.prix_vente) >= Number(form.montant)
                    ? `Gain : +${(Number(form.prix_vente) - Number(form.montant)).toLocaleString("fr")} MGA`
                    : `Perte : -${(Number(form.montant) - Number(form.prix_vente)).toLocaleString("fr")} MGA`}
                </p>
              )}
            </div>
          )}

          {(form.sousType === "acquisition_cash" ||
            form.sousType === "cession") && (
            <div className="space-y-1">
              <Label>
                {form.sousType === "cession"
                  ? "Trésorerie de réception"
                  : "Trésorerie"}{" "}
                <span className="text-destructive">*</span>
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

          {form.sousType === "acquisition_credit" && (
            <>
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
                  <SelectTrigger className="w-full">
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

          {/* APEX-16-extra : Aperçu écriture comptable (§5.5-23) */}
          {form.numero_compte_immo &&
            Number(form.montant) > 0 &&
            (() => {
              const m = Number(form.montant);
              const tresorerieLibelle =
                (tresoreries ?? []).find((t) => t.id === form.tresorerie_id)
                  ?.libelle ?? "Trésorerie";
              const fournisseurNom =
                (fournisseurs ?? []).find((f) => f.id === form.fournisseur_id)
                  ?.nom ?? "Fournisseur";
              const lignes =
                form.sousType === "acquisition_cash"
                  ? [
                      {
                        libelleCompte: form.libelle_compte_immo,
                        debit: m,
                        credit: 0,
                        libelle: "Acquisition immobilisation",
                      },
                      {
                        libelleCompte: tresorerieLibelle,
                        debit: 0,
                        credit: m,
                        libelle: "Sortie trésorerie",
                      },
                    ]
                  : form.sousType === "acquisition_credit"
                    ? [
                        {
                          libelleCompte: form.libelle_compte_immo,
                          debit: m,
                          credit: 0,
                          libelle: "Acquisition à crédit",
                        },
                        {
                          libelleCompte: `Fournisseur ${fournisseurNom}`,
                          debit: 0,
                          credit: m,
                          libelle: "Reste à payer",
                        },
                      ]
                    : [
                        {
                          libelleCompte: tresorerieLibelle,
                          debit: m,
                          credit: 0,
                          libelle: "Encaissement cession",
                        },
                        {
                          libelleCompte: form.libelle_compte_immo,
                          debit: 0,
                          credit: m,
                          libelle: "Sortie immobilisation",
                        },
                      ];
              return (
                <EcriturePreview
                  title="Écriture qui sera générée"
                  currency="MGA"
                  lignes={lignes}
                />
              );
            })()}
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
              disabled={
                mutation.isPending || !form.numero_compte_immo || !form.montant
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
