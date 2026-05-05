/**
 * Export Excel (.xls HTML) sans dépendance externe.
 *
 * Approche : générer un fichier `.xls` au format HTML Spreadsheet — Excel
 * (et LibreOffice/Numbers) l'ouvre nativement et préserve la mise en forme.
 *
 * Avantages vs `xlsx` package :
 *  - 0 dépendance (~0 KB ajoutés au bundle)
 *  - Suffit pour rapports tabulaires standards
 *  - Compatible FR (UTF-8 BOM + locale FR)
 *
 * Limitation : pas de formules, formats de cellules avancés, multi-sheets.
 * Pour des rapports avancés, migrer vers `xlsx` ou `exceljs` (APEX futur).
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export interface ExportXlsOptions {
  /** Titre de la feuille (apparaît dans Excel) */
  sheetName?: string;
  /** En-têtes de colonnes — si non fourni, déduits de la 1ère ligne */
  headers?: string[];
  /** Nom du fichier sans extension */
  filename: string;
}

/**
 * Génère le HTML SpreadsheetML pour un .xls.
 * Fonction pure — utilisée par `exportXls()` mais aussi testable seule (sans DOM).
 */
export function buildXlsHtml(
  rows: Record<string, unknown>[],
  options: Omit<ExportXlsOptions, "filename"> = {},
): string {
  if (rows.length === 0) return "";
  const headers = options.headers ?? Object.keys(rows[0]);
  const sheetName = options.sheetName ?? "Feuille 1";

  const headerRow = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");

  const dataRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((h) => {
            const val = row[h];
            const str = val == null ? "" : String(val);
            const isNumber = typeof val === "number" && Number.isFinite(val);
            const cellAttr = isNumber ? ' x:num="1"' : "";
            return `<td${cellAttr}>${escapeHtml(str)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(sheetName)}</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    table { border-collapse: collapse; }
    th { background: #F5820A; color: #fff; font-weight: bold; padding: 6px 10px; border: 1px solid #ccc; }
    td { padding: 4px 8px; border: 1px solid #ccc; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${dataRows}</tbody>
  </table>
</body>
</html>`;
}

/**
 * Exporte un tableau d'objets au format .xls (HTML Spreadsheet).
 * Déclenche le téléchargement côté client (utilise `document` + `URL`).
 */
export function exportXls(
  rows: Record<string, unknown>[],
  options: ExportXlsOptions,
): void {
  if (rows.length === 0) return;
  const html = buildXlsHtml(rows, options);
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${options.filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
