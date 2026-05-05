"use client";

import { Clock, Fuel, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Carte résumé d'un shift carburant (§5.5-15 rules.md).
 * Affiche : station, pompiste, pistolet(s), index, volume, CA, paiements, écart.
 */

export interface ShiftCardProps {
  stationNom: string;
  pompisteNom: string;
  pistoletNumero?: string | number;
  typeCarburant?: string;
  indexInitial: number;
  indexFinal: number | null;
  ca?: number;
  ecart?: number;
  statut: "ouvert" | "cloture";
  dateOuverture: string;
  dateCloture?: string | null;
  currency?: string;
  className?: string;
}

const formatNum = (n: number, digits = 3): string =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

const formatMontant = (n: number, currency = "FCFA"): string =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${currency}`;

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function ShiftCard({
  stationNom,
  pompisteNom,
  pistoletNumero,
  typeCarburant,
  indexInitial,
  indexFinal,
  ca,
  ecart,
  statut,
  dateOuverture,
  dateCloture,
  currency = "FCFA",
  className,
}: ShiftCardProps) {
  const volume = indexFinal !== null ? indexFinal - indexInitial : null;
  const isOuvert = statut === "ouvert";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{stationNom}</CardTitle>
          <Badge variant={isOuvert ? "default" : "secondary"}>
            {isOuvert ? "Ouvert" : "Clôturé"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <User className="h-3 w-3" aria-hidden="true" />
          <span>{pompisteNom}</span>
          {pistoletNumero != null && (
            <>
              <span aria-hidden="true">•</span>
              <Fuel className="h-3 w-3" aria-hidden="true" />
              <span>
                Pistolet {pistoletNumero}
                {typeCarburant ? ` (${typeCarburant})` : ""}
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Index initial</p>
            <p className="font-mono tabular-nums">{formatNum(indexInitial)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Index final</p>
            <p className="font-mono tabular-nums">
              {indexFinal !== null ? formatNum(indexFinal) : "—"}
            </p>
          </div>
        </div>

        {volume !== null && (
          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Volume</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatNum(volume)} L
            </span>
          </div>
        )}

        {typeof ca === "number" && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">CA</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatMontant(ca, currency)}
            </span>
          </div>
        )}

        {typeof ecart === "number" && ecart !== 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Écart</span>
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                ecart > 0 ? "text-orange-600" : "text-destructive",
              )}
            >
              {ecart > 0 ? "+" : ""}
              {formatMontant(ecart, currency)}
            </span>
          </div>
        )}

        <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>Ouvert : {formatDate(dateOuverture)}</span>
          {dateCloture && (
            <>
              <span aria-hidden="true">•</span>
              <span>Clos : {formatDate(dateCloture)}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
