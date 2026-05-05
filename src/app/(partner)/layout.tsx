import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PartnerLayout } from "@/components/layout/PartnerLayout";
import { effectiveMustChangePassword } from "@/lib/effectiveMustChangePassword";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/public/login");

  const { data: compte } = await supabase
    .from("comptes")
    .select("type, must_change_password")
    .eq("supabase_user_id", user.id)
    .maybeSingle<{ type: string; must_change_password: boolean | null }>();

  if (!compte || compte.type !== "partenaire") {
    if (compte?.type === "superadmin") redirect("/admin/dashboard");
    if (compte?.type === "gerant") redirect("/manager/dashboard");
    redirect("/public/login");
  }

  if (effectiveMustChangePassword(compte.must_change_password, user)) {
    redirect("/public/first-login");
  }

  return <PartnerLayout>{children}</PartnerLayout>;
}
