import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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
    return NextResponse.json({ error: "Accès refusé — gérant requis" }, { status: 403 });
  }

  const body = (await req.json()) as { session_id: string; motDePasseTemp: string };

  if (!body.session_id || !body.motDePasseTemp) {
    return NextResponse.json({ error: "session_id et motDePasseTemp requis" }, { status: 400 });
  }

  // Verify the session belongs to this gerant
  const { data: sess } = await supabase
    .from("sessions_utilisateurs")
    .select("id, supabase_user_id")
    .eq("id", body.session_id)
    .eq("compte_parent_id", callerCompte.id)
    .single();

  if (!sess?.supabase_user_id) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { error: pwError } = await admin.auth.admin.updateUserById(sess.supabase_user_id, {
    password: body.motDePasseTemp,
  });

  if (pwError) {
    return NextResponse.json({ error: pwError.message }, { status: 500 });
  }

  await supabase
    .from("sessions_utilisateurs")
    .update({ must_change_password: true })
    .eq("id", body.session_id);

  return NextResponse.json({ ok: true });
}
