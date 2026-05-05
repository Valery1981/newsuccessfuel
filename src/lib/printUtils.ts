/**
 * Utilitaires d'impression — SuccessFuel
 * Approche : window.print() via un onglet temporaire.
 * Compatible avec la fonction "Enregistrer en PDF" du navigateur.
 */

const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; background: white; padding: 20px; }
  h1 { font-size: 20px; font-weight: bold; color: #F5820A; margin-bottom: 2px; }
  h2 { font-size: 13px; font-weight: bold; margin: 12px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
  th { background: #f5f5f5; font-weight: bold; text-align: left; border: 1px solid #ccc; padding: 5px 7px; }
  td { border: 1px solid #ccc; padding: 5px 7px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #F5820A; padding-bottom: 12px; margin-bottom: 16px; }
  .header-left h1 { color: #F5820A; }
  .header-right { text-align: right; font-size: 11px; color: #555; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .meta-item label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; display: block; margin-bottom: 2px; }
  .meta-item strong { font-size: 13px; }
  .total-section { margin-top: 12px; border-top: 2px solid #333; padding-top: 8px; display: flex; justify-content: flex-end; gap: 40px; }
  .total-section .label { font-size: 11px; color: #555; }
  .total-section .value { font-size: 14px; font-weight: bold; }
  .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 9px; color: #888; text-align: center; }
  .badge { display: inline-block; padding: 1px 8px; border: 1px solid #ccc; border-radius: 2px; font-size: 10px; }
  .badge-green { border-color: #16a34a; color: #16a34a; }
  .badge-blue { border-color: #2563eb; color: #2563eb; }
  .badge-orange { border-color: #ea580c; color: #ea580c; }
  .signature-row { display: flex; justify-content: space-between; margin-top: 32px; }
  .signature-box { width: 200px; border-top: 1px solid #333; padding-top: 4px; font-size: 10px; text-align: center; }
  @media print { @page { margin: 15mm; } }
`;

/**
 * Ouvre un onglet temporaire avec le HTML fourni et déclenche l'impression.
 */
export function openPrintWindow(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Veuillez autoriser les popups pour imprimer.");
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>${bodyHtml}</body>
</html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// ─────────────────────────────────────────────
// Templates HTML pour documents officiels
// ─────────────────────────────────────────────

export interface ShiftPrintData {
  date_shift: string;
  cloture_at?: string | null;
  pompiste_nom?: string;
  pistolet_numero?: string;
  index_initial: number;
  index_final?: number | null;
  volume_vendu?: number | null;
  ca_total?: number | null;
  station_nom?: string;
  entreprise_nom?: string;
}

export function buildShiftPrintHtml(data: ShiftPrintData): string {
  const volumeL = data.volume_vendu ?? (data.index_final ? data.index_final - data.index_initial : 0);
  const printedAt = new Date().toLocaleString("fr-FR");

  return `
  <div class="header">
    <div class="header-left">
      <h1>SuccessFuel</h1>
      <div style="font-size:11px;color:#555">${data.entreprise_nom ?? ""}</div>
      <div style="font-size:11px;color:#555">${data.station_nom ?? ""}</div>
    </div>
    <div class="header-right">
      <strong style="font-size:14px">DOCUMENT OFFICIEL — SHIFT CARBURANT</strong><br>
      Imprimé le ${printedAt}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><label>Date shift</label><strong>${new Date(data.date_shift).toLocaleDateString("fr-FR")}</strong></div>
    <div class="meta-item"><label>Clôturé à</label><strong>${data.cloture_at ? new Date(data.cloture_at).toLocaleTimeString("fr-FR") : "—"}</strong></div>
    <div class="meta-item"><label>Pompiste</label><strong>${data.pompiste_nom ?? "—"}</strong></div>
    <div class="meta-item"><label>Pistolet N°</label><strong>${data.pistolet_numero ?? "—"}</strong></div>
    <div class="meta-item"><label>Index initial</label><strong>${data.index_initial.toLocaleString("fr-FR")}</strong></div>
    <div class="meta-item"><label>Index final</label><strong>${data.index_final?.toLocaleString("fr-FR") ?? "—"}</strong></div>
  </div>

  <h2>Résultats du shift</h2>
  <table>
    <thead>
      <tr>
        <th>Indicateur</th>
        <th>Valeur</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Volume vendu (L)</td><td><strong>${volumeL.toLocaleString("fr-FR")} L</strong></td></tr>
      <tr><td>CA total (MGA)</td><td><strong>${(data.ca_total ?? 0).toLocaleString("fr-FR")} MGA</strong></td></tr>
      <tr><td>Écart volume</td><td>Voir rapport écarts</td></tr>
    </tbody>
  </table>

  <div class="signature-row">
    <div class="signature-box">Signature Pompiste</div>
    <div class="signature-box">Signature Responsable</div>
    <div class="signature-box">Cachet Station</div>
  </div>

  <div class="footer">
    Document officiel SuccessFuel — Shift du ${new Date(data.date_shift).toLocaleDateString("fr-FR")} —
    ${data.station_nom ?? ""} — Généré le ${printedAt}
  </div>`;
}

export interface BLPrintData {
  numero_bc: string;
  numero_bl?: string | null;
  fournisseur_nom?: string;
  date_commande: string;
  date_livraison?: string | null;
  montant_facture: number;
  total_paye: number;
  entreprise_nom?: string;
}

export function buildBLPrintHtml(data: BLPrintData): string {
  const printedAt = new Date().toLocaleString("fr-FR");
  const solde = data.montant_facture - data.total_paye;

  return `
  <div class="header">
    <div class="header-left">
      <h1>SuccessFuel</h1>
      <div style="font-size:11px;color:#555">${data.entreprise_nom ?? ""}</div>
    </div>
    <div class="header-right">
      <strong style="font-size:14px">BON DE LIVRAISON / FACTURE</strong><br>
      N° BC : <strong>${data.numero_bc}</strong><br>
      ${data.numero_bl ? `N° BL : <strong>${data.numero_bl}</strong><br>` : ""}
      Imprimé le ${printedAt}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><label>Fournisseur</label><strong>${data.fournisseur_nom ?? "—"}</strong></div>
    <div class="meta-item"><label>Date commande</label><strong>${new Date(data.date_commande).toLocaleDateString("fr-FR")}</strong></div>
    <div class="meta-item"><label>Date livraison</label><strong>${data.date_livraison ? new Date(data.date_livraison).toLocaleDateString("fr-FR") : "—"}</strong></div>
  </div>

  <h2>Détail financier</h2>
  <table>
    <thead>
      <tr><th>Élément</th><th>Montant (MGA)</th></tr>
    </thead>
    <tbody>
      <tr><td>Montant facture</td><td>${data.montant_facture.toLocaleString("fr-FR")}</td></tr>
      <tr><td>Total payé</td><td>${data.total_paye.toLocaleString("fr-FR")}</td></tr>
      <tr>
        <td><strong>Solde restant</strong></td>
        <td><strong style="color:${solde > 0 ? "#dc2626" : "#16a34a"}">${solde.toLocaleString("fr-FR")}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="signature-row">
    <div class="signature-box">Réceptionné par</div>
    <div class="signature-box">Signature Fournisseur</div>
    <div class="signature-box">Cachet Entreprise</div>
  </div>

  <div class="footer">
    Document officiel SuccessFuel — BC N° ${data.numero_bc} — Généré le ${printedAt}
  </div>`;
}

export interface TicketPrintData {
  ticket_id: string;
  station_nom?: string;
  entreprise_nom?: string;
  items: Array<{ nom: string; quantite: number; prix_unitaire: number }>;
  total: number;
  mode_paiement: string;
}

const PAIEMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  cheque: "Chèque",
  credit_client: "Crédit client",
};

export function buildTicketPrintHtml(data: TicketPrintData): string {
  const printedAt = new Date().toLocaleString("fr-FR");
  const lignesHtml = data.items
    .map(
      (item) => `<tr>
        <td>${item.nom}</td>
        <td style="text-align:center">${item.quantite}</td>
        <td style="text-align:right">${item.prix_unitaire.toLocaleString("fr-FR")}</td>
        <td style="text-align:right"><strong>${(item.quantite * item.prix_unitaire).toLocaleString("fr-FR")}</strong></td>
      </tr>`,
    )
    .join("");

  return `
  <div style="max-width:360px;margin:0 auto">
    <div style="text-align:center;border-bottom:2px solid #F5820A;padding-bottom:10px;margin-bottom:12px">
      <h1 style="font-size:16px">SuccessFuel</h1>
      <div style="font-size:11px">${data.entreprise_nom ?? ""}</div>
      <div style="font-size:11px">${data.station_nom ?? ""}</div>
      <div style="font-size:10px;color:#666;margin-top:4px">${printedAt}</div>
      <div style="font-size:10px;color:#666">Ticket N° ${data.ticket_id.slice(-8).toUpperCase()}</div>
    </div>

    <table>
      <thead>
        <tr><th>Article</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr>
      </thead>
      <tbody>${lignesHtml}</tbody>
    </table>

    <div style="border-top:2px solid #333;margin-top:8px;padding-top:8px;text-align:right">
      <div style="font-size:10px;color:#555">Mode de paiement : ${PAIEMENT_LABELS[data.mode_paiement] ?? data.mode_paiement}</div>
      <div style="font-size:16px;font-weight:bold;margin-top:4px">TOTAL : ${data.total.toLocaleString("fr-FR")} MGA</div>
    </div>

    <div style="text-align:center;margin-top:16px;font-size:10px;color:#888;border-top:1px dashed #ccc;padding-top:8px">
      Merci de votre achat — SuccessFuel
    </div>
  </div>`;
}
