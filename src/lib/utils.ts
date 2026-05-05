import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency = "MGA",
  locale = "fr-MG"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: string | Date, format = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return format
    .replace("dd", day)
    .replace("MM", month)
    .replace("yyyy", String(year))
    .replace("HH", hours)
    .replace("mm", minutes);
}

export function formatDatetime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Une erreur inattendue s'est produite";
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function interpolateVolume(
  calibrages: Array<{ hauteur_cm: number; volume_litres: number }>,
  jaugeCm: number
): number {
  if (calibrages.length === 0) return 0;

  const sorted = [...calibrages].sort((a, b) => a.hauteur_cm - b.hauteur_cm);

  const lower = [...sorted].reverse().find((c) => c.hauteur_cm <= jaugeCm);
  const upper = sorted.find((c) => c.hauteur_cm >= jaugeCm);

  if (!lower) return upper?.volume_litres ?? 0;
  if (!upper) return lower.volume_litres;
  if (lower.hauteur_cm === upper.hauteur_cm) return lower.volume_litres;

  return (
    lower.volume_litres +
    ((upper.volume_litres - lower.volume_litres) *
      (jaugeCm - lower.hauteur_cm)) /
      (upper.hauteur_cm - lower.hauteur_cm)
  );
}

export function calculerCmup(
  stockActuel: number,
  cmupActuel: number,
  quantiteEntree: number,
  prixAchat: number
): number {
  const totalStock = stockActuel + quantiteEntree;
  if (totalStock === 0) return cmupActuel;
  return (
    (stockActuel * cmupActuel + quantiteEntree * prixAchat) / totalStock
  );
}
