import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const PUBLIC_PATHS = ["/public/login", "/public/signup", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle auth callback
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // Update Supabase session
  const { supabaseResponse, user } = await updateSession(request);

  // Public paths — no auth required
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublicPath) {
    // UX : un user déjà connecté n'a pas à voir la page login/signup.
    // La page.tsx (root) redirige ensuite vers le bon dashboard selon le rôle.
    // Pas de boucle : page.tsx redirige les comptes manquants vers /auth/no-account,
    // qui n'est pas une public path et n'est donc pas intercepté ici.
    if (user && (pathname.includes("/login") || pathname.includes("/signup"))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // Root path — redirect based on role
  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/public/login", request.url));
    }
    return supabaseResponse;
  }

  // Protected paths — require auth
  if (!user) {
    const loginUrl = new URL("/public/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
