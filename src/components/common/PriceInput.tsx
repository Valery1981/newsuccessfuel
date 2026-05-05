"use client";

import { forwardRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input montant avec devise suffixée (§5.5-10 rules.md).
 * Wrapper autour de shadcn Input avec suffixe devise.
 */

export interface PriceInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  currency?: string;
  containerClassName?: string;
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  function PriceInput(
    { currency = "FCFA", containerClassName, className, ...props },
    ref,
  ) {
    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          ref={ref}
          type="number"
          step="0.01"
          className={cn("pr-16 text-right font-mono tabular-nums", className)}
          {...props}
        />
        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground pointer-events-none">
          {currency}
        </span>
      </div>
    );
  },
);
