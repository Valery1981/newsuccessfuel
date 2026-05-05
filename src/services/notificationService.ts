import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";

type NotifType = Database["public"]["Enums"]["notif_type"];

export interface NotificationRow {
  id: string;
  type: NotifType;
  titre: string;
  message: string | null;
  is_lue: boolean | null;
  created_at: string | null;
  reference_id: string | null;
  reference_type: string | null;
}

export async function createNotification(payload: {
  destinataire_compte_id: string;
  type: NotifType;
  titre: string;
  message: string;
  reference_id?: string;
  reference_type?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert({
    destinataire_compte_id: payload.destinataire_compte_id,
    type: payload.type,
    titre: payload.titre,
    message: payload.message,
    reference_id: payload.reference_id ?? null,
    reference_type: payload.reference_type ?? null,
    is_lue: false,
  });
  if (error) console.error("[notif] create error:", error.message);
}

export async function getNotifications(
  compteId: string,
): Promise<NotificationRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, titre, message, is_lue, created_at, reference_id, reference_type",
    )
    .eq("destinataire_compte_id", compteId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as NotificationRow[];
}

export async function markNotifAsRead(id: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_lue: true, lue_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markAllNotifsAsRead(compteId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_lue: true, lue_at: new Date().toISOString() })
    .eq("destinataire_compte_id", compteId)
    .eq("is_lue", false);
}

/** Notify partenaire TM when a new doléance is created by the station */
export async function notifyNouvelleDoceleance(
  doleanceId: string,
  partenaireId: string,
  stationNom: string,
  typeIncident: string,
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("partenaires")
    .select("compte_id")
    .eq("id", partenaireId)
    .maybeSingle();
  if (!(data as { compte_id?: string } | null)?.compte_id) return;
  await createNotification({
    destinataire_compte_id: (data as { compte_id: string }).compte_id,
    type: "nouvelle_doleance",
    titre: "Nouvelle doléance",
    message: `${typeIncident.replace(/_/g, " ")} signalée à ${stationNom}`,
    reference_id: doleanceId,
    reference_type: "doleance",
  });
}

/** Notify station manager when TM takes charge of a doléance */
export async function notifyPriseEnCharge(
  doleanceId: string,
  stationId: string,
): Promise<void> {
  const supabase = createClient();
  const { data: stData } = await supabase
    .from("stations")
    .select("entreprise_id, nom")
    .eq("id", stationId)
    .maybeSingle();
  const st = stData as { entreprise_id: string; nom: string } | null;
  if (!st?.entreprise_id) return;
  const { data: entData } = await supabase
    .from("entreprises")
    .select("compte_id")
    .eq("id", st.entreprise_id)
    .maybeSingle();
  const ent = entData as { compte_id: string | null } | null;
  if (!ent?.compte_id) return;
  await createNotification({
    destinataire_compte_id: ent.compte_id,
    type: "doleance_prise_en_charge",
    titre: "Doléance prise en charge",
    message: `La doléance de ${st.nom} a été prise en charge par le partenaire`,
    reference_id: doleanceId,
    reference_type: "doleance",
  });
}

/** Notify partenaire when a doléance is marked réglée */
export async function notifyDoleanceReglee(
  doleanceId: string,
  partenaireId: string,
  stationNom: string,
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("partenaires")
    .select("compte_id")
    .eq("id", partenaireId)
    .maybeSingle();
  if (!(data as { compte_id?: string } | null)?.compte_id) return;
  await createNotification({
    destinataire_compte_id: (data as { compte_id: string }).compte_id,
    type: "doleance_reglee",
    titre: "Doléance réglée",
    message: `La doléance de ${stationNom} a été réglée`,
    reference_id: doleanceId,
    reference_type: "doleance",
  });
}
