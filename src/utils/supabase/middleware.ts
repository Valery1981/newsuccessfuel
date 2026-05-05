import type { Database } from "@/types/supabase";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<DatabaseTyped>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return { supabaseResponse, user };
}
