/**
 * Source unique de vérité pour les couleurs de graphiques (recharts).
 *
 * Pourquoi un module séparé ?
 *  - Recharts utilise des SVG inline qui ne lisent PAS les CSS variables.
 *  - On doit donc fournir des valeurs HEX explicites.
 *  - Centraliser ici évite la duplication des HEX dans tous les dashboards/rapports
 *    et garantit la cohérence avec la palette §4 rules.md.
 *
 * Référence : §4 rules.md — Palette officielle SUCCESSFUEL.
 */

/** Palette officielle §4 rules.md */
export const PALETTE = {
  or: "#F5820A", // Orange dominant (CTA, accents)
  orLight: "rgba(245,130,10,0.12)",
  blu: "#2B7CC1", // Bleu pistolet
  nav: "#1B3D6F", // Bleu marine sidebar
  nav3: "#0F2240",
  grn: "#5BB544", // Vert positif
  bg: "#0F1C2E",
  card: "#1A2B3E",
  txt: "#F0F4F8",
  txt2: "#94A8BE",
  brd: "rgba(255,255,255,0.07)",
  red: "#F04444",
  gold: "#F5A623",
} as const;

/** Couleurs primaires pour graphiques (5 couleurs distinctes) */
export const CHART_COLORS = [
  PALETTE.or,
  PALETTE.blu,
  PALETTE.grn,
  PALETTE.gold,
  PALETTE.red,
] as const;

/** Mapping statut → couleur (pour graphiques par statut) */
export const STATUS_COLORS = {
  validee: PALETTE.grn,
  active: PALETTE.grn,
  cloture: PALETTE.grn,
  positif: PALETTE.grn,

  en_attente: PALETTE.gold,
  brouillon: PALETTE.gold,
  urgent: PALETTE.gold,

  suspendue: PALETTE.red,
  annulee: PALETTE.red,
  rupture: PALETTE.red,
  negatif: PALETTE.red,

  primary: PALETTE.or,
  secondary: PALETTE.blu,
} as const;

/** Couleurs de tendance pour KPIs */
export const TREND_COLORS = {
  positive: PALETTE.grn,
  negative: PALETTE.red,
  neutral: PALETTE.txt2,
} as const;
