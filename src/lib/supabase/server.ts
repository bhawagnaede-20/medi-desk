import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise;
          const cookie = cookieStore.get(name);
          return cookie?.value ?? undefined;
        },
        async set(name: string, value: string) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set(name, value);
          } catch {
            // Server Component path; safe to ignore.
          }
        },
        async remove(name: string) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set(name, "");
          } catch {
            // Server Component path; safe to ignore.
          }
        },
      },
    },
  );
}

export type { Database } from "./database.types";
