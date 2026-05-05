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

const supabase = createClient();

type Etape = "avance" | "constatation" | "paiement";

interface Props {
  open: boolean;
  onClose: () => void;
}

const defaultAvance = {
  employe_id: "",
  montant: "",
  tresorerie_id: "",
  date_operation: new Date().toISOString().split("T")[0],
};
const defaultConstatation = {
  montant_global: "",
  employes: [] as { employe_id: string; montant: string }[],
  date_operation: new Date().toISOString().split("T")[0],
};
const defaultPaiement = {
  employe_id: "",
  montant: "",
  tresorerie_id: "",
  date_operation: new Date().toISOString().split("T")[0],
};

export function SalairesDialog({ open, onClose }: Props) {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [etape, setEtape] = useState<Etape>("avance");
  const [avance, setAvance] = useState(defaultAvance);
  const [constatation, setConstatation] = useState(defaultConstatation);
  const [paiement, setPaiement] = useState(defaultPaiement);

  const { data: employes } = useQuery({
    queryKey: ["employes", entreprise?.id],
    queryFn: () => tiersService.getEmployes(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });
  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () => tresorerieService.getTresoreriesByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const avanceMutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      if (!avance.employe_id) throw new Error("Sélectionnez un salarié");
      if (!avance.tresorerie_id) throw new Error("Sélectionnez une trésorerie");
      const montant = Number(avance.montant);
      if (!montant || montant <= 0) throw new Error("Montant invalide");

      const employe = employes?.find((e) => e.id === avance.employe_id);
      const tresorerie = tresoreries?.find(
        (t) => t.id === avance.tresorerie_id,
      );
      if (!employe) throw new Error("Salarié introuvable");

      const { data: ecriture, error } = await supabase
        .from("ecritures_comptables")
        .insert({
          entreprise_id: entreprise.id,
          libelle: `Avance sur salaire — ${employe.nom}`,
          date_ecriture: avance.date_operation,
          type_operation: "salaire_avance",
          created_by: compte?.session_id ?? null,
        } as EcritureInsert)
        .select()
        .single();
      if (error) throw error;

      const lignes: LigneInsert[] = [
        {
          ecriture_id: ecriture.id,
          numero_compte: employe.compte_principal ?? "421",
          libelle_compte: employe.nom,
          tiers_id: employe.id,
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecriture.id,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: avance.tresorerie_id,
          debit: 0,
          credit: montant,
        },
      ];
      await supabase.from("lignes_ecriture").insert(lignes);
      await supabase.from("operations_hors_av").insert({
        entreprise_id: entreprise.id,
        type: "salaire_avance",
        libelle: `Avance — ${employe.nom}`,
        date_operation: avance.date_operation,
        montant,
        tiers_id: employe.id,
        tresorerie_id: avance.tresorerie_id,
        ecriture_id: ecriture.id,
      } as OperationInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Avance sur salaire enregistrée !");
      setAvance(defaultAvance);
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const constatationMutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      const montantGlobal = Number(constatation.montant_global);
      if (!montantGlobal || montantGlobal <= 0)
        throw new Error("Montant global invalide");
      const lignesEmployes = constatation.employes.filter(
        (e) => Number(e.montant) > 0,
      );
      if (lignesEmployes.length === 0)
        throw new Error("Ajoutez au moins un salarié avec un montant");
      const totalEmployes = lignesEmployes.reduce(
        (s, e) => s + Number(e.montant),
        0,
      );
      if (Math.abs(totalEmployes - montantGlobal) > 0.01)
        throw new Error(
          "La somme par salarié doit être égale au montant global",
        );

      const { data: ecriture, error } = await supabase
        .from("ecritures_comptables")
        .insert({
          entreprise_id: entreprise.id,
          libelle: "Constatation salaires",
          date_ecriture: constatation.date_operation,
          type_operation: "salaire_constatation",
          created_by: compte?.session_id ?? null,
        } as EcritureInsert)
        .select()
        .single();
      if (error) throw error;

      const lignes: LigneInsert[] = [
        {
          ecriture_id: ecriture.id,
          numero_compte: "640",
          libelle_compte: "Salaires",
          debit: montantGlobal,
          credit: 0,
        },
      ];
      for (const le of lignesEmployes) {
        const emp = employes?.find((e) => e.id === le.employe_id);
        if (emp)
          lignes.push({
            ecriture_id: ecriture.id,
            numero_compte: emp.compte_principal ?? "421",
            libelle_compte: emp.nom,
            tiers_id: emp.id,
            debit: 0,
            credit: Number(le.montant),
          });
      }
      await supabase.from("lignes_ecriture").insert(lignes);
      await supabase.from("operations_hors_av").insert({
        entreprise_id: entreprise.id,
        type: "salaire_constatation",
        libelle: "Constatation salaires",
        date_operation: constatation.date_operation,
        montant: montantGlobal,
        ecriture_id: ecriture.id,
      } as OperationInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Constatation salaires enregistrée !");
      setConstatation(defaultConstatation);
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const paiementMutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      if (!paiement.employe_id) throw new Error("Sélectionnez un salarié");
      if (!paiement.tresorerie_id)
        throw new Error("Sélectionnez une trésorerie");
      const montant = Number(paiement.montant);
      if (!montant || montant <= 0) throw new Error("Montant invalide");

      const employe = employes?.find((e) => e.id === paiement.employe_id);
      const tresorerie = tresoreries?.find(
        (t) => t.id === paiement.tresorerie_id,
      );
      if (!employe) throw new Error("Salarié introuvable");

      const { data: ecriture, error } = await supabase
        .from("ecritures_comptables")
        .insert({
          entreprise_id: entreprise.id,
          libelle: `Paiement net salaire — ${employe.nom}`,
          date_ecriture: paiement.date_operation,
          type_operation: "salaire_paiement",
          created_by: compte?.session_id ?? null,
        } as EcritureInsert)
        .select()
        .single();
      if (error) throw error;

      const lignes: LigneInsert[] = [
        {
          ecriture_id: ecriture.id,
          numero_compte: employe.compte_principal ?? "421",
          libelle_compte: employe.nom,
          tiers_id: employe.id,
          debit: montant,
          credit: 0,
        },
        {
          ecriture_id: ecriture.id,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: paiement.tresorerie_id,
          debit: 0,
          credit: montant,
        },
      ];
      await supabase.from("lignes_ecriture").insert(lignes);
      await supabase.from("operations_hors_av").insert({
        entreprise_id: entreprise.id,
        type: "salaire_paiement",
        libelle: `Paiement net — ${employe.nom}`,
        date_operation: paiement.date_operation,
        montant,
        tiers_id: employe.id,
        tresorerie_id: paiement.tresorerie_id,
        ecriture_id: ecriture.id,
      } as OperationInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Paiement net salaire enregistré !");
      setPaiement(defaultPaiement);
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const etapes: { value: Etape; label: string }[] = [
    { value: "avance", label: "Étape 1 — Avance (15)" },
    { value: "constatation", label: "Étape 2 — Constatation (fin mois)" },
    { value: "paiement", label: "Étape 3 — Paiement net" },
  ];

  const handleClose = () => {
    setAvance(defaultAvance);
    setConstatation(defaultConstatation);
    setPaiement(defaultPaiement);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Salaires</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            {etapes.map((e) => (
              <button
                key={e.value}
                type="button"
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium text-left transition-colors",
                  etape === e.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted",
                )}
                onClick={() => setEtape(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>

          {etape === "avance" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={avance.date_operation}
                  onChange={(e) =>
                    setAvance((p) => ({ ...p, date_operation: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Salarié <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={avance.employe_id}
                  onValueChange={(v) =>
                    v && setAvance((p) => ({ ...p, employe_id: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un salarié...">
                      {
                        (employes ?? []).find((e) => e.id === avance.employe_id)
                          ?.nom
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(employes ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  Montant (MGA) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={avance.montant}
                  onChange={(e) =>
                    setAvance((p) => ({ ...p, montant: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Trésorerie <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={avance.tresorerie_id}
                  onValueChange={(v) =>
                    v && setAvance((p) => ({ ...p, tresorerie_id: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trésorerie...">
                      {
                        (tresoreries ?? []).find(
                          (t) => t.id === avance.tresorerie_id,
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={() => avanceMutation.mutate()}
                  disabled={avanceMutation.isPending}
                >
                  {avanceMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Enregistrer avance
                </Button>
              </div>
            </div>
          )}

          {etape === "constatation" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={constatation.date_operation}
                  onChange={(e) =>
                    setConstatation((p) => ({
                      ...p,
                      date_operation: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Montant global salaires nets (MGA){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={constatation.montant_global}
                  onChange={(e) =>
                    setConstatation((p) => ({
                      ...p,
                      montant_global: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Répartition par salarié{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {(employes ?? []).map((emp) => {
                  const ligne = constatation.employes.find(
                    (l) => l.employe_id === emp.id,
                  );
                  return (
                    <div key={emp.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{emp.nom}</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        className="w-36"
                        value={ligne?.montant ?? ""}
                        onChange={(e) =>
                          setConstatation((p) => {
                            const exists = p.employes.find(
                              (l) => l.employe_id === emp.id,
                            );
                            const updated = exists
                              ? p.employes.map((l) =>
                                  l.employe_id === emp.id
                                    ? { ...l, montant: e.target.value }
                                    : l,
                                )
                              : [
                                  ...p.employes,
                                  {
                                    employe_id: emp.id,
                                    montant: e.target.value,
                                  },
                                ];
                            return { ...p, employes: updated };
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={() => constatationMutation.mutate()}
                  disabled={constatationMutation.isPending}
                >
                  {constatationMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Constater
                </Button>
              </div>
            </div>
          )}

          {etape === "paiement" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={paiement.date_operation}
                  onChange={(e) =>
                    setPaiement((p) => ({
                      ...p,
                      date_operation: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Salarié <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={paiement.employe_id}
                  onValueChange={(v) =>
                    v && setPaiement((p) => ({ ...p, employe_id: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un salarié...">
                      {
                        (employes ?? []).find(
                          (e) => e.id === paiement.employe_id,
                        )?.nom
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(employes ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  Montant net restant (MGA){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={paiement.montant}
                  onChange={(e) =>
                    setPaiement((p) => ({ ...p, montant: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Trésorerie <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={paiement.tresorerie_id}
                  onValueChange={(v) =>
                    v && setPaiement((p) => ({ ...p, tresorerie_id: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trésorerie...">
                      {
                        (tresoreries ?? []).find(
                          (t) => t.id === paiement.tresorerie_id,
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={() => paiementMutation.mutate()}
                  disabled={paiementMutation.isPending}
                >
                  {paiementMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Enregistrer paiement
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
