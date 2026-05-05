"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { PartieDoubleCheck } from "./PartieDoubleCheck";

/**
 * Aperçu d'une écriture comptable avant validation (§5.5-23 rules.md).
 *
 * Affiche :
 *  - Tableau des lignes (compte libellé, débit, crédit)
 *  - Composant `PartieDoubleCheck` qui vérifie ∑D = ∑C (§6.1 BLOQUANT)
 *
 * Règle §6.1 : numéros de comptes invisibles en frontend SAUF Grand Livre/Balance.
 * Ici on affiche uniquement les libellés.
 */

export interface EcritureLigne {
  /** Libellé du compte (jamais le numéro — §6.1) */
  libelleCompte: string;
  /** Montant au débit (ou 0) */
  debit: number;
  /** Montant au crédit (ou 0) */
  credit: number;
  /** Libellé optionnel de la ligne */
  libelle?: string;
}

export interface EcriturePreviewProps {
  lignes: EcritureLigne[];
  /** Titre optionnel de l'aperçu */
  title?: string;
  /** Description / référence (n° BC, BL, facture) */
  description?: string;
  /** Devise affichée */
  currency?: string;
  /** Callback notifié quand l'équilibre change (pour bloquer Comptabiliser) */
  onBalanceChange?: (isBalanced: boolean) => void;
  className?: string;
}

const formatMontant = (n: number, currency?: string): string => {
  if (n === 0) return "—";
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${formatted} ${currency}` : formatted;
};

export function EcriturePreview({
  lignes,
  title = "Aperçu de l'écriture comptable",
  description,
  currency,
  onBalanceChange,
  className,
}: EcriturePreviewProps) {
  const debits = lignes.map((l) => l.debit);
  const credits = lignes.map((l) => l.credit);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compte</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l, i) => (
                <TableRow key={`${l.libelleCompte}-${i}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{l.libelleCompte}</p>
                      {l.libelle && (
                        <p className="text-xs text-muted-foreground">
                          {l.libelle}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-sm">
                    {formatMontant(l.debit, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-sm">
                    {formatMontant(l.credit, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <PartieDoubleCheck
          debits={debits}
          credits={credits}
          currency={currency}
          onBalanceChange={(isBalanced) => onBalanceChange?.(isBalanced)}
        />
      </CardContent>
    </Card>
  );
}
