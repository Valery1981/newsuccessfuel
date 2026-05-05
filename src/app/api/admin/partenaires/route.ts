import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const bodySchema = z.object({
  nom: z.string().min(2),
  type: z.enum(["officiel", "non_officiel"]),
  contact_nom: z.string().optional(),
  contact_email: z.string().email(),
  contact_telephone: z.string().optional(),
});

function generateOneTimePassword(): string {
  return randomBytes(12).toString("base64url");
}

export async function POST(req: Request) {
  let authUserId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authSessionErr,
    } = await supabase.auth.getUser();

    if (authSessionErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: adminRow, error: adminErr } = await supabase
      .from("comptes")
      .select("id")
      .eq("supabase_user_id", user.id)
      .eq("type", "superadmin")
      .maybeSingle();

    if (adminErr || !adminRow) {
      return NextResponse.json(
        { error: "Accès réservé au superadmin" },
        { status: 403 }
      );
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const p = parsed.data;
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json(
        {
          error:
            "Configuration serveur : définir SUPABASE_SERVICE_ROLE_KEY pour créer des comptes partenaires.",
        },
        { status: 500 }
      );
    }

    const oneTimePassword = generateOneTimePassword();
    const email = p.contact_email.trim().toLowerCase();
    const compteDisplayName = (p.contact_nom?.trim() || p.nom).slice(0, 255);

    const { data: authData, error: createAuthErr } =
      await admin.auth.admin.createUser({
        email,
        password: oneTimePassword,
        email_confirm: true,
        user_metadata: {
          display_name: compteDisplayName,
          must_change_password: true,
        },
      });

    if (createAuthErr || !authData.user) {
      const msg =
        createAuthErr?.message ?? "Impossible de créer l’utilisateur Auth";
      const lower = msg.toLowerCase();
      const status =
        lower.includes("already") || lower.includes("registered")
          ? 409
          : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    authUserId = authData.user.id;

    const { data: compteRow, error: compteErr } = await admin
      .from("comptes")
      .insert({
        supabase_user_id: authUserId,
        type: "partenaire",
        nom: compteDisplayName,
        email,
        telephone: p.contact_telephone?.trim() || null,
        must_change_password: true,
      })
      .select("id")
      .single();

    if (compteErr || !compteRow) {
      await admin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        {
          error:
            compteErr?.message ??
            "Erreur lors de la création du compte partenaire",
        },
        { status: 500 }
      );
    }

    const { data: partRow, error: partErr } = await admin
      .from("partenaires")
      .insert({
        compte_id: compteRow.id,
        nom: p.nom,
        type: p.type,
        contact_nom: p.contact_nom?.trim() || null,
        contact_email: email,
        contact_telephone: p.contact_telephone?.trim() || null,
        created_by: adminRow.id,
      })
      .select(
        "id, nom, logo_url, type, contact_nom, contact_email, contact_telephone, is_active, created_at"
      )
      .single();

    if (partErr || !partRow) {
      await admin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: partErr?.message ?? "Erreur lors de la création du partenaire" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      partenaire: partRow,
      oneTimePassword,
      loginEmail: email,
    });
  } catch (e) {
    if (authUserId) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(authUserId);
      } catch {
        /* best effort */
      }
    }
    console.error("[api/admin/partenaires]", e);
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
}
