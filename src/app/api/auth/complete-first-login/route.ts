import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * Marque le compte comme ayant définitivement changé le mot de passe provisoire.
 * Utilise le JWT cookie (même contraintes RLS que le client) et filtre par auth.uid().
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Try comptes first
  const { data: compteData, error: compteError } = await supabase
    .from("comptes")
    .update({ must_change_password: false })
    .eq("supabase_user_id", user.id)
    .select("id, must_change_password")
    .maybeSingle();

  if (compteError) {
    return NextResponse.json(
      { error: compteError.message ?? "Mise à jour impossible" },
      { status: 500 },
    );
  }

  if (compteData) {
    return NextResponse.json({ ok: true as const, compte: compteData });
  }

  // Fallback: try sessions_utilisateurs (employee sessions)
  const { data: sessData, error: sessError } = await supabase
    .from("sessions_utilisateurs")
    .update({ must_change_password: false })
    .eq("supabase_user_id", user.id)
    .select("id, must_change_password")
    .maybeSingle();

  if (sessError) {
    return NextResponse.json(
      { error: sessError.message ?? "Mise à jour session impossible" },
      { status: 500 },
    );
  }

  if (!sessData) {
    return NextResponse.json(
      {
        error:
          "Aucune ligne compte ou session trouvée. Vérifiez les politiques RLS.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true as const, compte: sessData });
}
