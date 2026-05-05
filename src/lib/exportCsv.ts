/**
 * Exporte un tableau de données au format CSV et déclenche le téléchargement.
 * @param rows Tableau d'objets (chaque objet = une ligne)
 * @param filename Nom du fichier sans extension
 */
export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(";"),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        // Échapper les guillemets et encadrer si nécessaire
        return str.includes(";") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(";")
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
