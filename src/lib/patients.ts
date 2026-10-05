import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AppointmentWithDoctor = {
  id: string;
  scheduledAt: string;
  scheduledAtLocal: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  reason: string | null;
  doctor: {
    id: string;
    fullName: string | null;
    specialization: string | null;
  } | null;
};

export type AppointmentCounts = {
  upcoming: number;
  completed: number;
  cancelled: number;
};

export type PatientRecord = {
  id: string;
  createdAt: string;
  createdAtLocal: string;
  doctorName: string | null;
  specialization: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  prescriptions: string | null;
  notes: string | null;
};

function localIsoFromUtc(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString();
}

function appointmentFromRow(row: unknown): AppointmentWithDoctor | null {
  const r = row as Record<string, unknown>;
  if (!r || typeof r !== "object") return null;

  const doctorProfile = r.doctor_profiles as
    | { profile_id?: string; specialization?: string }
    | undefined;
  const profile = r.profiles as { id?: string; full_name?: string; role?: string } | undefined;

  return {
    id: String(r.id ?? ""),
    scheduledAt: String(r.scheduled_at ?? ""),
    scheduledAtLocal: localIsoFromUtc(String(r.scheduled_at ?? "")),
    durationMinutes: Number(r.duration_minutes ?? 30),
    status: String(r.status ?? "scheduled"),
    notes:
      typeof r.notes === "string"
        ? r.notes
        : (r.notes as string | null) ?? null,
    reason: null,
    doctor:
      doctorProfile && profile
        ? {
            id: doctorProfile.profile_id ?? "",
            fullName: profile.full_name ?? null,
            specialization: doctorProfile.specialization ?? null,
          }
        : null,
  };
}

function recordFromRow(row: unknown): PatientRecord | null {
  const r = row as Record<string, unknown>;
  if (!r || typeof r !== "object") return null;

  const appointment = (r.appointments as
    | {
        scheduled_at?: string;
        doctor_profiles?: { specialization?: string };
        profiles?: { full_name?: string };
      }
    | undefined) ?? null;

  return {
    id: String(r.id ?? ""),
    createdAt: String(r.created_at ?? ""),
    createdAtLocal: localIsoFromUtc(String(r.created_at ?? "")),
    doctorName: appointment?.profiles?.full_name ?? null,
    specialization: appointment?.doctor_profiles?.specialization ?? null,
    diagnosis:
      typeof r.diagnosis === "string"
        ? r.diagnosis
        : (r.diagnosis as string | null) ?? null,
    treatmentPlan:
      typeof r.treatment_plan === "string"
        ? r.treatment_plan
        : (r.treatment_plan as string | null) ?? null,
    prescriptions:
      typeof r.prescriptions === "string"
        ? r.prescriptions
        : (r.prescriptions as string | null) ?? null,
    notes:
      typeof r.notes === "string"
        ? r.notes
        : (r.notes as string | null) ?? null,
  };
}

function mapAppointmentsForPatient(data: unknown): AppointmentWithDoctor[] {
  const rows = (data ?? []) as unknown[];
  return rows
    .filter(Boolean)
    .map((row) => appointmentFromRow(row))
    .filter((item): item is AppointmentWithDoctor => item != null);
}

export async function getPatientDashboardData(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      scheduled_at,
      duration_minutes,
      status,
      notes,
      created_at,
      doctor_profiles (
        profile_id,
        specialization
      ),
      profiles (
        id,
        full_name,
        role
      )
    `,
    )
    .eq("patient_id", userId)
    .order("scheduled_at", { ascending: false });

  if (error) {
    return {
      counts: { upcoming: 0, completed: 0, cancelled: 0 },
      upcomingAppointments: [],
      error: "Could not load your appointments",
    };
  }

  const appointments = mapAppointmentsForPatient(data);

  const counts: AppointmentCounts = {
    upcoming: appointments.filter(
      (a) =>
        ["scheduled", "checked_in", "in_progress"].includes(a.status) &&
        new Date(a.scheduledAt) > new Date(),
    ).length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    ).length,
  };

  const upcomingAppointments = appointments
    .filter(
      (a) =>
        ["scheduled", "checked_in", "in_progress"].includes(a.status) &&
        new Date(a.scheduledAt) >= new Date(),
    )
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3);

  return {
    counts,
    upcomingAppointments,
    error: null,
  };
}

export async function getPatientAppointments(
  userId: string,
  status?: "all" | "upcoming" | "completed" | "cancelled",
) {
  const supabase = createClient();

  let query = supabase
    .from("appointments")
    .select(
      `
      id,
      scheduled_at,
      duration_minutes,
      status,
      notes,
      created_at,
      doctor_profiles (
        profile_id,
        specialization
      ),
      profiles (
        id,
        full_name
      )
    `,
    )
    .eq("patient_id", userId)
    .order("scheduled_at", { ascending: false });

  if (status && status !== "all") {
    if (status === "upcoming") {
      query = query.in("status", ["scheduled", "checked_in", "in_progress"]);
    } else if (status === "completed") {
      query = query.eq("status", "completed");
    } else if (status === "cancelled") {
      query = query.or("status.eq.cancelled,status.eq.no_show");
    }
  }

  const { data, error } = await query;

  if (error) {
    return {
      appointments: [],
      error: "Could not load appointments",
    };
  }

  const appointments = mapAppointmentsForPatient(data);

  return { appointments, error: null };
}

export async function getPatientRecords(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("medical_records")
    .select(
      `
      id,
      created_at,
      diagnosis,
      treatment_plan,
      prescriptions,
      notes,
      appointments (
        scheduled_at,
        doctor_profiles (
          specialization
        ),
        profiles (
          full_name
        )
      )
    `,
    )
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      records: [],
      error: "Could not load your records",
    };
  }

  const records = (data ?? [])
    .filter(Boolean)
    .map((row) => recordFromRow(row))
    .filter((item): item is PatientRecord => item != null);

  return { records, error: null };
}

export async function cancelAppointment(appointmentId: string, userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .eq("patient_id", userId);

  if (error) {
    return { ok: false, error: "Could not cancel this appointment" };
  }

  return { ok: true };
}
