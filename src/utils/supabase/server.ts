import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

// Même utilitaire que client.ts — résout les types Supabase v2
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

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<DatabaseTyped>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — ignore cookie mutation errors
          }
        },
      },
    }
  );
}
