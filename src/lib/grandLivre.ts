/**
 * Grand Livre — regroupement par compte (libellé métier, tri comptable interne).
 */

export interface GrandLivreRawRow {
  date_ecriture: string;
  libelle_ecriture: string | null;
  numero_compte: string | null;
  libelle_compte: string | null;
  tiers_nom: string | null;
  tresorerie_libelle: string | null;
  debit: number;
  credit: number;
}

export interface GrandLivreMouvement {
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

export interface GrandLivreCompteSection {
  /** Numéro interne pour le tri (non affiché). */
  compteNumero: string;
  compteLabel: string;
  mouvements: GrandLivreMouvement[];
  totalDebit: number;
  totalCredit: number;
  soldeFinal: number;
}

/** Compare deux numéros de compte (classe 1→7, puis ordre numérique). */
export function compareCompteNumero(a: string, b: string): number {
  const na = (a || "").trim();
  const nb = (b || "").trim();
  const rootA = na.split("-")[0] ?? na;
  const rootB = nb.split("-")[0] ?? nb;

  const classA = parseInt(rootA.charAt(0), 10) || 0;
  const classB = parseInt(rootB.charAt(0), 10) || 0;
  if (classA !== classB) return classA - classB;

  const numA = parseInt(rootA.replace(/\D/g, ""), 10) || 0;
  const numB = parseInt(rootB.replace(/\D/g, ""), 10) || 0;
  if (numA !== numB) return numA - numB;

  return na.localeCompare(nb, "fr", { numeric: true });
}

/** Libellé affiché à l'utilisateur (jamais le numéro de compte). */
export function getCompteDisplayLabel(row: GrandLivreRawRow): string {
  const tiers = row.tiers_nom?.trim();
  if (tiers) return tiers;
  const treso = row.tresorerie_libelle?.trim();
  if (treso) return treso;
  const root = (row.numero_compte ?? "").trim().split("-")[0];
  const libelle = row.libelle_compte?.trim();
  if (root === "101") {
    if (libelle && !/^À nouveau/i.test(libelle)) return libelle;
    return "Capital social";
  }
  if (libelle) return libelle;
  return "Compte";
}

/** Libellé d'écriture lisible (sans références techniques INIT). */
export function simplifyEcritureLibelle(libelle: string | null | undefined): string {
  if (!libelle?.trim()) return "—";
  let s = libelle.trim();
  if (s.startsWith("INIT:")) return "À nouveau";
  s = s.replace(/^A Nouveau - Initialisation - /i, "À nouveau — ");
  s = s.replace(/^À nouveau - /i, "À nouveau — ");
  return s;
}

/** Libellé mouvement : pour le 101, priorité au libellé de ligne (ouverture globale). */
export function getMouvementLibelle(row: GrandLivreRawRow): string {
  const root = (row.numero_compte ?? "").trim().split("-")[0];
  if (root === "101") {
    const ligne = row.libelle_compte?.trim();
    if (ligne) return ligne;
  }
  return simplifyEcritureLibelle(row.libelle_ecriture);
}

/** Regroupe par numéro de compte, tri ordre comptable (pas alphabétique libellé). */
export function groupGrandLivreParCompte(
  rows: GrandLivreRawRow[],
): GrandLivreCompteSection[] {
  const byNumero = new Map<string, { label: string; rows: GrandLivreRawRow[] }>();

  for (const row of rows) {
    const numero = (row.numero_compte ?? "").trim() || "_inconnu";
    const label = getCompteDisplayLabel(row);
    const existing = byNumero.get(numero);
    if (existing) {
      existing.rows.push(row);
    } else {
      byNumero.set(numero, { label, rows: [row] });
    }
  }

  return [...byNumero.entries()]
    .sort(([a], [b]) => compareCompteNumero(a, b))
    .map(([compteNumero, { label: compteLabel, rows: mouvementsRaw }]) => {
      const sorted = [...mouvementsRaw].sort((a, b) =>
        a.date_ecriture.localeCompare(b.date_ecriture),
      );

      let solde = 0;
      let totalDebit = 0;
      let totalCredit = 0;

      const mouvements: GrandLivreMouvement[] = sorted.map((m) => {
        const debit = Number(m.debit) || 0;
        const credit = Number(m.credit) || 0;
        totalDebit += debit;
        totalCredit += credit;
        solde = Math.round((solde + debit - credit) * 100) / 100;
        return {
          date: m.date_ecriture,
          libelle: getMouvementLibelle(m),
          debit,
          credit,
          solde,
        };
      });

      return {
        compteNumero,
        compteLabel,
        mouvements,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        soldeFinal: solde,
      };
    });
}

/** Aplatit les sections pour l'export CSV. */
export function flattenGrandLivreForExport(
  sections: GrandLivreCompteSection[],
): Array<Record<string, string | number>> {
  const out: Array<Record<string, string | number>> = [];

  for (const section of sections) {
    out.push({
      Compte: section.compteLabel,
      Date: "",
      Libellé: "",
      "Débit (Ar)": "",
      "Crédit (Ar)": "",
      "Solde (Ar)": "",
    });
    for (const m of section.mouvements) {
      out.push({
        Compte: "",
        Date: m.date,
        Libellé: m.libelle,
        "Débit (Ar)": m.debit > 0 ? m.debit : "",
        "Crédit (Ar)": m.credit > 0 ? m.credit : "",
        "Solde (Ar)": m.solde,
      });
    }
    out.push({
      Compte: `Total ${section.compteLabel}`,
      Date: "",
      Libellé: "",
      "Débit (Ar)": section.totalDebit,
      "Crédit (Ar)": section.totalCredit,
      "Solde (Ar)": section.soldeFinal,
    });
    out.push({
      Compte: "",
      Date: "",
      Libellé: "",
      "Débit (Ar)": "",
      "Crédit (Ar)": "",
      "Solde (Ar)": "",
    });
  }

  return out;
}
