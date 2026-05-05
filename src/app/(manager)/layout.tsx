import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const ONBOARDING_STEP_PATH: Record<string, string> = {
  station_info: "/cuves",
  cuves: "/cuves",
  pistolets: "/pistolets",
  boutique: "/boutique",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/public/login");

  // Check comptes (gérant)
  const { data: compte } = await supabase
    .from("comptes")
    .select("id, type")
    .eq("supabase_user_id", user.id)
    .maybeSingle<{ id: string; type: string }>();

  if (compte?.type === "gerant") {
    // Vérifier si une station de CE gérant est en cours d'onboarding
    const { data: entreprise } = await supabase
      .from("entreprises")
      .select("id")
      .eq("compte_id", compte.id)
      .maybeSingle<{ id: string }>();

    if (entreprise) {
      const { data: incomplete } = await supabase
        .from("stations")
        .select("id, onboarding_step")
        .eq("entreprise_id", entreprise.id)
        .neq("onboarding_step", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; onboarding_step: string }>();

      if (incomplete) {
        const path = ONBOARDING_STEP_PATH[incomplete.onboarding_step];
        if (path) redirect(`${path}?station_id=${incomplete.id}`);
      }
    }

    return <ManagerLayout>{children}</ManagerLayout>;
  }

  // Check sessions_utilisateurs (employee sessions)
  const { data: sess } = await supabase
    .from("sessions_utilisateurs")
    .select("id, status")
    .eq("supabase_user_id", user.id)
    .maybeSingle<{ id: string; status: string | null }>();

  if (sess?.status === "active") {
    return <ManagerLayout>{children}</ManagerLayout>;
  }

  redirect("/public/login");
}
