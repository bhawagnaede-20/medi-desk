import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
};

const PROTECTED_PREFIXES = ["/patient", "/doctor", "/admin"];

function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function resolveDashboardForRole(role: string) {
  return ROLE_DASHBOARD_PATHS[role] ?? "/patient/dashboard";
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return response;
  }

  const session = await getSessionFromMiddleware(request);

  if (!session) {
    if (isProtectedRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (pathname === "/login" || pathname === "/register") {
    const dashboard = resolveDashboardForRole(session.role);
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  const expectedPrefix = `/${session.role}`;
  if (!pathname.startsWith(expectedPrefix)) {
    return NextResponse.redirect(new URL(resolveDashboardForRole(session.role), request.url));
  }

  if (!pathname.startsWith(`/${session.role}/`) && pathname !== `/${session.role}`) {
    return NextResponse.redirect(new URL(resolveDashboardForRole(session.role), request.url));
  }

  return response;
}

async function getSessionFromMiddleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  try {
    const authHeader = request.headers.get("authorization");
    const token =
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : request.cookies.get("sb-nexus-auth-token")?.value;

    if (!token) {
      return null;
    }

    const payload = await decodeJwt(token);
    if (!payload || typeof payload !== "object" || !payload.sub) {
      return null;
    }

    const profile = await fetchProfile(payload.sub, supabaseUrl, anonKey);
    if (!profile) {
      return null;
    }

    return {
      userId: payload.sub,
      role: profile.role,
      email: profile.email,
      fullName: profile.full_name,
    };
  } catch {
    return null;
  }
}

async function decodeJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8"),
    );

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && now > decoded.exp) {
      return null;
    }

    return decoded as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchProfile(
  userId: string,
  supabaseUrl: string,
  anonKey: string,
) {
  try {
    const url = `${supabaseUrl}/rest/v1/profiles?select=role,email,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const profiles = (await response.json()) as Array<{
      role: string;
      email?: string;
      full_name?: string;
    }>;

    if (!profiles || profiles.length === 0) {
      return null;
    }

    const profile = profiles[0];
    if (!profile || typeof profile !== "object") {
      return null;
    }

    const role = (profile as { role?: unknown }).role as string | undefined;
    const email = (profile as { email?: unknown }).email as string | undefined;
    const fullName = (profile as { full_name?: unknown }).full_name as string | undefined;

    if (typeof role !== "string") {
      return null;
    }

    return {
      role,
      email: typeof email === "string" ? email : undefined,
      full_name: typeof fullName === "string" ? fullName : undefined,
    };
  } catch {
    return null;
  }
}

export const config = {

  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|eot|otf)$|api|login|register).*)",
  ],
};
