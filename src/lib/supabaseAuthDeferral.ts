/**
 * Ne jamais appeler `supabase.from()` / `await` sur le client Supabase dans le callback
 * **synchrone** de `onAuthStateChange` : cela peut provoquer un deadlock où les autres
 * appels Supabase (formulaires, etc.) ne se résolvent plus (auth-js #762, doc Supabase
 * « Why is my supabase API call not returning »).
 */
export function runAfterAuthCallback(fn: () => void): void {
  setTimeout(fn, 0);
}
