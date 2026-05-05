"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Select comptes de trésorerie avec solde affiché (§5.5-14 rules.md).
 * Règle absolue : afficher noms (libellés), pas les numéros de comptes.
 */

export interface TresorerieOption {
  id: string;
  libelle: string;
  solde?: number | null;
  type?: "caisse" | "banque" | "mobile";
}

export interface TresorerieSelectProps {
  options: TresorerieOption[];
  value?: string | null;
  onValueChange?: (id: string | null) => void;
  placeholder?: string;
  currency?: string;
  className?: string;
  disabled?: boolean;
  /** Affiche le solde à droite de chaque option (défaut true) */
  showSolde?: boolean;
}

const formatMontant = (n: number, currency: string): string =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${currency}`;

export function TresorerieSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner un compte...",
  currency = "FCFA",
  className,
  disabled,
  showSolde = true,
}: TresorerieSelectProps) {
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v: string | null) => onValueChange?.(v ?? null)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Aucun compte disponible
          </div>
        ) : (
          options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span className="flex items-center justify-between gap-3 w-full">
                <span>
                  {o.libelle}
                  {o.type && (
                    <span className="text-xs text-muted-foreground ml-1 capitalize">
                      ({o.type})
                    </span>
                  )}
                </span>
                {showSolde && typeof o.solde === "number" && (
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {formatMontant(o.solde, currency)}
                  </span>
                )}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
