import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Verify caller is a gerant
  const { data: callerCompte } = await supabase
    .from("comptes")
    .select("id, type")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (!callerCompte || callerCompte.type !== "gerant") {
    return NextResponse.json(
      { error: "Accès refusé — gérant requis" },
      { status: 403 },
    );
  }

  const body = (await req.json()) as {
    nom: string;
    email: string;
    poste?: string;
    motDePasseTemp: string;
  };

  if (!body.nom || !body.email || !body.motDePasseTemp) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Create Supabase auth user
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: body.email,
      password: body.motDePasseTemp,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create sessions_utilisateurs entry
  const { data: sess, error: sessError } = await supabase
    .from("sessions_utilisateurs")
    .insert({
      nom: body.nom,
      email: body.email,
      poste: body.poste ?? null,
      compte_parent_id: callerCompte.id,
      supabase_user_id: authData.user.id,
      status: "active",
      must_change_password: true,
    })
    .select()
    .single();

  if (sessError) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: sessError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session: sess });
}
