import {
  buildLignesComptaPaiementAchatCarburant,
  buildLignesComptaStockAchatCarburant,
  buildReferenceAchatCarburant,
  calculerCmupAchatCarburant,
  grouperReceptionsParCuve,
  montantLigneReception,
  MSG_PRIX_CARBURANT_MANQUANT,
  resolveCompteStockCarburant,
  type ReceptionCuveGroupe,
} from "@/lib/achatCarburant";
import { prixCarburantService } from "@/services/prixCarburantService";
import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type AchatRow = Database["public"]["Tables"]["achats_carburant"]["Row"];
type EcritureInsert = Database["public"]["Tables"]["ecritures_comptables"]["Insert"];
type LigneEcritureInsert = Database["public"]["Tables"]["lignes_ecriture"]["Insert"];
type ReceptionInsert = Database["public"]["Tables"]["receptions_carburant"]["Insert"];

export interface AchatCarburantListItem {
  id: string;
  numero_bc: string;
  numero_bl: string | null;
  fournisseur_id: string;
  fournisseur_nom: string | null;
  statut: string | null;
  date_commande: string;
  date_livraison: string | null;
  montant_facture: number;
  total_paye: number;
  mouvemente: boolean;
  comptabilise: boolean;
  camion_id: string | null;
}

export interface LigneBCInput {
  station_id: string;
  type_carburant_id: string;
  type_carburant_label: string;
  quantite_commandee: number;
  prix_achat_unitaire: number;
}

export interface PaiementBCInput {
  tresorerie_id: string;
  montant: number;
  date_paiement: string;
  reference?: string;
}

export interface ReceptionCompartimentInput {
  compartiment_id: string;
  station_id: string;
  cuve_id: string;
  type_carburant_id: string;
  volume_nominal: number;
}

export interface ReceptionCuveJaugeInput {
  cuve_id: string;
  station_id: string;
  type_carburant_id: string;
  jauge_avant_cm: number;
  jauge_apres_cm: number;
  volume_avant_litres: number;
  volume_apres_litres: number;
}

export interface AchatCarburantDetail extends AchatCarburantListItem {
  lignes_bc: Array<{
    id: string;
    station_nom: string | null;
    type_label: string | null;
    quantite_commandee: number | null;
  }>;
  paiements: Array<{
    id: string;
    montant: number;
    date_paiement: string;
    tresorerie_libelle: string | null;
    reference: string | null;
  }>;
  receptions: Array<{
    id: string;
    station_nom: string | null;
    cuve_nom: string | null;
    compartiment_numero: number | null;
    volume_nominal: number;
    jauge_avant_cm: number | null;
    jauge_apres_cm: number | null;
    volume_avant_litres: number | null;
    volume_apres_litres: number | null;
    ecart_livraison: number | null;
    prix_achat_unitaire: number | null;
    montant_ligne: number;
  }>;
  receptions_par_cuve: ReceptionCuveGroupe[];
  camion_immat: string | null;
}

