import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Publishable key only: the browser-safe key. No service-role key is used anywhere in the web app.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot write cookies. The proxy refreshes the session instead.
        }
      },
    },
  });
}
