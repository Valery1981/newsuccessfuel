export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      abonnements: {
        Row: {
          created_at: string | null;
          date_debut: string;
          date_fin: string | null;
          entreprise_id: string | null;
          id: string;
          is_active: boolean | null;
          montant: number | null;
          part_gerant: number | null;
          part_partenaire: number | null;
          partenaire_id: string | null;
          plan: string;
        };
        Insert: {
          created_at?: string | null;
          date_debut: string;
          date_fin?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          montant?: number | null;
          part_gerant?: number | null;
          part_partenaire?: number | null;
          partenaire_id?: string | null;
          plan?: string;
        };
        Update: {
          created_at?: string | null;
          date_debut?: string;
          date_fin?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          montant?: number | null;
          part_gerant?: number | null;
          part_partenaire?: number | null;
          partenaire_id?: string | null;
          plan?: string;
        };
        Relationships: [
          {
            foreignKeyName: "abonnements_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "abonnements_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "abonnements_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "abonnements_partenaire_id_fkey";
            columns: ["partenaire_id"];
            isOneToOne: false;
            referencedRelation: "partenaires";
            referencedColumns: ["id"];
          },
        ];
      };
      achats_boutique: {
        Row: {
          comptabilise_at: string | null;
          created_at: string | null;
          created_by: string | null;
          date_facture: string;
          echeance_credit: string | null;
          entreprise_id: string | null;
          fournisseur_id: string | null;
          fournisseur_non_defini: boolean | null;
          id: string;
          montant_cash: number | null;
          montant_credit: number | null;
          montant_total: number | null;
          mouvemente_at: string | null;
          numero_facture: string | null;
          numero_interne: string | null;
          station_id: string | null;
          statut: Database["public"]["Enums"]["achat_statut"] | null;
          updated_at: string | null;
        };
        Insert: {
          comptabilise_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date_facture: string;
          echeance_credit?: string | null;
          entreprise_id?: string | null;
          fournisseur_id?: string | null;
          fournisseur_non_defini?: boolean | null;
          id?: string;
          montant_cash?: number | null;
          montant_credit?: number | null;
          montant_total?: number | null;
          mouvemente_at?: string | null;
          numero_facture?: string | null;
          numero_interne?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["achat_statut"] | null;
          updated_at?: string | null;
        };
        Update: {
          comptabilise_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date_facture?: string;
          echeance_credit?: string | null;
          entreprise_id?: string | null;
          fournisseur_id?: string | null;
          fournisseur_non_defini?: boolean | null;
          id?: string;
          montant_cash?: number | null;
          montant_credit?: number | null;
          montant_total?: number | null;
          mouvemente_at?: string | null;
          numero_facture?: string | null;
          numero_interne?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["achat_statut"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "achats_boutique_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_boutique_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_boutique_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "achats_boutique_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "achats_boutique_fournisseur_id_fkey";
            columns: ["fournisseur_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_boutique_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      achats_carburant: {
        Row: {
          camion_id: string | null;
          comptabilise_at: string | null;
          comptabilise_par: string | null;
          created_at: string | null;
          created_by: string | null;
          date_commande: string;
          date_livraison: string | null;
          ecart_paiement: number | null;
          entreprise_id: string | null;
          fournisseur_id: string | null;
          id: string;
          montant_facture: number | null;
          mouvemente_at: string | null;
          mouvemente_par: string | null;
          numero_bc: string;
          numero_bl: string | null;
          statut: Database["public"]["Enums"]["achat_statut"] | null;
          total_paye: number | null;
          updated_at: string | null;
        };
        Insert: {
          camion_id?: string | null;
          comptabilise_at?: string | null;
          comptabilise_par?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date_commande?: string;
          date_livraison?: string | null;
          ecart_paiement?: number | null;
          entreprise_id?: string | null;
          fournisseur_id?: string | null;
          id?: string;
          montant_facture?: number | null;
          mouvemente_at?: string | null;
          mouvemente_par?: string | null;
          numero_bc?: string;
          numero_bl?: string | null;
          statut?: Database["public"]["Enums"]["achat_statut"] | null;
          total_paye?: number | null;
          updated_at?: string | null;
        };
        Update: {
          camion_id?: string | null;
          comptabilise_at?: string | null;
          comptabilise_par?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date_commande?: string;
          date_livraison?: string | null;
          ecart_paiement?: number | null;
          entreprise_id?: string | null;
          fournisseur_id?: string | null;
          id?: string;
          montant_facture?: number | null;
          mouvemente_at?: string | null;
          mouvemente_par?: string | null;
          numero_bc?: string;
          numero_bl?: string | null;
          statut?: Database["public"]["Enums"]["achat_statut"] | null;
          total_paye?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "achats_carburant_camion_id_fkey";
            columns: ["camion_id"];
            isOneToOne: false;
            referencedRelation: "camions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_carburant_comptabilise_par_fkey";
            columns: ["comptabilise_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_carburant_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_carburant_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_carburant_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "achats_carburant_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "achats_carburant_fournisseur_id_fkey";
            columns: ["fournisseur_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achats_carburant_mouvemente_par_fkey";
            columns: ["mouvemente_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
        ];
      };
      articles: {
        Row: {
          categorie_id: string | null;
          code_barres: string | null;
          compte_stock: string | null;
          compte_vente: string | null;
          conditionnement: string | null;
          created_at: string | null;
          entreprise_id: string | null;
          famille: Database["public"]["Enums"]["famille_produit"];
          id: string;
          is_active: boolean | null;
          is_service: boolean | null;
          nom: string;
          unite: string | null;
          updated_at: string | null;
        };
        Insert: {
          categorie_id?: string | null;
          code_barres?: string | null;
          compte_stock?: string | null;
          compte_vente?: string | null;
          conditionnement?: string | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          famille: Database["public"]["Enums"]["famille_produit"];
          id?: string;
          is_active?: boolean | null;
          is_service?: boolean | null;
          nom: string;
          unite?: string | null;
          updated_at?: string | null;
        };
        Update: {
          categorie_id?: string | null;
          code_barres?: string | null;
          compte_stock?: string | null;
          compte_vente?: string | null;
          conditionnement?: string | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          famille?: Database["public"]["Enums"]["famille_produit"];
          id?: string;
          is_active?: boolean | null;
          is_service?: boolean | null;
          nom?: string;
          unite?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "articles_categorie_id_fkey";
            columns: ["categorie_id"];
            isOneToOne: false;
            referencedRelation: "categories_articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "articles_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          anciennes_valeurs: Json | null;
          compte_id: string | null;
          created_at: string | null;
          entreprise_id: string | null;
          id: string;
          ip_address: unknown;
          nouvelles_valeurs: Json | null;
          record_id: string | null;
          session_id: string | null;
          table_cible: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          anciennes_valeurs?: Json | null;
          compte_id?: string | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          ip_address?: unknown;
          nouvelles_valeurs?: Json | null;
          record_id?: string | null;
          session_id?: string | null;
          table_cible?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          anciennes_valeurs?: Json | null;
          compte_id?: string | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          ip_address?: unknown;
          nouvelles_valeurs?: Json | null;
          record_id?: string | null;
          session_id?: string | null;
          table_cible?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_compte_id_fkey";
            columns: ["compte_id"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "audit_log_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "audit_log_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
        ];
      };
      calibrages: {
        Row: {
          cuve_id: string | null;
          hauteur_cm: number;
          id: string;
          volume_litres: number;
        };
        Insert: {
          cuve_id?: string | null;
          hauteur_cm: number;
          id?: string;
          volume_litres: number;
        };
        Update: {
          cuve_id?: string | null;
          hauteur_cm?: number;
          id?: string;
          volume_litres?: number;
        };
        Relationships: [
          {
            foreignKeyName: "calibrages_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
        ];
      };
      camions: {
        Row: {
          capacite_totale: number | null;
          created_at: string | null;
          entreprise_id: string | null;
          id: string;
          is_active: boolean | null;
          nombre_compartiments: number | null;
          numero_immat: string;
          transporteur: string | null;
        };
        Insert: {
          capacite_totale?: number | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          nombre_compartiments?: number | null;
          numero_immat: string;
          transporteur?: string | null;
        };
        Update: {
          capacite_totale?: number | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          nombre_compartiments?: number | null;
          numero_immat?: string;
          transporteur?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "camions_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "camions_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "camions_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      categories_articles: {
        Row: {
          created_at: string | null;
          entreprise_id: string | null;
          famille: Database["public"]["Enums"]["famille_produit"];
          id: string;
          is_active: boolean | null;
          nom: string;
        };
        Insert: {
          created_at?: string | null;
          entreprise_id?: string | null;
          famille: Database["public"]["Enums"]["famille_produit"];
          id?: string;
          is_active?: boolean | null;
          nom: string;
        };
        Update: {
          created_at?: string | null;
          entreprise_id?: string | null;
          famille?: Database["public"]["Enums"]["famille_produit"];
          id?: string;
          is_active?: boolean | null;
          nom?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_articles_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_articles_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "categories_articles_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      compartiments_camion: {
        Row: {
          camion_id: string | null;
          id: string;
          numero: number;
          volume_max: number;
        };
        Insert: {
          camion_id?: string | null;
          id?: string;
          numero: number;
          volume_max: number;
        };
        Update: {
          camion_id?: string | null;
          id?: string;
          numero?: number;
          volume_max?: number;
        };
        Relationships: [
          {
            foreignKeyName: "compartiments_camion_camion_id_fkey";
            columns: ["camion_id"];
            isOneToOne: false;
            referencedRelation: "camions";
            referencedColumns: ["id"];
          },
        ];
      };
      comptes: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          is_active: boolean | null;
          must_change_password: boolean;
          nom: string;
          supabase_user_id: string | null;
          telephone: string | null;
          type: Database["public"]["Enums"]["account_type"];
          updated_at: string | null;
          whatsapp: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          is_active?: boolean | null;
          must_change_password?: boolean;
          nom: string;
          supabase_user_id?: string | null;
          telephone?: string | null;
          type: Database["public"]["Enums"]["account_type"];
          updated_at?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          is_active?: boolean | null;
          must_change_password?: boolean;
          nom?: string;
          supabase_user_id?: string | null;
          telephone?: string | null;
          type?: Database["public"]["Enums"]["account_type"];
          updated_at?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      compteurs_comptes: {
        Row: {
          dernier_numero: number | null;
          entreprise_id: string | null;
          id: string;
          numero_parent: string;
        };
        Insert: {
          dernier_numero?: number | null;
          entreprise_id?: string | null;
          id?: string;
          numero_parent: string;
        };
        Update: {
          dernier_numero?: number | null;
          entreprise_id?: string | null;
          id?: string;
          numero_parent?: string;
        };
        Relationships: [
          {
            foreignKeyName: "compteurs_comptes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compteurs_comptes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "compteurs_comptes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      compteurs_tiers: {
        Row: {
          dernier_numero: number | null;
          entreprise_id: string | null;
          id: string;
          type_tiers: Database["public"]["Enums"]["tiers_type"];
        };
        Insert: {
          dernier_numero?: number | null;
          entreprise_id?: string | null;
          id?: string;
          type_tiers: Database["public"]["Enums"]["tiers_type"];
        };
        Update: {
          dernier_numero?: number | null;
          entreprise_id?: string | null;
          id?: string;
          type_tiers?: Database["public"]["Enums"]["tiers_type"];
        };
        Relationships: [
          {
            foreignKeyName: "compteurs_tiers_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compteurs_tiers_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "compteurs_tiers_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      compteurs_tresorerie: {
        Row: {
          dernier_numero: number | null;
          entreprise_id: string | null;
          id: string;
          type_tresorerie: string;
        };
        Insert: {
          dernier_numero?: number | null;
          entreprise_id?: string | null;
          id?: string;
          type_tresorerie: string;
        };
        Update: {
          dernier_numero?: number | null;
          entreprise_id?: string | null;
          id?: string;
          type_tresorerie?: string;
        };
        Relationships: [
          {
            foreignKeyName: "compteurs_tresorerie_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compteurs_tresorerie_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "compteurs_tresorerie_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      creances: {
        Row: {
          created_at: string | null;
          echeance: string | null;
          entreprise_id: string | null;
          id: string;
          is_soldee: boolean | null;
          montant_initial: number;
          montant_recouvre: number | null;
          reference_id: string | null;
          reference_numero: string | null;
          solde: number | null;
          tiers_id: string | null;
          type_creance: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          echeance?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_soldee?: boolean | null;
          montant_initial: number;
          montant_recouvre?: number | null;
          reference_id?: string | null;
          reference_numero?: string | null;
          solde?: number | null;
          tiers_id?: string | null;
          type_creance: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          echeance?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_soldee?: boolean | null;
          montant_initial?: number;
          montant_recouvre?: number | null;
          reference_id?: string | null;
          reference_numero?: string | null;
          solde?: number | null;
          tiers_id?: string | null;
          type_creance?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "creances_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creances_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "creances_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "creances_tiers_id_fkey";
            columns: ["tiers_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      cuves: {
        Row: {
          capacite_max: number | null;
          cmup: number | null;
          compte_stock: string;
          created_at: string | null;
          id: string;
          jauge_actuelle_cm: number | null;
          nom: string;
          station_id: string | null;
          stock_actuel_litres: number | null;
          type_carburant: string;
          updated_at: string | null;
        };
        Insert: {
          capacite_max?: number | null;
          cmup?: number | null;
          compte_stock: string;
          created_at?: string | null;
          id?: string;
          jauge_actuelle_cm?: number | null;
          nom: string;
          station_id?: string | null;
          stock_actuel_litres?: number | null;
          type_carburant: string;
          updated_at?: string | null;
        };
        Update: {
          capacite_max?: number | null;
          cmup?: number | null;
          compte_stock?: string;
          created_at?: string | null;
          id?: string;
          jauge_actuelle_cm?: number | null;
          nom?: string;
          station_id?: string | null;
          stock_actuel_litres?: number | null;
          type_carburant?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cuves_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      dettes: {
        Row: {
          created_at: string | null;
          echeance: string | null;
          entreprise_id: string | null;
          fournisseur_id: string | null;
          id: string;
          is_partenaire_carburant: boolean | null;
          is_soldee: boolean | null;
          montant_initial: number;
          montant_regle: number | null;
          reference_id: string | null;
          reference_numero: string | null;
          solde: number | null;
          type_dette: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          echeance?: string | null;
          entreprise_id?: string | null;
          fournisseur_id?: string | null;
          id?: string;
          is_partenaire_carburant?: boolean | null;
          is_soldee?: boolean | null;
          montant_initial: number;
          montant_regle?: number | null;
          reference_id?: string | null;
          reference_numero?: string | null;
          solde?: number | null;
          type_dette: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          echeance?: string | null;
          entreprise_id?: string | null;
          fournisseur_id?: string | null;
          id?: string;
          is_partenaire_carburant?: boolean | null;
          is_soldee?: boolean | null;
          montant_initial?: number;
          montant_regle?: number | null;
          reference_id?: string | null;
          reference_numero?: string | null;
          solde?: number | null;
          type_dette?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dettes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dettes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "dettes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "dettes_fournisseur_id_fkey";
            columns: ["fournisseur_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      doleances: {
        Row: {
          created_at: string | null;
          delai_prise_en_charge_minutes: number | null;
          delai_resolution_minutes: number | null;
          description: string;
          envoyee_at: string | null;
          id: string;
          partenaire_id: string | null;
          prise_en_charge_at: string | null;
          prise_en_charge_par: string | null;
          reglee_at: string | null;
          reglee_par: string | null;
          station_id: string | null;
          statut: Database["public"]["Enums"]["doleance_statut"] | null;
          type_incident: string;
        };
        Insert: {
          created_at?: string | null;
          delai_prise_en_charge_minutes?: number | null;
          delai_resolution_minutes?: number | null;
          description: string;
          envoyee_at?: string | null;
          id?: string;
          partenaire_id?: string | null;
          prise_en_charge_at?: string | null;
          prise_en_charge_par?: string | null;
          reglee_at?: string | null;
          reglee_par?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["doleance_statut"] | null;
          type_incident: string;
        };
        Update: {
          created_at?: string | null;
          delai_prise_en_charge_minutes?: number | null;
          delai_resolution_minutes?: number | null;
          description?: string;
          envoyee_at?: string | null;
          id?: string;
          partenaire_id?: string | null;
          prise_en_charge_at?: string | null;
          prise_en_charge_par?: string | null;
          reglee_at?: string | null;
          reglee_par?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["doleance_statut"] | null;
          type_incident?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doleances_partenaire_id_fkey";
            columns: ["partenaire_id"];
            isOneToOne: false;
            referencedRelation: "partenaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doleances_prise_en_charge_par_fkey";
            columns: ["prise_en_charge_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doleances_reglee_par_fkey";
            columns: ["reglee_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doleances_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      ecritures_comptables: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          date_ecriture: string;
          entreprise_id: string | null;
          id: string;
          is_central: boolean | null;
          is_equilibree: boolean | null;
          libelle: string;
          numero_piece: string | null;
          reference_id: string | null;
          reference_numero: string | null;
          station_id: string | null;
          statut: Database["public"]["Enums"]["ecriture_statut"] | null;
          total_credit: number | null;
          total_debit: number | null;
          type_operation: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          date_ecriture: string;
          entreprise_id?: string | null;
          id?: string;
          is_central?: boolean | null;
          is_equilibree?: boolean | null;
          libelle: string;
          numero_piece?: string | null;
          reference_id?: string | null;
          reference_numero?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["ecriture_statut"] | null;
          total_credit?: number | null;
          total_debit?: number | null;
          type_operation?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          date_ecriture?: string;
          entreprise_id?: string | null;
          id?: string;
          is_central?: boolean | null;
          is_equilibree?: boolean | null;
          libelle?: string;
          numero_piece?: string | null;
          reference_id?: string | null;
          reference_numero?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["ecriture_statut"] | null;
          total_credit?: number | null;
          total_debit?: number | null;
          type_operation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecritures_comptables_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      entreprises: {
        Row: {
          adresse: string | null;
          compte_id: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          logo_url: string | null;
          nif: string | null;
          nom: string;
          pays: string;
          rcs: string | null;
          stat: string | null;
          telephone: string | null;
          updated_at: string | null;
          whatsapp: string | null;
        };
        Insert: {
          adresse?: string | null;
          compte_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_url?: string | null;
          nif?: string | null;
          nom: string;
          pays?: string;
          rcs?: string | null;
          stat?: string | null;
          telephone?: string | null;
          updated_at?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          adresse?: string | null;
          compte_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_url?: string | null;
          nif?: string | null;
          nom?: string;
          pays?: string;
          rcs?: string | null;
          stat?: string | null;
          telephone?: string | null;
          updated_at?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entreprises_compte_id_fkey";
            columns: ["compte_id"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
        ];
      };
      initialisation: {
        Row: {
          capital_net_calcule: number | null;
          created_at: string | null;
          entreprise_id: string | null;
          est_validee: boolean | null;
          id: string;
          updated_at: string | null;
          validee_at: string | null;
          validee_par: string | null;
        };
        Insert: {
          capital_net_calcule?: number | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          est_validee?: boolean | null;
          id?: string;
          updated_at?: string | null;
          validee_at?: string | null;
          validee_par?: string | null;
        };
        Update: {
          capital_net_calcule?: number | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          est_validee?: boolean | null;
          id?: string;
          updated_at?: string | null;
          validee_at?: string | null;
          validee_par?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "initialisation_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: true;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: true;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "initialisation_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: true;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "initialisation_validee_par_fkey";
            columns: ["validee_par"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
        ];
      };
      initialisation_comptes: {
        Row: {
          id: string;
          initialisation_id: string | null;
          libelle_compte: string;
          numero_compte: string;
          onglet: string | null;
          saved_at: string | null;
          solde_credit: number | null;
          solde_debit: number | null;
          tiers_id: string | null;
          tresorerie_id: string | null;
        };
        Insert: {
          id?: string;
          initialisation_id?: string | null;
          libelle_compte: string;
          numero_compte: string;
          onglet?: string | null;
          saved_at?: string | null;
          solde_credit?: number | null;
          solde_debit?: number | null;
          tiers_id?: string | null;
          tresorerie_id?: string | null;
        };
        Update: {
          id?: string;
          initialisation_id?: string | null;
          libelle_compte?: string;
          numero_compte?: string;
          onglet?: string | null;
          saved_at?: string | null;
          solde_credit?: number | null;
          solde_debit?: number | null;
          tiers_id?: string | null;
          tresorerie_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "initialisation_comptes_initialisation_id_fkey";
            columns: ["initialisation_id"];
            isOneToOne: false;
            referencedRelation: "initialisation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_comptes_tiers_id_fkey";
            columns: ["tiers_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_comptes_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      initialisation_cuves: {
        Row: {
          cuve_id: string | null;
          id: string;
          initialisation_id: string | null;
          jauge_initiale_cm: number;
          prix_achat_initial: number;
          saved_at: string | null;
          station_id: string | null;
          valeur_stock: number | null;
          volume_initial_litres: number;
        };
        Insert: {
          cuve_id?: string | null;
          id?: string;
          initialisation_id?: string | null;
          jauge_initiale_cm: number;
          prix_achat_initial: number;
          saved_at?: string | null;
          station_id?: string | null;
          valeur_stock?: number | null;
          volume_initial_litres: number;
        };
        Update: {
          cuve_id?: string | null;
          id?: string;
          initialisation_id?: string | null;
          jauge_initiale_cm?: number;
          prix_achat_initial?: number;
          saved_at?: string | null;
          station_id?: string | null;
          valeur_stock?: number | null;
          volume_initial_litres?: number;
        };
        Relationships: [
          {
            foreignKeyName: "initialisation_cuves_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_cuves_initialisation_id_fkey";
            columns: ["initialisation_id"];
            isOneToOne: false;
            referencedRelation: "initialisation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_cuves_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      initialisation_index_pistolets: {
        Row: {
          id: string;
          index_initial: number;
          initialisation_id: string | null;
          pistolet_id: string | null;
          saved_at: string | null;
          station_id: string | null;
        };
        Insert: {
          id?: string;
          index_initial: number;
          initialisation_id?: string | null;
          pistolet_id?: string | null;
          saved_at?: string | null;
          station_id?: string | null;
        };
        Update: {
          id?: string;
          index_initial?: number;
          initialisation_id?: string | null;
          pistolet_id?: string | null;
          saved_at?: string | null;
          station_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "initialisation_index_pistolets_initialisation_id_fkey";
            columns: ["initialisation_id"];
            isOneToOne: false;
            referencedRelation: "initialisation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_index_pistolets_pistolet_id_fkey";
            columns: ["pistolet_id"];
            isOneToOne: false;
            referencedRelation: "pistolets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_index_pistolets_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      initialisation_stocks_boutique: {
        Row: {
          article_id: string | null;
          id: string;
          initialisation_id: string | null;
          prix_achat_initial: number;
          quantite_initiale: number;
          saved_at: string | null;
          station_id: string | null;
          valeur_stock: number | null;
        };
        Insert: {
          article_id?: string | null;
          id?: string;
          initialisation_id?: string | null;
          prix_achat_initial: number;
          quantite_initiale: number;
          saved_at?: string | null;
          station_id?: string | null;
          valeur_stock?: number | null;
        };
        Update: {
          article_id?: string | null;
          id?: string;
          initialisation_id?: string | null;
          prix_achat_initial?: number;
          quantite_initiale?: number;
          saved_at?: string | null;
          station_id?: string | null;
          valeur_stock?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "initialisation_stocks_boutique_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_stocks_boutique_initialisation_id_fkey";
            columns: ["initialisation_id"];
            isOneToOne: false;
            referencedRelation: "initialisation";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initialisation_stocks_boutique_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventaires: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          date_inventaire: string | null;
          id: string;
          inventaire_precedent_id: string | null;
          regularise_at: string | null;
          regularise_par: string | null;
          station_id: string | null;
          statut: Database["public"]["Enums"]["inventaire_statut"] | null;
          type: Database["public"]["Enums"]["inventaire_type"];
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          date_inventaire?: string | null;
          id?: string;
          inventaire_precedent_id?: string | null;
          regularise_at?: string | null;
          regularise_par?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["inventaire_statut"] | null;
          type: Database["public"]["Enums"]["inventaire_type"];
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          date_inventaire?: string | null;
          id?: string;
          inventaire_precedent_id?: string | null;
          regularise_at?: string | null;
          regularise_par?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["inventaire_statut"] | null;
          type?: Database["public"]["Enums"]["inventaire_type"];
        };
        Relationships: [
          {
            foreignKeyName: "inventaires_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventaires_inventaire_precedent_id_fkey";
            columns: ["inventaire_precedent_id"];
            isOneToOne: false;
            referencedRelation: "inventaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventaires_regularise_par_fkey";
            columns: ["regularise_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventaires_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_achat_boutique: {
        Row: {
          achat_id: string | null;
          article_id: string | null;
          created_at: string | null;
          id: string;
          prix_achat_unitaire: number;
          quantite: number;
          total_ligne: number | null;
        };
        Insert: {
          achat_id?: string | null;
          article_id?: string | null;
          created_at?: string | null;
          id?: string;
          prix_achat_unitaire: number;
          quantite: number;
          total_ligne?: number | null;
        };
        Update: {
          achat_id?: string | null;
          article_id?: string | null;
          created_at?: string | null;
          id?: string;
          prix_achat_unitaire?: number;
          quantite?: number;
          total_ligne?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_achat_boutique_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats_boutique";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_achat_boutique_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_bc_carburant: {
        Row: {
          achat_id: string | null;
          created_at: string | null;
          id: string;
          quantite_commandee: number | null;
          station_id: string | null;
          type_carburant: string;
        };
        Insert: {
          achat_id?: string | null;
          created_at?: string | null;
          id?: string;
          quantite_commandee?: number | null;
          station_id?: string | null;
          type_carburant: string;
        };
        Update: {
          achat_id?: string | null;
          created_at?: string | null;
          id?: string;
          quantite_commandee?: number | null;
          station_id?: string | null;
          type_carburant?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_bc_carburant_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats_carburant";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_bc_carburant_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_ecriture: {
        Row: {
          created_at: string | null;
          credit: number | null;
          debit: number | null;
          ecriture_id: string | null;
          id: string;
          lettre: string | null;
          libelle_compte: string;
          numero_compte: string;
          tiers_id: string | null;
          tresorerie_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          credit?: number | null;
          debit?: number | null;
          ecriture_id?: string | null;
          id?: string;
          lettre?: string | null;
          libelle_compte: string;
          numero_compte: string;
          tiers_id?: string | null;
          tresorerie_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          credit?: number | null;
          debit?: number | null;
          ecriture_id?: string | null;
          id?: string;
          lettre?: string | null;
          libelle_compte?: string;
          numero_compte?: string;
          tiers_id?: string | null;
          tresorerie_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_ecriture_ecriture_id_fkey";
            columns: ["ecriture_id"];
            isOneToOne: false;
            referencedRelation: "ecritures_comptables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_ecriture_tiers_id_fkey";
            columns: ["tiers_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_ecriture_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_inventaire_boutique: {
        Row: {
          article_id: string | null;
          cmup: number;
          created_at: string | null;
          ecart: number | null;
          ecriture_id: string | null;
          id: string;
          inventaire_id: string | null;
          motif: Database["public"]["Enums"]["motif_ecart"] | null;
          motif_detail: string | null;
          quantite_reelle: number;
          responsable_id: string | null;
          stock_theorique: number;
          valeur_ecart: number | null;
        };
        Insert: {
          article_id?: string | null;
          cmup: number;
          created_at?: string | null;
          ecart?: number | null;
          ecriture_id?: string | null;
          id?: string;
          inventaire_id?: string | null;
          motif?: Database["public"]["Enums"]["motif_ecart"] | null;
          motif_detail?: string | null;
          quantite_reelle: number;
          responsable_id?: string | null;
          stock_theorique: number;
          valeur_ecart?: number | null;
        };
        Update: {
          article_id?: string | null;
          cmup?: number;
          created_at?: string | null;
          ecart?: number | null;
          ecriture_id?: string | null;
          id?: string;
          inventaire_id?: string | null;
          motif?: Database["public"]["Enums"]["motif_ecart"] | null;
          motif_detail?: string | null;
          quantite_reelle?: number;
          responsable_id?: string | null;
          stock_theorique?: number;
          valeur_ecart?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_inventaire_boutique_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_inventaire_boutique_ecriture_id_fkey";
            columns: ["ecriture_id"];
            isOneToOne: false;
            referencedRelation: "ecritures_comptables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_inventaire_boutique_inventaire_id_fkey";
            columns: ["inventaire_id"];
            isOneToOne: false;
            referencedRelation: "inventaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_inventaire_boutique_responsable_id_fkey";
            columns: ["responsable_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_inventaire_carburant: {
        Row: {
          cmup: number;
          created_at: string | null;
          cuve_id: string | null;
          ecart_litres: number | null;
          ecriture_id: string | null;
          id: string;
          inventaire_id: string | null;
          jauge_reelle_cm: number;
          motif: Database["public"]["Enums"]["motif_ecart"] | null;
          responsable_id: string | null;
          stock_theorique_litres: number;
          valeur_ecart: number | null;
          volume_reel_litres: number;
        };
        Insert: {
          cmup: number;
          created_at?: string | null;
          cuve_id?: string | null;
          ecart_litres?: number | null;
          ecriture_id?: string | null;
          id?: string;
          inventaire_id?: string | null;
          jauge_reelle_cm: number;
          motif?: Database["public"]["Enums"]["motif_ecart"] | null;
          responsable_id?: string | null;
          stock_theorique_litres: number;
          valeur_ecart?: number | null;
          volume_reel_litres: number;
        };
        Update: {
          cmup?: number;
          created_at?: string | null;
          cuve_id?: string | null;
          ecart_litres?: number | null;
          ecriture_id?: string | null;
          id?: string;
          inventaire_id?: string | null;
          jauge_reelle_cm?: number;
          motif?: Database["public"]["Enums"]["motif_ecart"] | null;
          responsable_id?: string | null;
          stock_theorique_litres?: number;
          valeur_ecart?: number | null;
          volume_reel_litres?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_inventaire_carburant_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_inventaire_carburant_ecriture_id_fkey";
            columns: ["ecriture_id"];
            isOneToOne: false;
            referencedRelation: "ecritures_comptables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_inventaire_carburant_inventaire_id_fkey";
            columns: ["inventaire_id"];
            isOneToOne: false;
            referencedRelation: "inventaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_inventaire_carburant_responsable_id_fkey";
            columns: ["responsable_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_shift_carburant: {
        Row: {
          ca: number | null;
          cmup_sortie: number | null;
          created_at: string | null;
          cuve_id: string | null;
          id: string;
          index_final: number;
          index_initial: number;
          pistolet_id: string | null;
          prix_vente: number;
          shift_id: string | null;
          type_carburant: string;
          volume_vendu: number | null;
        };
        Insert: {
          ca?: number | null;
          cmup_sortie?: number | null;
          created_at?: string | null;
          cuve_id?: string | null;
          id?: string;
          index_final: number;
          index_initial: number;
          pistolet_id?: string | null;
          prix_vente: number;
          shift_id?: string | null;
          type_carburant: string;
          volume_vendu?: number | null;
        };
        Update: {
          ca?: number | null;
          cmup_sortie?: number | null;
          created_at?: string | null;
          cuve_id?: string | null;
          id?: string;
          index_final?: number;
          index_initial?: number;
          pistolet_id?: string | null;
          prix_vente?: number;
          shift_id?: string | null;
          type_carburant?: string;
          volume_vendu?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_shift_carburant_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_shift_carburant_pistolet_id_fkey";
            columns: ["pistolet_id"];
            isOneToOne: false;
            referencedRelation: "pistolets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_shift_carburant_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts_carburant";
            referencedColumns: ["id"];
          },
        ];
      };
      lignes_ticket_boutique: {
        Row: {
          article_id: string | null;
          cmup_sortie: number | null;
          created_at: string | null;
          id: string;
          prix_unitaire: number;
          quantite: number;
          ticket_id: string | null;
          total_ligne: number | null;
        };
        Insert: {
          article_id?: string | null;
          cmup_sortie?: number | null;
          created_at?: string | null;
          id?: string;
          prix_unitaire: number;
          quantite: number;
          ticket_id?: string | null;
          total_ligne?: number | null;
        };
        Update: {
          article_id?: string | null;
          cmup_sortie?: number | null;
          created_at?: string | null;
          id?: string;
          prix_unitaire?: number;
          quantite?: number;
          ticket_id?: string | null;
          total_ligne?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lignes_ticket_boutique_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lignes_ticket_boutique_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets_boutique";
            referencedColumns: ["id"];
          },
        ];
      };
      mouvements_stock: {
        Row: {
          article_id: string | null;
          cmup_unitaire: number;
          created_at: string | null;
          created_by: string | null;
          cuve_id: string | null;
          date_mouvement: string | null;
          entreprise_id: string | null;
          id: string;
          motif: string | null;
          quantite: number;
          reference_id: string | null;
          reference_numero: string | null;
          reference_type: string | null;
          sens: string;
          station_destination_id: string | null;
          station_id: string | null;
          stock_apres: number | null;
          stock_avant: number | null;
          type: Database["public"]["Enums"]["mouvement_type"];
          valeur_totale: number | null;
        };
        Insert: {
          article_id?: string | null;
          cmup_unitaire: number;
          created_at?: string | null;
          created_by?: string | null;
          cuve_id?: string | null;
          date_mouvement?: string | null;
          entreprise_id?: string | null;
          id?: string;
          motif?: string | null;
          quantite: number;
          reference_id?: string | null;
          reference_numero?: string | null;
          reference_type?: string | null;
          sens: string;
          station_destination_id?: string | null;
          station_id?: string | null;
          stock_apres?: number | null;
          stock_avant?: number | null;
          type: Database["public"]["Enums"]["mouvement_type"];
          valeur_totale?: number | null;
        };
        Update: {
          article_id?: string | null;
          cmup_unitaire?: number;
          created_at?: string | null;
          created_by?: string | null;
          cuve_id?: string | null;
          date_mouvement?: string | null;
          entreprise_id?: string | null;
          id?: string;
          motif?: string | null;
          quantite?: number;
          reference_id?: string | null;
          reference_numero?: string | null;
          reference_type?: string | null;
          sens?: string;
          station_destination_id?: string | null;
          station_id?: string | null;
          stock_apres?: number | null;
          stock_avant?: number | null;
          type?: Database["public"]["Enums"]["mouvement_type"];
          valeur_totale?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "mouvements_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "mouvements_stock_station_destination_id_fkey";
            columns: ["station_destination_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          destinataire_compte_id: string | null;
          destinataire_session_id: string | null;
          id: string;
          is_lue: boolean | null;
          lue_at: string | null;
          message: string | null;
          reference_id: string | null;
          reference_type: string | null;
          titre: string;
          type: Database["public"]["Enums"]["notif_type"];
        };
        Insert: {
          created_at?: string | null;
          destinataire_compte_id?: string | null;
          destinataire_session_id?: string | null;
          id?: string;
          is_lue?: boolean | null;
          lue_at?: string | null;
          message?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          titre: string;
          type: Database["public"]["Enums"]["notif_type"];
        };
        Update: {
          created_at?: string | null;
          destinataire_compte_id?: string | null;
          destinataire_session_id?: string | null;
          id?: string;
          is_lue?: boolean | null;
          lue_at?: string | null;
          message?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          titre?: string;
          type?: Database["public"]["Enums"]["notif_type"];
        };
        Relationships: [
          {
            foreignKeyName: "notifications_destinataire_compte_id_fkey";
            columns: ["destinataire_compte_id"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_destinataire_session_id_fkey";
            columns: ["destinataire_session_id"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
        ];
      };
      objectifs: {
        Row: {
          created_at: string | null;
          id: string;
          periode_debut: string;
          periode_fin: string;
          station_id: string | null;
          type: string;
          type_carburant: string | null;
          valeur: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          periode_debut: string;
          periode_fin: string;
          station_id?: string | null;
          type: string;
          type_carburant?: string | null;
          valeur: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          periode_debut?: string;
          periode_fin?: string;
          station_id?: string | null;
          type?: string;
          type_carburant?: string | null;
          valeur?: number;
        };
        Relationships: [
          {
            foreignKeyName: "objectifs_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      operations_hors_av: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          date_operation: string;
          echeance: string | null;
          ecriture_id: string | null;
          entreprise_id: string | null;
          id: string;
          is_central: boolean | null;
          libelle: string;
          montant: number;
          station_id: string | null;
          tiers_id: string | null;
          tresorerie_destination_id: string | null;
          tresorerie_id: string | null;
          type: Database["public"]["Enums"]["operation_hors_av_type"];
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          date_operation: string;
          echeance?: string | null;
          ecriture_id?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_central?: boolean | null;
          libelle: string;
          montant: number;
          station_id?: string | null;
          tiers_id?: string | null;
          tresorerie_destination_id?: string | null;
          tresorerie_id?: string | null;
          type: Database["public"]["Enums"]["operation_hors_av_type"];
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          date_operation?: string;
          echeance?: string | null;
          ecriture_id?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_central?: boolean | null;
          libelle?: string;
          montant?: number;
          station_id?: string | null;
          tiers_id?: string | null;
          tresorerie_destination_id?: string | null;
          tresorerie_id?: string | null;
          type?: Database["public"]["Enums"]["operation_hors_av_type"];
        };
        Relationships: [
          {
            foreignKeyName: "operations_hors_av_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_hors_av_ecriture_id_fkey";
            columns: ["ecriture_id"];
            isOneToOne: false;
            referencedRelation: "ecritures_comptables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_hors_av_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_hors_av_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "operations_hors_av_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "operations_hors_av_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_hors_av_tiers_id_fkey";
            columns: ["tiers_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_hors_av_tresorerie_destination_id_fkey";
            columns: ["tresorerie_destination_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_hors_av_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      paiements_achat_boutique: {
        Row: {
          achat_id: string | null;
          created_at: string | null;
          date_paiement: string;
          id: string;
          montant: number;
          tresorerie_id: string | null;
        };
        Insert: {
          achat_id?: string | null;
          created_at?: string | null;
          date_paiement: string;
          id?: string;
          montant: number;
          tresorerie_id?: string | null;
        };
        Update: {
          achat_id?: string | null;
          created_at?: string | null;
          date_paiement?: string;
          id?: string;
          montant?: number;
          tresorerie_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "paiements_achat_boutique_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats_boutique";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paiements_achat_boutique_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      paiements_achat_carburant: {
        Row: {
          achat_id: string | null;
          created_at: string | null;
          date_paiement: string;
          ecriture_id: string | null;
          id: string;
          montant: number;
          reference: string | null;
          tresorerie_id: string | null;
        };
        Insert: {
          achat_id?: string | null;
          created_at?: string | null;
          date_paiement: string;
          ecriture_id?: string | null;
          id?: string;
          montant: number;
          reference?: string | null;
          tresorerie_id?: string | null;
        };
        Update: {
          achat_id?: string | null;
          created_at?: string | null;
          date_paiement?: string;
          ecriture_id?: string | null;
          id?: string;
          montant?: number;
          reference?: string | null;
          tresorerie_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "paiements_achat_carburant_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats_carburant";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paiements_achat_carburant_ecriture_id_fkey";
            columns: ["ecriture_id"];
            isOneToOne: false;
            referencedRelation: "ecritures_comptables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paiements_achat_carburant_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      paiements_shift_carburant: {
        Row: {
          client_id: string | null;
          created_at: string | null;
          echeance: string | null;
          id: string;
          mode_paiement: string;
          montant: number;
          reference: string | null;
          shift_id: string | null;
          tresorerie_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string | null;
          echeance?: string | null;
          id?: string;
          mode_paiement: string;
          montant: number;
          reference?: string | null;
          shift_id?: string | null;
          tresorerie_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          created_at?: string | null;
          echeance?: string | null;
          id?: string;
          mode_paiement?: string;
          montant?: number;
          reference?: string | null;
          shift_id?: string | null;
          tresorerie_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "paiements_shift_carburant_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paiements_shift_carburant_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts_carburant";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paiements_shift_carburant_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      paiements_ticket_boutique: {
        Row: {
          created_at: string | null;
          id: string;
          mode_paiement: string;
          montant: number;
          ticket_id: string | null;
          tresorerie_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          mode_paiement: string;
          montant: number;
          ticket_id?: string | null;
          tresorerie_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          mode_paiement?: string;
          montant?: number;
          ticket_id?: string | null;
          tresorerie_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "paiements_ticket_boutique_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets_boutique";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paiements_ticket_boutique_tresorerie_id_fkey";
            columns: ["tresorerie_id"];
            isOneToOne: false;
            referencedRelation: "tresoreries";
            referencedColumns: ["id"];
          },
        ];
      };
      partenaires: {
        Row: {
          compte_id: string | null;
          contact_email: string | null;
          contact_nom: string | null;
          contact_telephone: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          logo_url: string | null;
          nom: string;
          type: Database["public"]["Enums"]["partenaire_type"] | null;
          updated_at: string | null;
        };
        Insert: {
          compte_id?: string | null;
          contact_email?: string | null;
          contact_nom?: string | null;
          contact_telephone?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_url?: string | null;
          nom: string;
          type?: Database["public"]["Enums"]["partenaire_type"] | null;
          updated_at?: string | null;
        };
        Update: {
          compte_id?: string | null;
          contact_email?: string | null;
          contact_nom?: string | null;
          contact_telephone?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_url?: string | null;
          nom?: string;
          type?: Database["public"]["Enums"]["partenaire_type"] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partenaires_compte_id_fkey";
            columns: ["compte_id"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partenaires_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
        ];
      };
      pistolets: {
        Row: {
          created_at: string | null;
          cuve_id: string | null;
          id: string;
          index_actuel: number | null;
          is_active: boolean | null;
          numero: string;
          station_id: string | null;
          type_carburant: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          cuve_id?: string | null;
          id?: string;
          index_actuel?: number | null;
          is_active?: boolean | null;
          numero: string;
          station_id?: string | null;
          type_carburant: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          cuve_id?: string | null;
          id?: string;
          index_actuel?: number | null;
          is_active?: boolean | null;
          numero?: string;
          station_id?: string | null;
          type_carburant?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pistolets_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pistolets_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_comptable_entreprise: {
        Row: {
          classe: number;
          created_at: string | null;
          entreprise_id: string | null;
          id: string;
          is_active: boolean | null;
          is_centralisateur: boolean | null;
          libelle: string;
          numero: string;
          numero_parent: string;
          updated_at: string | null;
        };
        Insert: {
          classe: number;
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_centralisateur?: boolean | null;
          libelle: string;
          numero: string;
          numero_parent: string;
          updated_at?: string | null;
        };
        Update: {
          classe?: number;
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_centralisateur?: boolean | null;
          libelle?: string;
          numero?: string;
          numero_parent?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plan_comptable_entreprise_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_comptable_entreprise_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "plan_comptable_entreprise_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      plan_comptable_standard: {
        Row: {
          classe: number;
          created_at: string | null;
          id: string;
          is_centralisateur: boolean | null;
          is_modifiable: boolean | null;
          libelle: string;
          numero: string;
          numero_parent: string | null;
        };
        Insert: {
          classe: number;
          created_at?: string | null;
          id?: string;
          is_centralisateur?: boolean | null;
          is_modifiable?: boolean | null;
          libelle: string;
          numero: string;
          numero_parent?: string | null;
        };
        Update: {
          classe?: number;
          created_at?: string | null;
          id?: string;
          is_centralisateur?: boolean | null;
          is_modifiable?: boolean | null;
          libelle?: string;
          numero?: string;
          numero_parent?: string | null;
        };
        Relationships: [];
      };
      prix_carburant: {
        Row: {
          created_at: string | null;
          date_effet: string;
          id: string;
          marge_litre: number;
          prix_achat: number | null;
          prix_vente: number;
          station_id: string | null;
          type_carburant: string;
        };
        Insert: {
          created_at?: string | null;
          date_effet?: string;
          id?: string;
          marge_litre: number;
          prix_achat?: number | null;
          prix_vente: number;
          station_id?: string | null;
          type_carburant: string;
        };
        Update: {
          created_at?: string | null;
          date_effet?: string;
          id?: string;
          marge_litre?: number;
          prix_achat?: number | null;
          prix_vente?: number;
          station_id?: string | null;
          type_carburant?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prix_carburant_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      prix_vente_articles: {
        Row: {
          article_id: string | null;
          created_at: string | null;
          date_effet: string;
          id: string;
          prix_vente: number;
          station_id: string | null;
        };
        Insert: {
          article_id?: string | null;
          created_at?: string | null;
          date_effet?: string;
          id?: string;
          prix_vente: number;
          station_id?: string | null;
        };
        Update: {
          article_id?: string | null;
          created_at?: string | null;
          date_effet?: string;
          id?: string;
          prix_vente?: number;
          station_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "prix_vente_articles_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prix_vente_articles_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      receptions_carburant: {
        Row: {
          achat_id: string | null;
          compartiment_id: string | null;
          created_at: string | null;
          cuve_id: string | null;
          ecart_livraison: number | null;
          id: string;
          jauge_apres_cm: number | null;
          jauge_avant_cm: number | null;
          prix_achat_unitaire: number | null;
          station_id: string | null;
          volume_apres_litres: number | null;
          volume_avant_litres: number | null;
          volume_constate: number | null;
          volume_nominal: number;
        };
        Insert: {
          achat_id?: string | null;
          compartiment_id?: string | null;
          created_at?: string | null;
          cuve_id?: string | null;
          ecart_livraison?: number | null;
          id?: string;
          jauge_apres_cm?: number | null;
          jauge_avant_cm?: number | null;
          prix_achat_unitaire?: number | null;
          station_id?: string | null;
          volume_apres_litres?: number | null;
          volume_avant_litres?: number | null;
          volume_constate?: number | null;
          volume_nominal: number;
        };
        Update: {
          achat_id?: string | null;
          compartiment_id?: string | null;
          created_at?: string | null;
          cuve_id?: string | null;
          ecart_livraison?: number | null;
          id?: string;
          jauge_apres_cm?: number | null;
          jauge_avant_cm?: number | null;
          prix_achat_unitaire?: number | null;
          station_id?: string | null;
          volume_apres_litres?: number | null;
          volume_avant_litres?: number | null;
          volume_constate?: number | null;
          volume_nominal?: number;
        };
        Relationships: [
          {
            foreignKeyName: "receptions_carburant_achat_id_fkey";
            columns: ["achat_id"];
            isOneToOne: false;
            referencedRelation: "achats_carburant";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receptions_carburant_compartiment_id_fkey";
            columns: ["compartiment_id"];
            isOneToOne: false;
            referencedRelation: "compartiments_camion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receptions_carburant_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receptions_carburant_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions_utilisateurs: {
        Row: {
          compte_parent_id: string | null;
          created_at: string | null;
          droits: Json | null;
          email: string;
          employe_id: string | null;
          id: string;
          must_change_password: boolean;
          nom: string;
          poste: string | null;
          status: Database["public"]["Enums"]["session_status"] | null;
          supabase_user_id: string | null;
          updated_at: string | null;
          zone_geo: string | null;
        };
        Insert: {
          compte_parent_id?: string | null;
          created_at?: string | null;
          droits?: Json | null;
          email: string;
          employe_id?: string | null;
          id?: string;
          must_change_password?: boolean;
          nom: string;
          poste?: string | null;
          status?: Database["public"]["Enums"]["session_status"] | null;
          supabase_user_id?: string | null;
          updated_at?: string | null;
          zone_geo?: string | null;
        };
        Update: {
          compte_parent_id?: string | null;
          created_at?: string | null;
          droits?: Json | null;
          email?: string;
          employe_id?: string | null;
          id?: string;
          must_change_password?: boolean;
          nom?: string;
          poste?: string | null;
          status?: Database["public"]["Enums"]["session_status"] | null;
          supabase_user_id?: string | null;
          updated_at?: string | null;
          zone_geo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_session_employe";
            columns: ["employe_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_utilisateurs_compte_parent_id_fkey";
            columns: ["compte_parent_id"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
        ];
      };
      seuils_alerte_stock: {
        Row: {
          article_id: string | null;
          created_at: string | null;
          id: string;
          seuil_minimum: number;
          station_id: string | null;
        };
        Insert: {
          article_id?: string | null;
          created_at?: string | null;
          id?: string;
          seuil_minimum: number;
          station_id?: string | null;
        };
        Update: {
          article_id?: string | null;
          created_at?: string | null;
          id?: string;
          seuil_minimum?: number;
          station_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seuils_alerte_stock_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seuils_alerte_stock_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts_boutique: {
        Row: {
          ca_total: number | null;
          comptabilise_at: string | null;
          comptabilise_par: string | null;
          created_at: string | null;
          date_cloture: string | null;
          date_ouverture: string | null;
          ecart_caisse: number | null;
          id: string;
          mouvemente_at: string | null;
          numero_shift: string;
          session_id: string | null;
          station_id: string | null;
          statut: Database["public"]["Enums"]["shift_statut"] | null;
          total_paiements: number | null;
        };
        Insert: {
          ca_total?: number | null;
          comptabilise_at?: string | null;
          comptabilise_par?: string | null;
          created_at?: string | null;
          date_cloture?: string | null;
          date_ouverture?: string | null;
          ecart_caisse?: number | null;
          id?: string;
          mouvemente_at?: string | null;
          numero_shift?: string;
          session_id?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["shift_statut"] | null;
          total_paiements?: number | null;
        };
        Update: {
          ca_total?: number | null;
          comptabilise_at?: string | null;
          comptabilise_par?: string | null;
          created_at?: string | null;
          date_cloture?: string | null;
          date_ouverture?: string | null;
          ecart_caisse?: number | null;
          id?: string;
          mouvemente_at?: string | null;
          numero_shift?: string;
          session_id?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["shift_statut"] | null;
          total_paiements?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_boutique_comptabilise_par_fkey";
            columns: ["comptabilise_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_boutique_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_boutique_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts_carburant: {
        Row: {
          ca_total: number | null;
          cloture_par: string | null;
          comptabilise_at: string | null;
          created_at: string | null;
          date_shift: string;
          ecart_caisse: number | null;
          heure_cloture: string | null;
          id: string;
          mouvemente_at: string | null;
          numero_shift: string;
          pompiste_id: string | null;
          station_id: string | null;
          statut: Database["public"]["Enums"]["shift_statut"] | null;
          total_paiements: number | null;
          updated_at: string | null;
        };
        Insert: {
          ca_total?: number | null;
          cloture_par?: string | null;
          comptabilise_at?: string | null;
          created_at?: string | null;
          date_shift?: string;
          ecart_caisse?: number | null;
          heure_cloture?: string | null;
          id?: string;
          mouvemente_at?: string | null;
          numero_shift?: string;
          pompiste_id?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["shift_statut"] | null;
          total_paiements?: number | null;
          updated_at?: string | null;
        };
        Update: {
          ca_total?: number | null;
          cloture_par?: string | null;
          comptabilise_at?: string | null;
          created_at?: string | null;
          date_shift?: string;
          ecart_caisse?: number | null;
          heure_cloture?: string | null;
          id?: string;
          mouvemente_at?: string | null;
          numero_shift?: string;
          pompiste_id?: string | null;
          station_id?: string | null;
          statut?: Database["public"]["Enums"]["shift_statut"] | null;
          total_paiements?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_carburant_cloture_par_fkey";
            columns: ["cloture_par"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_carburant_pompiste_id_fkey";
            columns: ["pompiste_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_carburant_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      stations: {
        Row: {
          adresse: string | null;
          created_at: string | null;
          entreprise_id: string | null;
          has_autres_services: boolean | null;
          has_boutique: boolean | null;
          has_gpl: boolean | null;
          has_lavage: boolean | null;
          has_lubrifiants: boolean | null;
          has_marchandises_generales: boolean | null;
          has_parking: boolean | null;
          has_vulcanisation: boolean | null;
          id: string;
          initialisation_validee: boolean | null;
          initialisation_validee_at: string | null;
          latitude: number | null;
          longitude: number | null;
          nom: string;
          partenaire_id: string | null;
          motif_rejet: string | null;
          onboarding_step: string;
          status: Database["public"]["Enums"]["station_status"] | null;
          telephone: string | null;
          updated_at: string | null;
          valide_at: string | null;
          valide_par: string | null;
        };
        Insert: {
          adresse?: string | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          has_autres_services?: boolean | null;
          has_boutique?: boolean | null;
          has_gpl?: boolean | null;
          has_lavage?: boolean | null;
          has_lubrifiants?: boolean | null;
          has_marchandises_generales?: boolean | null;
          has_parking?: boolean | null;
          has_vulcanisation?: boolean | null;
          id?: string;
          initialisation_validee?: boolean | null;
          initialisation_validee_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          nom: string;
          partenaire_id?: string | null;
          motif_rejet?: string | null;
          onboarding_step?: string;
          status?: Database["public"]["Enums"]["station_status"] | null;
          telephone?: string | null;
          updated_at?: string | null;
          valide_at?: string | null;
          valide_par?: string | null;
        };
        Update: {
          adresse?: string | null;
          created_at?: string | null;
          entreprise_id?: string | null;
          has_autres_services?: boolean | null;
          has_boutique?: boolean | null;
          has_gpl?: boolean | null;
          has_lavage?: boolean | null;
          has_lubrifiants?: boolean | null;
          has_marchandises_generales?: boolean | null;
          has_parking?: boolean | null;
          has_vulcanisation?: boolean | null;
          id?: string;
          initialisation_validee?: boolean | null;
          initialisation_validee_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          nom?: string;
          partenaire_id?: string | null;
          motif_rejet?: string | null;
          onboarding_step?: string;
          status?: Database["public"]["Enums"]["station_status"] | null;
          telephone?: string | null;
          updated_at?: string | null;
          valide_at?: string | null;
          valide_par?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stations_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stations_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "stations_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "stations_partenaire_id_fkey";
            columns: ["partenaire_id"];
            isOneToOne: false;
            referencedRelation: "partenaires";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stations_valide_par_fkey";
            columns: ["valide_par"];
            isOneToOne: false;
            referencedRelation: "comptes";
            referencedColumns: ["id"];
          },
        ];
      };
      stocks_boutique: {
        Row: {
          article_id: string | null;
          cmup: number | null;
          id: string;
          quantite: number | null;
          station_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          article_id?: string | null;
          cmup?: number | null;
          id?: string;
          quantite?: number | null;
          station_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          article_id?: string | null;
          cmup?: number | null;
          id?: string;
          quantite?: number | null;
          station_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stocks_boutique_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stocks_boutique_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets_boutique: {
        Row: {
          client_id: string | null;
          created_at: string | null;
          date_vente: string | null;
          echeance: string | null;
          id: string;
          is_credit: boolean | null;
          numero_ticket: string;
          shift_id: string | null;
          station_id: string | null;
          total: number;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string | null;
          date_vente?: string | null;
          echeance?: string | null;
          id?: string;
          is_credit?: boolean | null;
          numero_ticket?: string;
          shift_id?: string | null;
          station_id?: string | null;
          total: number;
        };
        Update: {
          client_id?: string | null;
          created_at?: string | null;
          date_vente?: string | null;
          echeance?: string | null;
          id?: string;
          is_credit?: boolean | null;
          numero_ticket?: string;
          shift_id?: string | null;
          station_id?: string | null;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_boutique_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_boutique_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts_boutique";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_boutique_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      tiers: {
        Row: {
          adresse: string | null;
          compte_principal: string | null;
          cin: string | null;
          compte_responsabilite: string | null;
          created_at: string | null;
          credit_autorise: boolean | null;
          date_embauche: string | null;
          email: string | null;
          entreprise_id: string | null;
          id: string;
          is_active: boolean | null;
          is_partenaire_carburant: boolean | null;
          matricule: string | null;
          nif: string | null;
          nom: string;
          poste: string | null;
          prenom: string | null;
          rcs: string | null;
          reference_employe: string | null;
          rib: string | null;
          sin: string | null;
          stat: string | null;
          statut_employe: string | null;
          station_id: string | null;
          telephone: string | null;
          type: Database["public"]["Enums"]["tiers_type"];
          updated_at: string | null;
        };
        Insert: {
          adresse?: string | null;
          cin?: string | null;
          compte_principal?: string | null;
          compte_responsabilite?: string | null;
          created_at?: string | null;
          credit_autorise?: boolean | null;
          date_embauche?: string | null;
          email?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_partenaire_carburant?: boolean | null;
          matricule?: string | null;
          nif?: string | null;
          nom: string;
          poste?: string | null;
          prenom?: string | null;
          rcs?: string | null;
          reference_employe?: string | null;
          rib?: string | null;
          sin?: string | null;
          stat?: string | null;
          statut_employe?: string | null;
          station_id?: string | null;
          telephone?: string | null;
          type: Database["public"]["Enums"]["tiers_type"];
          updated_at?: string | null;
        };
        Update: {
          adresse?: string | null;
          cin?: string | null;
          compte_principal?: string | null;
          compte_responsabilite?: string | null;
          created_at?: string | null;
          credit_autorise?: boolean | null;
          date_embauche?: string | null;
          email?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_partenaire_carburant?: boolean | null;
          matricule?: string | null;
          nif?: string | null;
          nom?: string;
          poste?: string | null;
          prenom?: string | null;
          rcs?: string | null;
          reference_employe?: string | null;
          rib?: string | null;
          sin?: string | null;
          stat?: string | null;
          statut_employe?: string | null;
          station_id?: string | null;
          telephone?: string | null;
          type?: Database["public"]["Enums"]["tiers_type"];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tiers_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tiers_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "tiers_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      transferts_stock: {
        Row: {
          article_id: string | null;
          cmup_origine: number;
          created_at: string | null;
          created_by: string | null;
          date_transfert: string;
          entreprise_id: string | null;
          id: string;
          quantite: number;
          station_destination_id: string | null;
          station_origine_id: string | null;
          valeur_transfert: number | null;
        };
        Insert: {
          article_id?: string | null;
          cmup_origine: number;
          created_at?: string | null;
          created_by?: string | null;
          date_transfert?: string;
          entreprise_id?: string | null;
          id?: string;
          quantite: number;
          station_destination_id?: string | null;
          station_origine_id?: string | null;
          valeur_transfert?: number | null;
        };
        Update: {
          article_id?: string | null;
          cmup_origine?: number;
          created_at?: string | null;
          created_by?: string | null;
          date_transfert?: string;
          entreprise_id?: string | null;
          id?: string;
          quantite?: number;
          station_destination_id?: string | null;
          station_origine_id?: string | null;
          valeur_transfert?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "transferts_stock_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transferts_stock_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transferts_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transferts_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "transferts_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "transferts_stock_station_destination_id_fkey";
            columns: ["station_destination_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transferts_stock_station_origine_id_fkey";
            columns: ["station_origine_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      tresoreries: {
        Row: {
          created_at: string | null;
          entreprise_id: string | null;
          id: string;
          is_active: boolean | null;
          libelle: string;
          numero_compte: string;
          solde_actuel: number | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          libelle: string;
          numero_compte: string;
          solde_actuel?: number | null;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          entreprise_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          libelle?: string;
          numero_compte?: string;
          solde_actuel?: number | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tresoreries_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tresoreries_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "tresoreries_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
    };
    Views: {
      mv_ca_mensuel: {
        Row: {
          ca_boutique: number | null;
          ca_carburant: number | null;
          ca_services: number | null;
          ca_total: number | null;
          entreprise_id: string | null;
          marge_brute: number | null;
          mois: string | null;
          station_id: string | null;
          station_nom: string | null;
          total_charges: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      mv_capitaux_propres: {
        Row: {
          capital_101: number | null;
          capitaux_propres_nets: number | null;
          entreprise_id: string | null;
          resultat_ytd: number | null;
        };
        Relationships: [];
      };
      mv_stocks_valorises: {
        Row: {
          article_id: string | null;
          article_nom: string | null;
          cmup: number | null;
          famille: Database["public"]["Enums"]["famille_produit"] | null;
          quantite: number | null;
          station_id: string | null;
          station_nom: string | null;
          updated_at: string | null;
          valeur_stock: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stocks_boutique_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stocks_boutique_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      vue_balance: {
        Row: {
          entreprise_id: string | null;
          libelle_compte: string | null;
          numero_compte: string | null;
          solde_crediteur: number | null;
          solde_debiteur: number | null;
          total_credit: number | null;
          total_debit: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
        ];
      };
      vue_capitaux_propres: {
        Row: {
          capital_101: number | null;
          capitaux_propres_nets: number | null;
          entreprise_id: string | null;
          resultat_net_120: number | null;
        };
        Insert: {
          capital_101?: never;
          capitaux_propres_nets?: never;
          entreprise_id?: string | null;
          resultat_net_120?: never;
        };
        Update: {
          capital_101?: never;
          capitaux_propres_nets?: never;
          entreprise_id?: string | null;
          resultat_net_120?: never;
        };
        Relationships: [];
      };
      vue_creances_en_cours: {
        Row: {
          created_at: string | null;
          echeance: string | null;
          entreprise_id: string | null;
          id: string | null;
          is_soldee: boolean | null;
          montant_initial: number | null;
          montant_recouvre: number | null;
          reference_id: string | null;
          reference_numero: string | null;
          solde: number | null;
          tiers_id: string | null;
          tiers_nom: string | null;
          tiers_type: Database["public"]["Enums"]["tiers_type"] | null;
          type_creance: string | null;
          updated_at: string | null;
          urgence: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "creances_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creances_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "creances_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "creances_tiers_id_fkey";
            columns: ["tiers_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      vue_dettes_en_cours: {
        Row: {
          created_at: string | null;
          echeance: string | null;
          entreprise_id: string | null;
          fournisseur_id: string | null;
          fournisseur_nom: string | null;
          id: string | null;
          is_partenaire_carburant: boolean | null;
          is_soldee: boolean | null;
          montant_initial: number | null;
          montant_regle: number | null;
          reference_id: string | null;
          reference_numero: string | null;
          solde: number | null;
          type_dette: string | null;
          updated_at: string | null;
          urgence: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dettes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dettes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "dettes_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "dettes_fournisseur_id_fkey";
            columns: ["fournisseur_id"];
            isOneToOne: false;
            referencedRelation: "tiers";
            referencedColumns: ["id"];
          },
        ];
      };
      vue_grand_livre: {
        Row: {
          credit: number | null;
          date_ecriture: string | null;
          debit: number | null;
          entreprise_id: string | null;
          is_central: boolean | null;
          libelle_compte: string | null;
          libelle_ecriture: string | null;
          numero_compte: string | null;
          numero_piece: string | null;
          reference_numero: string | null;
          station_id: string | null;
          tiers_nom: string | null;
          tresorerie_libelle: string | null;
          type_operation: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "ecritures_comptables_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      vue_mouvements_stock: {
        Row: {
          article_id: string | null;
          article_nom: string | null;
          cmup_unitaire: number | null;
          created_at: string | null;
          created_by: string | null;
          cuve_id: string | null;
          cuve_nom: string | null;
          date_mouvement: string | null;
          entreprise_id: string | null;
          famille_produit:
            | Database["public"]["Enums"]["famille_produit"]
            | null;
          id: string | null;
          motif: string | null;
          quantite: number | null;
          reference_id: string | null;
          reference_numero: string | null;
          reference_type: string | null;
          sens: string | null;
          station_destination_id: string | null;
          station_id: string | null;
          station_nom: string | null;
          stock_apres: number | null;
          stock_avant: number | null;
          type: Database["public"]["Enums"]["mouvement_type"] | null;
          type_carburant: string | null;
          valeur_totale: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "sessions_utilisateurs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_cuve_id_fkey";
            columns: ["cuve_id"];
            isOneToOne: false;
            referencedRelation: "cuves";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "entreprises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "mv_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "mouvements_stock_entreprise_id_fkey";
            columns: ["entreprise_id"];
            isOneToOne: false;
            referencedRelation: "vue_capitaux_propres";
            referencedColumns: ["entreprise_id"];
          },
          {
            foreignKeyName: "mouvements_stock_station_destination_id_fkey";
            columns: ["station_destination_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mouvements_stock_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      auth_get_compte_id: { Args: never; Returns: string };
      auth_is_superadmin: { Args: never; Returns: boolean };
      auth_write_entreprise_ids: { Args: never; Returns: string[] };
      auth_write_station_ids: { Args: never; Returns: string[] };
      calculer_capital_net: {
        Args: { p_initialisation_id: string };
        Returns: number;
      };
      calculer_cmup: {
        Args: {
          p_cmup_actuel: number;
          p_prix_achat: number;
          p_quantite_entree: number;
          p_stock_actuel: number;
        };
        Returns: number;
      };
      create_compte_gerant: {
        Args: {
          p_email: string;
          p_nom: string;
          p_telephone?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      generer_numero_sous_compte: {
        Args: { p_entreprise_id: string; p_numero_parent: string };
        Returns: string;
      };
      generer_numero_tiers: {
        Args: {
          p_entreprise_id: string;
          p_type: Database["public"]["Enums"]["tiers_type"];
        };
        Returns: string;
      };
      generer_numero_tresorerie: {
        Args: { p_entreprise_id: string; p_type: string };
        Returns: string;
      };
      get_volume_from_jauge: {
        Args: { p_cuve_id: string; p_jauge_cm: number };
        Returns: number;
      };
      refresh_materialized_views: { Args: never; Returns: undefined };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      verifier_partie_double: {
        Args: { p_ecriture_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      account_type: "superadmin" | "gerant" | "partenaire";
      achat_statut:
        | "commande"
        | "brouillon"
        | "paye"
        | "recu"
        | "mouvemente"
        | "comptabilise";
      doleance_statut: "envoyee" | "prise_en_charge" | "reglee";
      ecriture_statut: "brouillon" | "validee" | "annulee";
      famille_produit:
        | "carburants"
        | "lubrifiants"
        | "gpl"
        | "marchandises_generales"
        | "pieces_accessoires"
        | "services";
      inventaire_statut: "en_cours" | "enregistre" | "regularise";
      inventaire_type: "carburant" | "boutique";
      motif_ecart: "justifie" | "excedent" | "infonde";
      mouvement_type:
        | "entree_initiale"
        | "entree_achat"
        | "sortie_vente"
        | "sortie_vente_boutique"
        | "transfert_sortant"
        | "transfert_entrant"
        | "regularisation_inventaire";
      notif_type:
        | "nouvelle_doleance"
        | "doleance_prise_en_charge"
        | "stock_alerte"
        | "echeance_proche"
        | "station_a_valider"
        | "doleance_reglee";
      operation_hors_av_type:
        | "virement_interne"
        | "encaissement_creance"
        | "reglement_dette"
        | "charge_courante"
        | "salaire_avance"
        | "salaire_constatation"
        | "salaire_paiement"
        | "charge_fiscale_sociale"
        | "operation_gerant"
        | "acquisition_immobilisation"
        | "cession_immobilisation";
      partenaire_type: "officiel" | "non_officiel";
      session_status: "active" | "suspendue";
      shift_statut: "en_cours" | "cloture" | "mouvemente" | "comptabilise";
      station_status: "en_attente" | "validee" | "suspendue";
      tiers_type: "fournisseur" | "client" | "employe";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export type AccountType = Enums<"account_type">;
export type AchatStatut = Enums<"achat_statut">;
export type FamilleProduit = Enums<"famille_produit">;
export type DoleanceStatut = Enums<"doleance_statut">;
export type StationStatus = Enums<"station_status">;
export type MotifEcart = Enums<"motif_ecart">;
export type EcritureStatut = Enums<"ecriture_statut">;
export type TiersType = Enums<"tiers_type">;
export type InventaireStatut = Enums<"inventaire_statut">;
export type InventaireType = Enums<"inventaire_type">;
export type ShiftStatut = Enums<"shift_statut">;
export type SessionStatus = Enums<"session_status">;

export const Constants = {
  public: {
    Enums: {
      account_type: ["superadmin", "gerant", "partenaire"],
      achat_statut: [
        "commande",
        "brouillon",
        "paye",
        "recu",
        "mouvemente",
        "comptabilise",
      ],
      doleance_statut: ["envoyee", "prise_en_charge", "reglee"],
      ecriture_statut: ["brouillon", "validee", "annulee"],
      famille_produit: [
        "carburants",
        "lubrifiants",
        "gpl",
        "marchandises_generales",
        "pieces_accessoires",
        "services",
      ],
      inventaire_statut: ["en_cours", "enregistre", "regularise"],
      inventaire_type: ["carburant", "boutique"],
      motif_ecart: ["justifie", "excedent", "infonde"],
      mouvement_type: [
        "entree_initiale",
        "entree_achat",
        "sortie_vente",
        "sortie_vente_boutique",
        "transfert_sortant",
        "transfert_entrant",
        "regularisation_inventaire",
      ],
      notif_type: [
        "nouvelle_doleance",
        "doleance_prise_en_charge",
        "stock_alerte",
        "echeance_proche",
        "station_a_valider",
        "doleance_reglee",
      ],
      operation_hors_av_type: [
        "virement_interne",
        "encaissement_creance",
        "reglement_dette",
        "charge_courante",
        "salaire_avance",
        "salaire_constatation",
        "salaire_paiement",
        "charge_fiscale_sociale",
        "operation_gerant",
        "acquisition_immobilisation",
        "cession_immobilisation",
      ],
      partenaire_type: ["officiel", "non_officiel"],
      session_status: ["active", "suspendue"],
      shift_statut: ["en_cours", "cloture", "mouvemente", "comptabilise"],
      station_status: ["en_attente", "validee", "suspendue"],
      tiers_type: ["fournisseur", "client", "employe"],
    },
  },
} as const;