async function createEcritureAvecLignes(params: {
  entrepriseId: string;
  stationId: string | null;
  dateEcriture: string;
  libelle: string;
  referenceNumero: string;
  referenceId: string;
  typeOperation: string;
  createdBy: string | null;
  lignes: Array<{
    numero_compte: string;
    libelle_compte: string;
    debit: number;
    credit: number;
    tiers_id?: string | null;
    tresorerie_id?: string | null;
  }>;
}): Promise<string> {
  const totalDebit = params.lignes.reduce((s, l) => s + l.debit, 0);
  const totalCredit = params.lignes.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("Écriture déséquilibrée — partie double non respectée");
  }

  const ecriture: EcritureInsert = {
    entreprise_id: params.entrepriseId,
    station_id: params.stationId,
    is_central: !params.stationId,
    libelle: params.libelle,
    date_ecriture: params.dateEcriture,
    numero_piece: params.referenceNumero,
    reference_numero: params.referenceNumero,
    reference_id: params.referenceId,
    type_operation: params.typeOperation,
    statut: "validee",
    total_debit: totalDebit,
    total_credit: totalCredit,
    created_by: params.createdBy,
  };

  const { data: ec, error } = await supabase
    .from("ecritures_comptables")
    .insert(ecriture)
    .select("id")
    .single();
  if (error) throw error;

  const lignesInsert: LigneEcritureInsert[] = params.lignes.map((l) => ({
    ecriture_id: ec.id,
    numero_compte: l.numero_compte,
    libelle_compte: l.libelle_compte,
    debit: l.debit,
    credit: l.credit,
    tiers_id: l.tiers_id ?? null,
    tresorerie_id: l.tresorerie_id ?? null,
  }));

  const { error: leErr } = await supabase
    .from("lignes_ecriture")
    .insert(lignesInsert);
  if (leErr) throw leErr;

  const { data: ok, error: vErr } = await supabase.rpc("verifier_partie_double", {
    p_ecriture_id: ec.id,
  });
  if (vErr) throw vErr;
  if (!ok) throw new Error("Partie double invalide après enregistrement");

  return ec.id;
}

