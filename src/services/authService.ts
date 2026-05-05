import type { AccountType } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signup(params: {
    email: string;
    password: string;
    nom: string;
    telephone?: string;
  }) {
    // Crée l'utilisateur Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error("Erreur lors de la création du compte");

    // Crée le compte via RPC SECURITY DEFINER — contourne le timing RLS
    // (auth.uid() peut être NULL si email confirmation activée)
    const { data: compteId, error: compteError } = await supabase.rpc(
      "create_compte_gerant",
      {
        p_user_id: authData.user.id,
        p_nom: params.nom,
        p_email: params.email,
        p_telephone: params.telephone ?? undefined,
      },
    );

    if (compteError) throw compteError;
    if (!compteId) throw new Error("Erreur lors de la création du profil");

    // Relit le compte créé pour retourner l'objet complet
    const { data: compte, error: readError } = await supabase
      .from("comptes")
      .select("*")
      .eq("id", compteId)
      .single();

    if (readError) throw readError;

    return { user: authData.user, compte };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async getAccountType(userId: string): Promise<AccountType | null> {
    const { data } = await supabase
      .from("comptes")
      .select("type")
      .eq("supabase_user_id", userId)
      .maybeSingle();
    return data?.type ?? null;
  },
};
