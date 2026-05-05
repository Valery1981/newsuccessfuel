import type { PermissionsRecord } from "@/lib/permissions";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccountType =
  | "superadmin"
  | "gerant"
  | "partenaire"
  | "session_gerant";

export interface CompteInfo {
  id: string;
  type: AccountType;
  nom: string;
  email: string;
  telephone?: string;
  is_active: boolean;
  /** Compte créé avec mot de passe provisoire — doit être changé à la première connexion. */
  must_change_password?: boolean;
  /** ID de la session_utilisateur si type === session_gerant */
  session_id?: string;
  /** Poste fonctionnel pour les sessions employés */
  poste?: string | null;
}

export interface EntrepriseInfo {
  id: string;
  nom: string;
  pays: string;
  adresse?: string | null;
  nif?: string | null;
  stat?: string | null;
  rcs?: string | null;
  telephone?: string | null;
  whatsapp?: string | null;
  logo_url?: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  compte: CompteInfo | null;
  entreprise: EntrepriseInfo | null;
  droits: PermissionsRecord | null;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setCompte: (compte: CompteInfo | null) => void;
  setEntreprise: (entreprise: EntrepriseInfo | null) => void;
  setDroits: (droits: PermissionsRecord | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;

  // Derived
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
  isGerant: () => boolean;
  isPartenaire: () => boolean;
  isSession: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      compte: null,
      entreprise: null,
      droits: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setCompte: (compte) => set({ compte }),
      setEntreprise: (entreprise) => set({ entreprise }),
      setDroits: (droits) => set({ droits }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      reset: () =>
        set({
          user: null,
          session: null,
          compte: null,
          entreprise: null,
          droits: null,
          isLoading: false,
          isInitialized: true,
        }),

      isAuthenticated: () => !!get().user && !!get().session,
      isSuperAdmin: () => get().compte?.type === "superadmin",
      isGerant: () =>
        get().compte?.type === "gerant" ||
        get().compte?.type === "session_gerant",
      isPartenaire: () => get().compte?.type === "partenaire",
      isSession: () => get().compte?.type === "session_gerant",
    }),
    {
      // v2 : ne plus persister `compte` (évite un état périmé / must_change_password absent qui
      // écrase la vérité serveur après réhydratation).
      name: "successfuel-auth-v2",
      partialize: (state) => ({
        entreprise: state.entreprise,
      }),
    },
  ),
);
