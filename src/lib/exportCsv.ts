/**
 * Exporte un tableau de données au format CSV (Excel français).
 * - Séparateur colonnes : point-virgule
 * - Décimales : virgule
 * - BOM UTF-8
 */

/** Formate un nombre pour Excel FR (virgule décimale, sans séparateur milliers). */
export function formatCsvNumber(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  const rounded = Math.round(n * 100) / 100;
  return rounded.toFixed(2).replace(".", ",");
}

function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return formatCsvNumber(value);
  const str = String(value);
  return str.includes(";") || str.includes('"') || str.includes("\n")
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

/**
 * Exporte un tableau de données au format CSV et déclenche le téléchargement.
 */
export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(";"),
    ...rows.map((row) =>
      headers.map((h) => formatCsvCell(row[h])).join(";"),
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
