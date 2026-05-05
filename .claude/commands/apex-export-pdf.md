---
description: APEX — Implémenter l'export PDF pour tous les rapports (react-pdf ou window.print avec CSS d'impression)
argument-hint: <aucun — lancer directement>
---

<objective>
Selon §13 du Guide Document : tous les rapports doivent être "Imprimables PDF + Exportables Excel".
L'export CSV existe déjà (src/lib/utils.ts exportCsv).
L'export PDF manque COMPLÈTEMENT.
De plus, des documents spécifiques doivent être imprimables :
- Détails shift carburant (document officiel — §10.2)
- BL/Facture achat carburant (§10.1)
- Tickets boutique (§10.4)
La solution recommandée : CSS d'impression (window.print) pour les rapports tabulaires + react-pdf pour les documents officiels (BL, shift, ticket).
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §13 "RAPPORTS — Règles communes" (Imprimable PDF + Exportable Excel)
- guide/Guide_Document_SuccessFuel.md §10.1 BL/Facture (imprimable une fois mouvementé ET comptabilisé)
- guide/Guide_Document_SuccessFuel.md §10.2 Vente carburant ("Voir Détails imprimable = document officiel du shift")
- src/components/reports/ReportLayout.tsx (à modifier pour ajouter bouton PDF)
- src/components/manager/fuel-purchase/AchatCarburantPage.tsx (BL/Facture)
- src/components/manager/fuel-sale/VenteCarburantPage.tsx (détail shift)
- src/components/manager/shop-sales/ManagerShopSalesPage.tsx (tickets)
- src/lib/utils.ts (exportCsv existant — ajouter exportPdf)
- package.json (dépendances actuelles)

Stratégie recommandée (2 approches selon le cas) :
1. window.print() + CSS @media print — pour TOUS les rapports tabulaires (simple, pas de dépendance)
2. @react-pdf/renderer — pour documents officiels (BL/Facture, Détail Shift, Tickets boutique)
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire ReportLayout.tsx pour voir où placer le bouton "Imprimer PDF"
2. Lire exportCsv dans utils.ts pour comprendre le pattern d'export existant
3. Vérifier AchatCarburantPage.tsx onglet BL/Facture — structure du récapitulatif à imprimer
4. Vérifier VenteCarburantPage.tsx — structure du détail shift à imprimer
5. Vérifier package.json pour voir si @react-pdf/renderer est déjà installé
6. Tester window.print() pour vérifier si les styles Tailwind survivent à l'impression

## ÉTAPE 2 — PLAN
Approche :
- Rapports tabulaires (Grand Livre, Balance, CA, Stocks, etc.) → CSS @media print + bouton "Imprimer"
- Documents officiels (BL/Facture, Détail Shift, Ticket boutique) → @react-pdf/renderer

Fichiers à créer :
```
src/lib/
└── printUtils.ts              # Utilitaires impression (window.print, formatDocument)

src/components/reports/
└── PrintButton.tsx            # Bouton "Imprimer PDF" réutilisable

src/components/print/
├── ShiftCarburantPDF.tsx      # Document PDF officiel shift carburant
├── BLFacturePDF.tsx           # Document PDF BL/Facture achat carburant
└── TicketBoutiquePDF.tsx      # Ticket caisse boutique PDF
```

Fichiers à modifier :
- src/components/reports/ReportLayout.tsx — ajouter PrintButton
- src/app/globals.css — ajouter styles @media print
- src/components/manager/fuel-sale/VenteCarburantPage.tsx — intégrer ShiftCarburantPDF
- src/components/manager/fuel-purchase/AchatCarburantPage.tsx — intégrer BLFacturePDF
- src/components/manager/shop-sales/ManagerShopSalesPage.tsx — intégrer TicketBoutiquePDF

## ÉTAPE 3 — EXECUTE
Étape 3.1 — CSS d'impression pour rapports tabulaires :
```css
/* globals.css */
@media print {
  /* Masquer sidebar, header, boutons */
  .no-print, nav, aside, header, .print-hidden { display: none !important; }
  /* Forcer fond blanc */
  body { background: white !important; }
  /* Forcer texte noir */
  * { color: black !important; }
  /* Pagination automatique */
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  /* En-tête répété sur chaque page */
  thead { display: table-header-group; }
}
```

Étape 3.2 — PrintButton.tsx :
```typescript
export function PrintButton({ label = "Imprimer PDF" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()} className="no-print">
      <Printer className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
```

Étape 3.3 — Installer @react-pdf/renderer :
```bash
npm install @react-pdf/renderer
```

Étape 3.4 — ShiftCarburantPDF.tsx (document officiel shift) :
Contenu : Station, Pompiste, Date, Pistolet(s), Index initial/final, Volume, CA par produit, Détail paiements, Écarts
Signé par : "Clôturé le [date] par [responsable]"

Étape 3.5 — BLFacturePDF.tsx :
Contenu : N° BC, N° BL, N° Camion, Date livraison, Fournisseur, Compartiments, Quantités, Montant, Paiements, Écarts livraison

Étape 3.6 — TicketBoutiquePDF.tsx :
Contenu : Station, Date/Heure, N° Ticket, Liste articles, Modes de paiement, Total

Étape 3.7 — Intégrer dans les pages concernées :
- "Voir Détails" shift → bouton "Imprimer document officiel" → ShiftCarburantPDF
- Onglet BL/Facture → bouton "Imprimer BL" → BLFacturePDF (grisé si non comptabilisé)
- POS boutique → bouton "Imprimer ticket" → TicketBoutiquePDF

## ÉTAPE 4 — VALIDATE
- [ ] Bouton "Imprimer" visible sur tous les rapports
- [ ] CSS print : sidebar/header masqués à l'impression
- [ ] Fond blanc, texte noir à l'impression (pas de dark mode qui "pollue")
- [ ] ShiftCarburantPDF génère un PDF avec toutes les infos requises (§10.2)
- [ ] BLFacturePDF grisé si achat non encore mouvementé + comptabilisé
- [ ] TicketBoutiquePDF imprimable après chaque vente
- [ ] @react-pdf/renderer : PDF téléchargeable via PDFDownloadLink
- [ ] Build npm run build réussit avec @react-pdf/renderer
- [ ] TypeScript strict 0 erreur
</process>

<rules>
- Toujours offrir les deux options : impression navigateur (window.print) ET téléchargement PDF (@react-pdf)
- Le bouton "Imprimer BL/Facture" est grisé tant que l'achat n'est pas mouvementé ET comptabilisé
- Le PDF officiel shift inclut obligatoirement : date/heure clôture, nom responsable clôture, tous les index pistolets
- Utiliser @react-pdf/renderer uniquement pour les documents officiels (pas pour les rapports — trop lourd)
- Le CSS @media print doit OBLIGATOIREMENT masquer les éléments de navigation et boutons
- En-tête sur chaque page du PDF : Logo SuccessFuel + Nom station + Date impression
</rules>
