import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email?: string;
  fullName?: string | null;
  role: "patient" | "doctor" | "admin";
};

export function requireRole(
  user: SessionUser | null,
  allowedRole: "patient" | "doctor" | "admin",
  fallbackPath = "/login",
): void {
  if (!user) {
    redirect(fallbackPath);
  }

  if (user.role !== allowedRole) {
    const dashboardMap: Record<SessionUser["role"], string> = {
      patient: "/patient/dashboard",
      doctor: "/doctor/dashboard",
      admin: "/admin/dashboard",
    };
    redirect(dashboardMap[user.role] ?? fallbackPath);
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: user.id,
    email: profile.email,
    fullName: profile.full_name,
    role:
      profile.role === "patient"
        ? "patient"
        : profile.role === "doctor"
          ? "doctor"
          : profile.role === "admin"
            ? "admin"
            : "patient",
  };
}

export async function getProfile(userId: string): Promise<
  | {
      id: string;
      fullName: string | null;
      email: string | null;
      role: "patient" | "doctor" | "admin";
    }
  | null
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role:
      data.role === "patient"
        ? "patient"
        : data.role === "doctor"
          ? "doctor"
          : data.role === "admin"
            ? "admin"
            : "patient",
  };
}

export async function requireAuthSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requirePatientSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  requireRole(user, "patient", "/login");
  return user;
}

export async function requireDoctorSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  requireRole(user, "doctor", "/login");
  return user;
}

export async function requireAdminSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  requireRole(user, "admin", "/login");
  return user;
}

export const requirePatient: typeof requirePatientSession = requirePatientSession;
export const requireDoctor: typeof requireDoctorSession = requireDoctorSession;
export const requireAdmin: typeof requireAdminSession = requireAdminSession;
