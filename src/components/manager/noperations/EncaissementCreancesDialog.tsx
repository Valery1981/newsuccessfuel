"use client";

import { EcriturePreview } from "@/components/compta/EcriturePreview";
import { Badge } from "@/components/ui/badge";
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
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
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

function echeanceBadge(echeance: string | null) {
  if (!echeance) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(echeance);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        En retard
      </Badge>
    );
  if (diff <= 7)
    return (
      <Badge className="bg-orange-100 text-orange-700 gap-1">
        <Clock className="w-3 h-3" />
        {diff}j
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-700 gap-1">
      <CheckCircle2 className="w-3 h-3" />
      {diff}j
    </Badge>
  );
}

export function EncaissementCreancesDialog({ open, onClose }: Props) {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [montant, setMontant] = useState("");
  const [tresorerieId, setTresorerieId] = useState("");
  const [reference, setReference] = useState("");
  const [dateOp, setDateOp] = useState(new Date().toISOString().split("T")[0]);

  const { data: creances } = useQuery({
    queryKey: ["creances-ouvertes", entreprise?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vue_creances_en_cours")
        .select("*")
        .eq("entreprise_id", entreprise!.id)
        .order("echeance", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!entreprise?.id && open,
  });
  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () => tresorerieService.getTresoreriesByEntreprise(entreprise!.id),
    enabled: !!entreprise?.id && open,
  });

  const selected = creances?.find((c) => c.id === selectedId);
  const solde = selected
    ? (selected.montant_initial ?? 0) - (selected.montant_recouvre ?? 0)
    : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entreprise) throw new Error("Session invalide");
      if (!selectedId) throw new Error("Sélectionnez une créance");
      if (!tresorerieId) throw new Error("Sélectionnez une trésorerie");
      if (!reference.trim()) throw new Error("La référence est obligatoire");
      const montantEnc = Number(montant);
      if (!montantEnc || montantEnc <= 0) throw new Error("Montant invalide");
      if (montantEnc > solde + 0.01)
        throw new Error(
          `Montant dépasse le solde restant (${solde.toLocaleString("fr")} MGA)`,
        );
      if (!selected) throw new Error("Créance introuvable");

      const tresorerie = tresoreries?.find((t) => t.id === tresorerieId);
      let compteCreance = "411";
      if (selected.tiers_id) {
        const { data: tiersData } = await supabase
          .from("tiers")
          .select("compte_principal, compte_responsabilite, type")
          .eq("id", selected.tiers_id)
          .maybeSingle();
        if (tiersData) {
          compteCreance =
            selected.type_creance === "employe_460"
              ? (tiersData.compte_responsabilite ?? "460")
              : (tiersData.compte_principal ??
                (selected.tiers_type === "client" ? "411" : "460"));
        }
      }

      const { data: ecriture, error } = await supabase
        .from("ecritures_comptables")
        .insert({
          entreprise_id: entreprise.id,
          libelle: `Encaissement créance — ${selected.tiers_nom} — Réf: ${reference}`,
          date_ecriture: dateOp,
          type_operation: "encaissement_creance",
          reference_id: selectedId,
          reference_numero: reference,
          created_by: compte?.session_id ?? null,
        } as EcritureInsert)
        .select()
        .single();
      if (error) throw error;

      const lignes: LigneInsert[] = [
        {
          ecriture_id: ecriture.id,
          numero_compte: tresorerie?.numero_compte ?? "",
          libelle_compte: tresorerie?.libelle ?? "",
          tresorerie_id: tresorerieId,
          debit: montantEnc,
          credit: 0,
        },
        {
          ecriture_id: ecriture.id,
          numero_compte: compteCreance,
          libelle_compte: selected.tiers_nom ?? "",
          tiers_id: selected.tiers_id ?? undefined,
          debit: 0,
          credit: montantEnc,
        },
      ];
      await supabase.from("lignes_ecriture").insert(lignes);

      await supabase
        .from("creances")
        .update({
          montant_recouvre: (selected.montant_recouvre ?? 0) + montantEnc,
        })
        .eq("id", selectedId);
      await supabase.from("operations_hors_av").insert({
        entreprise_id: entreprise.id,
        type: "encaissement_creance",
        libelle: `Encaissement — ${selected.tiers_nom}`,
        date_operation: dateOp,
        montant: montantEnc,
        tiers_id: selected.tiers_id,
        tresorerie_id: tresorerieId,
        ecriture_id: ecriture.id,
      } as OperationInsert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creances-ouvertes"] });
      queryClient.invalidateQueries({ queryKey: ["operations-hors-av"] });
      toast.success("Encaissement enregistré !");
      setSelectedId("");
      setMontant("");
      setTresorerieId("");
      setReference("");
      setDateOp(new Date().toISOString().split("T")[0]);
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleClose = () => {
    setSelectedId("");
    setMontant("");
    setTresorerieId("");
    setReference("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Encaissement Créances</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Sélectionner une créance{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {(creances ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground p-3">
                  Aucune créance en cours
                </p>
              )}
              {(creances ?? []).map((c) => {
                const soldeC =
                  (c.montant_initial ?? 0) - (c.montant_recouvre ?? 0);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                      selectedId === c.id
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "",
                    )}
                    onClick={() => {
                      setSelectedId(c.id ?? "");
                      setMontant(soldeC.toString());
                    }}
                  >
                    <div>
                      <p className="font-medium">{c.tiers_nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.reference_numero} — Solde :{" "}
                        {soldeC.toLocaleString("fr")} MGA
                      </p>
                    </div>
                    {echeanceBadge(c.echeance)}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedId && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <p className="text-sm font-medium">
                Solde restant :{" "}
                <span className="text-primary">
                  {solde.toLocaleString("fr")} MGA
                </span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={dateOp}
                    onChange={(e) => setDateOp(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Référence <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={reference}
                    placeholder="Chèque N°..."
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>
                  Montant à encaisser (MGA){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={solde}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Trésorerie <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={tresorerieId}
                  onValueChange={(v) => v && setTresorerieId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trésorerie...">
                      {
                        (tresoreries ?? []).find((t) => t.id === tresorerieId)
                          ?.libelle
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
              {/* APEX-16-extra : Aperçu écriture comptable (§5.5-23) */}
              {tresorerieId && Number(montant) > 0 && (
                <EcriturePreview
                  title="Écriture qui sera générée"
                  currency="MGA"
                  lignes={[
                    {
                      libelleCompte:
                        (tresoreries ?? []).find((t) => t.id === tresorerieId)
                          ?.libelle ?? "Trésorerie",
                      debit: Number(montant),
                      credit: 0,
                      libelle: "Encaissement reçu",
                    },
                    {
                      libelleCompte: `Créance client${selected ? ` (${selected.tiers_nom ?? "—"})` : ""}`,
                      debit: 0,
                      credit: Number(montant),
                      libelle: "Extinction partielle/totale",
                    },
                  ]}
                />
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Enregistrer encaissement
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