export const achatCarburantService = {
  async list(entrepriseId: string): Promise<AchatCarburantListItem[]> {
    const { data, error } = await supabase
      .from("achats_carburant")
      .select(
        "id, numero_bc, numero_bl, fournisseur_id, statut, date_commande, date_livraison, montant_facture, total_paye, mouvemente_at, comptabilise_at, camion_id, tiers!fournisseur_id(nom)",
      )
      .eq("entreprise_id", entrepriseId)
      .order("date_commande", { ascending: false })
      .limit(100);
    if (error) throw error;

    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        numero_bc: r.numero_bc as string,
        numero_bl: (r.numero_bl as string) ?? null,
        fournisseur_id: r.fournisseur_id as string,
        fournisseur_nom: (r.tiers as { nom?: string } | null)?.nom ?? null,
        statut: r.statut as string,
        date_commande: r.date_commande as string,
        date_livraison: (r.date_livraison as string) ?? null,
        montant_facture: Number(r.montant_facture) || 0,
        total_paye: Number(r.total_paye) || 0,
        mouvemente: !!r.mouvemente_at,
        comptabilise: !!r.comptabilise_at,
        camion_id: (r.camion_id as string) ?? null,
      };
    });
  },

  async getDetail(achatId: string): Promise<AchatCarburantDetail> {
    const { data: achat, error } = await supabase
      .from("achats_carburant")
      .select(
        `*, tiers!fournisseur_id(nom), camions(numero_immat),
         lignes_bc_carburant(id, quantite_commandee, type_carburant, stations(nom)),
         paiements_achat_carburant(id, montant, date_paiement, reference, tresoreries(libelle)),
         receptions_carburant(id, volume_nominal, jauge_avant_cm, jauge_apres_cm, volume_avant_litres, volume_apres_litres, ecart_livraison, prix_achat_unitaire,
           stations(nom), cuves(nom, compte_stock), compartiments_camion(numero))`,
      )
      .eq("id", achatId)
      .single();
    if (error) throw error;

    const a = achat as Record<string, unknown>;
    const receptions = (a.receptions_carburant as unknown[]) ?? [];

    return {
      id: a.id as string,
      numero_bc: a.numero_bc as string,
      numero_bl: (a.numero_bl as string) ?? null,
      fournisseur_id: a.fournisseur_id as string,
      fournisseur_nom: (a.tiers as { nom?: string })?.nom ?? null,
      statut: a.statut as string,
      date_commande: a.date_commande as string,
      date_livraison: (a.date_livraison as string) ?? null,
      montant_facture: Number(a.montant_facture) || 0,
      total_paye: Number(a.total_paye) || 0,
      mouvemente: !!a.mouvemente_at,
      comptabilise: !!a.comptabilise_at,
      camion_id: (a.camion_id as string) ?? null,
      camion_immat: (a.camions as { numero_immat?: string })?.numero_immat ?? null,
      lignes_bc: ((a.lignes_bc_carburant as unknown[]) ?? []).map((l) => {
        const row = l as Record<string, unknown>;
        return {
          id: row.id as string,
          station_nom: (row.stations as { nom?: string })?.nom ?? null,
          type_label: (row.type_carburant as string) ?? null,
          quantite_commandee: Number(row.quantite_commandee) || 0,
        };
      }),
      paiements: ((a.paiements_achat_carburant as unknown[]) ?? []).map((p) => {
        const row = p as Record<string, unknown>;
        return {
          id: row.id as string,
          montant: Number(row.montant),
          date_paiement: row.date_paiement as string,
          tresorerie_libelle:
            (row.tresoreries as { libelle?: string })?.libelle ?? null,
          reference: (row.reference as string) ?? null,
        };
      }),
      receptions: receptions.map((r) => {
        const row = r as Record<string, unknown>;
        const vol = Number(row.volume_nominal) || 0;
        const pa = Number(row.prix_achat_unitaire) || 0;
        return {
          id: row.id as string,
          station_nom: (row.stations as { nom?: string })?.nom ?? null,
          cuve_nom: (row.cuves as { nom?: string })?.nom ?? null,
          compartiment_numero:
            (row.compartiments_camion as { numero?: number })?.numero ?? null,
          volume_nominal: vol,
          jauge_avant_cm: Number(row.jauge_avant_cm) || null,
          jauge_apres_cm: Number(row.jauge_apres_cm) || null,
          volume_avant_litres: Number(row.volume_avant_litres) || null,
          volume_apres_litres: Number(row.volume_apres_litres) || null,
          ecart_livraison: Number(row.ecart_livraison) || null,
          prix_achat_unitaire: pa,
          montant_ligne: montantLigneReception(vol, pa),
        };
      }),
      receptions_par_cuve: grouperReceptionsParCuve(
        receptions.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            cuve_id: row.cuve_id as string,
            station_id: row.station_id as string,
            cuve_nom: (row.cuves as { nom?: string })?.nom ?? null,
            station_nom: (row.stations as { nom?: string })?.nom ?? null,
            compartiment_id: row.compartiment_id as string,
            compartiment_numero:
              (row.compartiments_camion as { numero?: number })?.numero ?? null,
            volume_nominal: Number(row.volume_nominal) || 0,
            jauge_avant_cm: row.jauge_avant_cm as number | null,
            jauge_apres_cm: row.jauge_apres_cm as number | null,
            volume_avant_litres: row.volume_avant_litres as number | null,
            volume_apres_litres: row.volume_apres_litres as number | null,
          };
        }),
      ),
    };
  },

  async createBonCommande(params: {
    entrepriseId: string;
    fournisseurId: string;
    dateCommande: string;
    createdBy: string | null;
    lignes: LigneBCInput[];
  }): Promise<{ id: string; numero_bc: string }> {
    if (params.lignes.length === 0) {
      throw new Error("Ajoutez au moins une ligne complète au bon de commande");
    }

    for (const l of params.lignes) {
      if (!(l.prix_achat_unitaire > 0)) {
        throw new Error(MSG_PRIX_CARBURANT_MANQUANT);
      }
    }

    const montantIndicatif = params.lignes.reduce(
      (acc, l) => acc + l.quantite_commandee * l.prix_achat_unitaire,
      0,
    );

    const { data: achat, error } = await supabase
      .from("achats_carburant")
      .insert({
        entreprise_id: params.entrepriseId,
        fournisseur_id: params.fournisseurId,
        statut: "commande",
        date_commande: params.dateCommande,
        montant_facture: Math.round(montantIndicatif * 100) / 100,
        total_paye: 0,
        created_by: params.createdBy,
      })
      .select("id, numero_bc")
      .single();
    if (error) throw error;

    const lignesInsert = params.lignes.map((l) => ({
      achat_id: achat.id,
      station_id: l.station_id,
      type_carburant_id: l.type_carburant_id,
      type_carburant: l.type_carburant_label,
      quantite_commandee: l.quantite_commandee,
    }));

    const { error: lErr } = await supabase
      .from("lignes_bc_carburant")
      .insert(lignesInsert);
    if (lErr) throw lErr;

    return { id: achat.id, numero_bc: achat.numero_bc };
  },

  async enregistrerPaiements(params: {
    achatId: string;
    entrepriseId: string;
    fournisseurId: string;
    numeroBc: string;
    createdBy: string | null;
    paiements: PaiementBCInput[];
  }): Promise<void> {
    const paiementsValides = params.paiements.filter((p) => p.montant > 0);
    if (paiementsValides.length === 0) {
      throw new Error("Saisissez au moins un paiement");
    }

    const { data: fournisseur } = await supabase
      .from("tiers")
      .select("nom, compte_principal")
      .eq("id", params.fournisseurId)
      .single();

    const compteFournisseur = fournisseur?.compte_principal ?? "401";
    const libelleFournisseur = fournisseur?.nom ?? "Fournisseur";

    for (const p of paiementsValides) {
      const { data: treso } = await supabase
        .from("tresoreries")
        .select("libelle, numero_compte")
        .eq("id", p.tresorerie_id)
        .single();
      if (!treso) throw new Error("Trésorerie introuvable");

      const lignes = buildLignesComptaPaiementAchatCarburant({
        montant: p.montant,
        compteFournisseur,
        libelleFournisseur,
        compteTresorerie: treso.numero_compte,
        libelleTresorerie: treso.libelle,
        referenceBc: params.numeroBc,
      });

      const ecritureId = await createEcritureAvecLignes({
        entrepriseId: params.entrepriseId,
        stationId: null,
        dateEcriture: p.date_paiement,
        libelle: `Paiement achat carburant — ${params.numeroBc}`,
        referenceNumero: params.numeroBc,
        referenceId: params.achatId,
        typeOperation: "paiement_achat_carburant",
        createdBy: params.createdBy,
        lignes: lignes.map((l) => ({
          numero_compte: l.numeroCompte,
          libelle_compte: l.libelleCompte,
          debit: l.debit,
          credit: l.credit,
          tiers_id:
            l.numeroCompte.startsWith("401") ? params.fournisseurId : null,
          tresorerie_id:
            l.credit > 0 && l.numeroCompte.startsWith("5")
              ? p.tresorerie_id
              : null,
        })),
      });

      const { error: pErr } = await supabase
        .from("paiements_achat_carburant")
        .insert({
          achat_id: params.achatId,
          tresorerie_id: p.tresorerie_id,
          montant: p.montant,
          date_paiement: p.date_paiement,
          reference: p.reference ?? params.numeroBc,
          ecriture_id: ecritureId,
        });
      if (pErr) throw pErr;
    }

    const totalPaye = paiementsValides.reduce((s, p) => s + p.montant, 0);
    const { error } = await supabase
      .from("achats_carburant")
      .update({
        statut: "paye",
        total_paye: Math.round(totalPaye * 100) / 100,
      })
      .eq("id", params.achatId);
    if (error) throw error;
  },

  async enregistrerReception(params: {
    achatId: string;
    entrepriseId: string;
    camionId: string;
    dateLivraison: string;
    numeroBl: string;
    compartiments: ReceptionCompartimentInput[];
    jaugesCuves: ReceptionCuveJaugeInput[];
  }): Promise<number> {
    if (!params.camionId) throw new Error("Sélectionnez le camion");
    if (params.compartiments.length === 0) {
      throw new Error("Ajoutez au moins un compartiment affecté");
    }

    const jaugeParCuve = new Map(
      params.jaugesCuves.map((j) => [j.cuve_id, j]),
    );
    const cuvesRequises = new Set(params.compartiments.map((c) => c.cuve_id));
    for (const cuveId of cuvesRequises) {
      const j = jaugeParCuve.get(cuveId);
      if (!j) {
        throw new Error(
          "Chaque cuve destinataire doit avoir une jauge avant et après",
        );
      }
    }

    await supabase
      .from("receptions_carburant")
      .delete()
      .eq("achat_id", params.achatId);

    let montantFacture = 0;
    const rows: ReceptionInsert[] = [];
    const jaugeDejaEcrite = new Set<string>();

    for (const l of params.compartiments) {
      if (!l.cuve_id) throw new Error("Chaque compartiment doit avoir une cuve");
      if (!(l.volume_nominal > 0)) {
        throw new Error("Volume nominal compartiment obligatoire");
      }

      const prix = await prixCarburantService.getPrixAchatActif({
        stationId: l.station_id,
        typeCarburantId: l.type_carburant_id,
        dateReference: params.dateLivraison,
      });
      if (!prix) throw new Error(MSG_PRIX_CARBURANT_MANQUANT);

      const montant = montantLigneReception(l.volume_nominal, prix.prixAchat);
      montantFacture += montant;

      const jauge = jaugeParCuve.get(l.cuve_id)!;
      const ecrireJauge = !jaugeDejaEcrite.has(l.cuve_id);
      if (ecrireJauge) jaugeDejaEcrite.add(l.cuve_id);

      rows.push({
        achat_id: params.achatId,
        station_id: l.station_id,
        cuve_id: l.cuve_id,
        compartiment_id: l.compartiment_id,
        volume_nominal: l.volume_nominal,
        jauge_avant_cm: ecrireJauge ? jauge.jauge_avant_cm : null,
        jauge_apres_cm: ecrireJauge ? jauge.jauge_apres_cm : null,
        volume_avant_litres: ecrireJauge ? jauge.volume_avant_litres : null,
        volume_apres_litres: ecrireJauge ? jauge.volume_apres_litres : null,
        prix_achat_unitaire: prix.prixAchat,
      });
    }

    const { error: rErr } = await supabase
      .from("receptions_carburant")
      .insert(rows);
    if (rErr) throw rErr;

    const { error: aErr } = await supabase
      .from("achats_carburant")
      .update({
        statut: "recu",
        date_livraison: params.dateLivraison,
        numero_bl: params.numeroBl || null,
        camion_id: params.camionId,
        montant_facture: Math.round(montantFacture * 100) / 100,
      })
      .eq("id", params.achatId);
    if (aErr) throw aErr;

    return Math.round(montantFacture * 100) / 100;
  },

  async mouvementerStock(params: {
    achatId: string;
    entrepriseId: string;
    sessionId: string | null;
  }): Promise<void> {
    const { data: achat, error: aErr } = await supabase
      .from("achats_carburant")
      .select("id, numero_bc, numero_bl, mouvemente_at, date_livraison")
      .eq("id", params.achatId)
      .single();
    if (aErr) throw aErr;
    if (achat.mouvemente_at) {
      throw new Error("Cet achat a déjà été mouvementé");
    }

    const { data: receptions, error: rErr } = await supabase
      .from("receptions_carburant")
      .select(
        "id, station_id, cuve_id, volume_nominal, prix_achat_unitaire, jauge_apres_cm, cuves(stock_actuel_litres, cmup, compte_stock, type_carburant_id)",
      )
      .eq("achat_id", params.achatId);
    if (rErr) throw rErr;
    if (!receptions?.length) {
      throw new Error("Aucune réception — enregistrez la réception d'abord");
    }

    const refMvt = buildReferenceAchatCarburant(achat.numero_bc, achat.numero_bl);

    type CuveMvt = {
      station_id: string;
      cuve_id: string;
      volumeTotal: number;
      pa: number;
      jauge_apres_cm: number | null;
      cuve: {
        stock_actuel_litres: number;
        cmup: number;
        compte_stock: string;
      };
    };
    const parCuve = new Map<string, CuveMvt>();

    for (const rec of receptions) {
      const r = rec as Record<string, unknown>;
      const cuveId = r.cuve_id as string;
      const vol = Number(r.volume_nominal);
      const pa = Number(r.prix_achat_unitaire);
      const existing = parCuve.get(cuveId);
      if (existing) {
        existing.volumeTotal += vol;
        if (r.jauge_apres_cm != null) {
          existing.jauge_apres_cm = Number(r.jauge_apres_cm);
        }
      } else {
        parCuve.set(cuveId, {
          station_id: r.station_id as string,
          cuve_id: cuveId,
          volumeTotal: vol,
          pa,
          jauge_apres_cm:
            r.jauge_apres_cm != null ? Number(r.jauge_apres_cm) : null,
          cuve: r.cuves as CuveMvt["cuve"],
        });
      }
    }

    for (const agg of parCuve.values()) {
      const stockAvant = Number(agg.cuve.stock_actuel_litres) || 0;
      const cmupAvant = Number(agg.cuve.cmup) || agg.pa;
      const vol = agg.volumeTotal;

      const { data: newCmup, error: cmupErr } = await supabase.rpc(
        "calculer_cmup",
        {
          p_stock_actuel: stockAvant,
          p_cmup_actuel: cmupAvant,
          p_quantite_entree: vol,
          p_prix_achat: agg.pa,
        },
      );
      if (cmupErr) throw cmupErr;

      const cmupFinal =
        typeof newCmup === "number"
          ? newCmup
          : calculerCmupAchatCarburant(stockAvant, cmupAvant, vol, agg.pa);
      const stockApres = stockAvant + vol;

      const { error: cuveErr } = await supabase
        .from("cuves")
        .update({
          stock_actuel_litres: stockApres,
          cmup: cmupFinal,
          jauge_actuelle_cm: agg.jauge_apres_cm,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agg.cuve_id);
      if (cuveErr) throw cuveErr;

      const { error: mvtErr } = await supabase.from("mouvements_stock").insert({
        entreprise_id: params.entrepriseId,
        station_id: agg.station_id,
        cuve_id: agg.cuve_id,
        type: "entree_achat",
        sens: "entree",
        quantite: vol,
        cmup_unitaire: cmupFinal,
        stock_avant: stockAvant,
        stock_apres: stockApres,
        valeur_totale: Math.round(vol * agg.pa * 100) / 100,
        reference_type: "achat_carburant",
        reference_id: params.achatId,
        reference_numero: refMvt,
        date_mouvement:
          achat.date_livraison ?? new Date().toISOString().split("T")[0],
        motif: `Réception carburant ${refMvt}`,
        created_by: params.sessionId,
      });
      if (mvtErr) throw mvtErr;
    }

    const { error } = await supabase
      .from("achats_carburant")
      .update({
        statut: "mouvemente",
        mouvemente_at: new Date().toISOString(),
        mouvemente_par: params.sessionId,
      })
      .eq("id", params.achatId);
    if (error) throw error;
  },

  async buildPreviewComptaStock(achatId: string) {
    const detail = await this.getDetail(achatId);
    const { data: fournisseur } = await supabase
      .from("tiers")
      .select("nom, compte_principal")
      .eq("id", detail.fournisseur_id)
      .single();

    const compteFournisseur = fournisseur?.compte_principal ?? "401";
    const libelleFournisseur = fournisseur?.nom ?? "Fournisseur";

    const { data: receptions } = await supabase
      .from("receptions_carburant")
      .select(
        "volume_nominal, prix_achat_unitaire, cuves(compte_stock, nom)",
      )
      .eq("achat_id", achatId);

    const byCompte = new Map<string, { libelle: string; montant: number }>();
    for (const rec of receptions ?? []) {
      const r = rec as Record<string, unknown>;
      const cuve = r.cuves as { compte_stock?: string; nom?: string };
      const compte = resolveCompteStockCarburant(cuve?.compte_stock, null);
      const libelle = cuve?.nom ?? `Stock ${compte}`;
      const montant = montantLigneReception(
        Number(r.volume_nominal),
        Number(r.prix_achat_unitaire),
      );
      const cur = byCompte.get(compte) ?? { libelle, montant: 0 };
      cur.montant += montant;
      byCompte.set(compte, cur);
    }

    const ref = buildReferenceAchatCarburant(detail.numero_bc, detail.numero_bl);
    return buildLignesComptaStockAchatCarburant(
      [...byCompte.entries()].map(([compteStock, v]) => ({
        compteStock,
        libelleStock: v.libelle,
        montant: v.montant,
      })),
      compteFournisseur,
      libelleFournisseur,
      `Achat carburant — ${ref}`,
    );
  },

  async comptabiliser(params: {
    achatId: string;
    entrepriseId: string;
    createdBy: string | null;
  }): Promise<void> {
    const { data: achat, error: aErr } = await supabase
      .from("achats_carburant")
      .select("*")
      .eq("id", params.achatId)
      .single();
    if (aErr) throw aErr;
    if (!achat.mouvemente_at) {
      throw new Error("Mouvementer le stock avant de comptabiliser");
    }
    if (achat.comptabilise_at) {
      throw new Error("Cet achat est déjà comptabilisé");
    }

    const detail = await this.getDetail(params.achatId);
    const { data: fournisseur } = await supabase
      .from("tiers")
      .select("nom, compte_principal")
      .eq("id", achat.fournisseur_id!)
      .single();

    const compteFournisseur = fournisseur?.compte_principal ?? "401";
    const libelleFournisseur = fournisseur?.nom ?? "Fournisseur";
    const ref = buildReferenceAchatCarburant(achat.numero_bc, achat.numero_bl);

    const { data: receptions } = await supabase
      .from("receptions_carburant")
      .select(
        "volume_nominal, prix_achat_unitaire, station_id, cuves(compte_stock, nom)",
      )
      .eq("achat_id", params.achatId);

    const byCompte = new Map<string, { libelle: string; montant: number }>();
    for (const rec of receptions ?? []) {
      const r = rec as Record<string, unknown>;
      const cuve = r.cuves as { compte_stock?: string; nom?: string };
      const compte = resolveCompteStockCarburant(cuve?.compte_stock, null);
      const montant = montantLigneReception(
        Number(r.volume_nominal),
        Number(r.prix_achat_unitaire),
      );
      const cur = byCompte.get(compte) ?? {
        libelle: cuve?.nom ?? `Stock ${compte}`,
        montant: 0,
      };
      cur.montant += montant;
      byCompte.set(compte, cur);
    }

    const lignesPreview = buildLignesComptaStockAchatCarburant(
      [...byCompte.entries()].map(([compteStock, v]) => ({
        compteStock,
        libelleStock: v.libelle,
        montant: v.montant,
      })),
      compteFournisseur,
      libelleFournisseur,
      `Achat carburant — ${ref}`,
    );

    await createEcritureAvecLignes({
      entrepriseId: params.entrepriseId,
      stationId: null,
      dateEcriture: achat.date_livraison ?? achat.date_commande,
      libelle: `Achat carburant — ${ref}`,
      referenceNumero: ref,
      referenceId: params.achatId,
      typeOperation: "achat_carburant",
      createdBy: params.createdBy,
      lignes: lignesPreview.map((l) => ({
        numero_compte: l.numeroCompte,
        libelle_compte: l.libelleCompte,
        debit: l.debit,
        credit: l.credit,
        tiers_id: l.numeroCompte.startsWith("401") ? achat.fournisseur_id : null,
      })),
    });

    const { error } = await supabase
      .from("achats_carburant")
      .update({
        statut: "comptabilise",
        comptabilise_at: new Date().toISOString(),
        comptabilise_par: params.createdBy,
      })
      .eq("id", params.achatId);
    if (error) throw error;
  },

  async getCompartiments(camionId: string) {
    const { data, error } = await supabase
      .from("compartiments_camion")
      .select("id, numero, volume_max")
      .eq("camion_id", camionId)
      .order("numero");
    if (error) throw error;
    return data ?? [];
  },
};
