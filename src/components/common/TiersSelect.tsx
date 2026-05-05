"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Select tiers avec affichage par nom (§5.5-13 rules.md).
 * Règle absolue : afficher les noms, JAMAIS les IDs.
 * Filtre optionnel par type (fournisseur, client, employe).
 */

export type TiersType = "fournisseur" | "client" | "employe";

export interface TiersOption {
  id: string;
  nom: string;
  type?: TiersType;
}

export interface TiersSelectProps {
  options: TiersOption[];
  value?: string | null;
  onValueChange?: (id: string | null) => void;
  placeholder?: string;
  /** Filtrer par type(s) — affiche tous si non fourni */
  filterTypes?: TiersType[];
  className?: string;
  disabled?: boolean;
}

export function TiersSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner un tiers...",
  filterTypes,
  className,
  disabled,
}: TiersSelectProps) {
  const filtered = filterTypes
    ? options.filter((o) => o.type && filterTypes.includes(o.type))
    : options;

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
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Aucun tiers disponible
          </div>
        ) : (
          filtered.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {/* Affichage par nom uniquement — règle §4 rules.md */}
              {t.nom}
              {t.type && (
                <span className="text-xs text-muted-foreground ml-2 capitalize">
                  ({t.type})
                </span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
