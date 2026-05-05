"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { EcriturePreview } from "./EcriturePreview";

/**
 * Dialog d'aperçu et confirmation de comptabilisation d'un achat (APEX-16-suite).
 *
 * Affiche les écritures comptables qui seront générées (D/C par compte)
 * + `PartieDoubleCheck` qui bloque la validation si déséquilibrée.
 *
 * Utilisable pour AchatCarburant et AchatBoutique (structure D/C identique).
 */

export interface ComptabiliserAchatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Description de l'achat (n° BC/BL, fournisseur, date) */
  description: string;
  /** Montant total facture (Débit "Achats") */
  montantFacture: number;
  /** Montant payé (Crédit "Trésorerie") */
  totalPaye: number;
  /** Libellé du compte trésorerie utilisé (ex: "Caisse principale") */
  libelleTresorerie?: string;
  /** Libellé du compte achat (ex: "Achats carburant") */
  libelleAchat?: string;
  /** Libellé du compte fournisseur (ex: "Fournisseur Total Madagascar") */
  libelleFournisseur?: string;
  /** Devise (défaut FCFA) */
  currency?: string;
  /** Confirmation finale */
  onConfirm: () => void;
  /** Pending state du parent */
  isPending?: boolean;
}

export function ComptabiliserAchatDialog({
  open,
  onOpenChange,
  description,
  montantFacture,
  totalPaye,
  libelleTresorerie = "Trésorerie",
  libelleAchat = "Achats",
  libelleFournisseur = "Fournisseur",
  currency = "FCFA",
  onConfirm,
  isPending,
}: ComptabiliserAchatDialogProps) {
  const [isBalanced, setIsBalanced] = useState(false);

  const credit = totalPaye;
  const dette = montantFacture - totalPaye;

  const lignes = [
    {
      libelleCompte: libelleAchat,
      debit: montantFacture,
      credit: 0,
      libelle: "Charge de la période",
    },
    ...(credit > 0
      ? [
          {
            libelleCompte: libelleTresorerie,
            debit: 0,
            credit: credit,
            libelle: "Paiement immédiat",
          },
        ]
      : []),
    ...(dette > 0
      ? [
          {
            libelleCompte: libelleFournisseur,
            debit: 0,
            credit: dette,
            libelle: "Reste à payer",
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comptabiliser l&apos;achat</DialogTitle>
          <DialogDescription>
            Vérifiez l&apos;écriture qui sera enregistrée avant de confirmer.
            Cette opération est irréversible.
          </DialogDescription>
        </DialogHeader>

        <EcriturePreview
          lignes={lignes}
          description={description}
          currency={currency}
          onBalanceChange={setIsBalanced}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isBalanced || isPending}
            title={
              !isBalanced
                ? "Écriture déséquilibrée — impossible de comptabiliser (§6.1)"
                : undefined
            }
          >
            {isPending
              ? "Comptabilisation..."
              : "Confirmer la comptabilisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
