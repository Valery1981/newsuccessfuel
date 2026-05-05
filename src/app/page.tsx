import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { effectiveMustChangePassword } from "@/lib/effectiveMustChangePassword";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/public/login");
  }

  const { data: compte } = await supabase
    .from("comptes")
    .select("type, must_change_password")
    .eq("supabase_user_id", user.id)
    .maybeSingle<{ type: string; must_change_password: boolean | null }>();

  if (!compte) {
    // L'utilisateur est authentifié dans Supabase Auth mais n'a pas de compte
    // dans la table `comptes` (schéma DB non appliqué ou compte non créé).
    // /auth/no-account n'est pas une public path → pas de boucle proxy ↔ page.
    redirect("/auth/no-account");
  }

  if (effectiveMustChangePassword(compte.must_change_password, user)) {
    redirect("/public/first-login");
  }

  if (compte.type === "superadmin") redirect("/admin/dashboard");
  if (compte.type === "gerant") redirect("/manager/dashboard");
  if (compte.type === "partenaire") redirect("/partner/dashboard");

  redirect("/public/login");
}
