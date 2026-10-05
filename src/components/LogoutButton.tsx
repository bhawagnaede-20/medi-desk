"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT" && !ignore) {
        router.push("/login");
        router.refresh();
      }
    });
    return () => {
      ignore = true;
    };
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSigningOut}
      className="
        inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5
        text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-300
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
