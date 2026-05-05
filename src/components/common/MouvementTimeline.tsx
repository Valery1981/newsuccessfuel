"use client";

import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Package,
  ShoppingBag,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Timeline historique des mouvements de stock par article (§5.5-24 rules.md).
 * Affiche en vertical chronologique : type, quantité, sens (entrée/sortie), CMUP snapshot.
 */

export type MouvementType =
  | "entree_achat"
  | "sortie_vente"
  | "transfert_entrant"
  | "transfert_sortant"
  | "regularisation_in"
  | "regularisation_out";

export interface MouvementItem {
  id: string;
  date: string;
  type: MouvementType;
  quantite: number;
  cmupSnapshot?: number | null;
  motif?: string | null;
  reference?: string | null;
}

export interface MouvementTimelineProps {
  mouvements: MouvementItem[];
  unite?: string;
  className?: string;
  emptyMessage?: string;
}

const formatNum = (n: number): string =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n);

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const TYPE_CONFIG: Record<
  MouvementType,
  { label: string; icon: typeof Package; color: string; sens: "in" | "out" }
> = {
  entree_achat: {
    label: "Achat",
    icon: ShoppingBag,
    color: "text-green-600 bg-green-500/10 border-green-500/30",
    sens: "in",
  },
  sortie_vente: {
    label: "Vente",
    icon: ArrowUpRight,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/30",
    sens: "out",
  },
  transfert_entrant: {
    label: "Transfert entrant",
    icon: ArrowDownLeft,
    color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/30",
    sens: "in",
  },
  transfert_sortant: {
    label: "Transfert sortant",
    icon: ArrowRightLeft,
    color: "text-orange-600 bg-orange-500/10 border-orange-500/30",
    sens: "out",
  },
  regularisation_in: {
    label: "Régularisation +",
    icon: Package,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
    sens: "in",
  },
  regularisation_out: {
    label: "Régularisation −",
    icon: Package,
    color: "text-red-600 bg-red-500/10 border-red-500/30",
    sens: "out",
  },
};

export function MouvementTimeline({
  mouvements,
  unite = "L",
  className,
  emptyMessage = "Aucun mouvement",
}: MouvementTimelineProps) {
  if (mouvements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ol className={cn("space-y-3", className)}>
      {mouvements.map((m) => {
        const cfg = TYPE_CONFIG[m.type];
        const Icon = cfg.icon;
        const sign = cfg.sens === "in" ? "+" : "−";

        return (
          <li key={m.id} className="flex gap-3">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                cfg.color,
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pb-3 border-b last:border-b-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{cfg.label}</span>
                <span
                  className={cn(
                    "font-mono text-sm tabular-nums",
                    cfg.sens === "in" ? "text-green-600" : "text-destructive",
                  )}
                >
                  {sign} {formatNum(m.quantite)} {unite}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{formatDate(m.date)}</span>
                {m.cmupSnapshot != null && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>CMUP : {formatNum(m.cmupSnapshot)}</span>
                  </>
                )}
                {m.reference && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>Réf : {m.reference}</span>
                  </>
                )}
              </div>
              {m.motif && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">
                  {m.motif}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
