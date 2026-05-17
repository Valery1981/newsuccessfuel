"use client";

import { EcriturePreview } from "@/components/compta/EcriturePreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LigneComptaStockAchat } from "@/lib/achatCarburant";
import { Loader2 } from "lucide-react";

interface ComptabiliserStockAchatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  lignes: LigneComptaStockAchat[];
  onConfirm: () => void;
  isPending: boolean;
}

export function ComptabiliserStockAchatDialog({
  open,
  onOpenChange,
  description,
  lignes,
  onConfirm,
  isPending,
}: ComptabiliserStockAchatDialogProps) {
  const previewLignes = lignes.map((l) => ({
    libelleCompte: `${l.numeroCompte} — ${l.libelleCompte}`,
    debit: l.debit,
    credit: l.credit,
    libelle: l.libelle,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Comptabiliser l&apos;achat carburant</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Écriture stock : Débit 310/320/330 — Crédit 401 fournisseur (hors
          paiements déjà enregistrés).
        </p>
        <EcriturePreview lignes={previewLignes} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isPending || lignes.length === 0}>
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Valider la comptabilisation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
