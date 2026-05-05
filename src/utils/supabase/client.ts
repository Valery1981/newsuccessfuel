import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Utilitaire TypeScript : ajoute automatiquement Relationships: never[] à toutes les tables/vues
// Nécessaire car la librairie supabase-js v2 exige ce champ dans son type GenericTable
type WithRelationships<T> = T & { Relationships: never[] };

type DatabaseTyped = {
  public: {
    Tables: {
      [K in keyof Database["public"]["Tables"]]: WithRelationships<Database["public"]["Tables"][K]>;
    };
    Views: {
      [K in keyof Database["public"]["Views"]]: WithRelationships<Database["public"]["Views"][K]>;
    };
    Functions: Database["public"]["Functions"];
    Enums: Database["public"]["Enums"];
  };
};

export function createClient() {
  return createBrowserClient<DatabaseTyped>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
