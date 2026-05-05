import { AdminLayout } from "@/components/layout/AdminLayout";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Toutes les routes /admin/* sont exclusivement réservées au superadmin (cf. Guide §2).
export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/public/login");

  const { data: compte } = await supabase
    .from("comptes")
    .select("type")
    .eq("supabase_user_id", user.id)
    .maybeSingle<{ type: string }>();

  if (!compte || compte.type !== "superadmin") {
    // Gérant → son dashboard, partenaire → son dashboard, sinon login
    if (compte?.type === "gerant") redirect("/manager/dashboard");
    if (compte?.type === "partenaire") redirect("/partner/dashboard");
    redirect("/public/login");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
