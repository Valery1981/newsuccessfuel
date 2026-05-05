import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type WithRelationships<T> = T & { Relationships: never[] };

type DatabaseTyped = {
  public: {
    Tables: {
      [K in keyof Database["public"]["Tables"]]: WithRelationships<
        Database["public"]["Tables"][K]
      >;
    };
    Views: {
      [K in keyof Database["public"]["Views"]]: WithRelationships<
        Database["public"]["Views"][K]
      >;
    };
    Functions: Database["public"]["Functions"];
    Enums: Database["public"]["Enums"];
  };
};

/** Client service role : uniquement routes API serveur (jamais exposé au navigateur). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant pour l’admin Supabase."
    );
  }
  return createClient<DatabaseTyped>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
