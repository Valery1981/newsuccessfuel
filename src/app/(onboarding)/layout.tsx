import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// L'onboarding est EXCLUSIVEMENT réservé au gérant (cf. Guide §3 & §5).
// Superadmin et partenaire ont leurs propres interfaces et n'ont pas d'onboarding.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/public/login");

  const { data: compte } = await supabase
    .from("comptes")
    .select("type")
    .eq("supabase_user_id", user.id)
    .maybeSingle<{ type: string }>();

  if (compte?.type === "superadmin") redirect("/admin/dashboard");
  if (compte?.type === "partenaire") redirect("/partner/dashboard");

  // Si compte null (DB non configurée) ou type "gerant" → accès autorisé
  return <OnboardingLayout>{children}</OnboardingLayout>;
}
