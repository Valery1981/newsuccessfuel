"use client";

import { Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Jauge niveau d'un compte de trésorerie (§5.5-27 rules.md).
 * Affiche solde courant + ratio vs plafond cible si fourni.
 */

export interface TresorerieGaugeProps {
  /** Nom du compte (ex: "Caisse principale", "BNI N°123") */
  libelle: string;
  /** Solde courant */
  solde: number;
  /** Plafond cible / objectif (optionnel — sinon pas de jauge) */
  cible?: number;
  /** Type de compte pour icône/couleur */
  type?: "caisse" | "banque" | "mobile";
  currency?: string;
  className?: string;
}

const formatMontant = (n: number, currency: string): string =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${currency}`;

export function TresorerieGauge({
  libelle,
  solde,
  cible,
  type = "caisse",
  currency = "FCFA",
  className,
}: TresorerieGaugeProps) {
  const ratio =
    cible && cible > 0 ? Math.min(Math.max(solde / cible, 0), 1.5) : null;
  const isNegatif = solde < 0;

  let barColor = "bg-muted-foreground";
  if (ratio !== null) {
    if (ratio >= 1) barColor = "bg-green-500";
    else if (ratio >= 0.5) barColor = "bg-blue-500";
    else if (ratio >= 0.2) barColor = "bg-orange-500";
    else barColor = "bg-destructive";
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet
              className="h-4 w-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wide">
              {libelle}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground capitalize">
            {type}
          </span>
        </div>

        <p
          className={cn(
            "text-xl font-bold tabular-nums",
            isNegatif && "text-destructive",
          )}
        >
          {formatMontant(solde, currency)}
        </p>

        {cible && cible > 0 && ratio !== null && (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all", barColor)}
                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(ratio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${libelle} — ${Math.round(ratio * 100)} % de la cible`}
              />
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Cible : {formatMontant(cible, currency)} (
              {(ratio * 100).toFixed(0)} %)
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
