import { createClient } from "@/lib/supabase/client";
import type { BookingSlot, BookingResult } from "@/types/bookings";
import {
  friendlyBookingError,
  bookingCodeLabel,
} from "@/lib/bookings";

export type DoctorWithProfile = {
  id: string;
  full_name: string | null;
  specialization: string | null;
  bio: string | null;
  is_active: boolean | null;
};

type RawDoctorRow = {
  profile_id?: string;
  specialization?: string | null;
  bio?: string | null;
  is_active?: boolean | null;
  profiles?: { id?: string; full_name?: string | null } | null;
};

export async function listActiveDoctors(): Promise<DoctorWithProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(`
      id,
      profile_id,
      specialization,
      bio,
      is_active,
      profiles (
        id,
        full_name
      )
    `)
    .not("is_active", "is", null)
    .eq("is_active", true)
    .order("profile_id");

  if (error) {
    return [];
  }

  const rows = (data ?? []) as RawDoctorRow[];

  const out: DoctorWithProfile[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as RawDoctorRow;
    if (typeof r.profile_id !== "string") continue;
    if (!r.profiles || typeof r.profiles !== "object") continue;
    const p = r.profiles as { id: string; full_name: string | null };
    out.push({
      id: r.profile_id,
      full_name: p.full_name ?? null,
      specialization: r.specialization ?? null,
      bio: r.bio ?? null,
      is_active: r.is_active ?? true,
    });
  }

  return out;
}

export async function loadAvailableSlots(
  doctorId: string,
  date: string,
): Promise<{ slots: BookingSlot[]; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_available_slots", {
    p_doctor_id: doctorId,
    p_date: date,
  });

  if (error) {
    return { slots: [], error: friendlyBookingError(error) };
  }

  if (!Array.isArray(data)) {
    return { slots: [], error: "Could not load available slots" };
  }

  const valid = data.filter((value): value is string => typeof value === "string");

  const slots: BookingSlot[] = valid.map((scheduledAt) => ({
    scheduledAt,
    label: formatSlotLabel(scheduledAt),
  }));

  return { slots, error: null };
}

export async function bookAppointment(
  patientId: string,
  doctorId: string,
  scheduledAt: string,
  reason: string,
): Promise<BookingResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("book_appointment", {
    p_patient_id: patientId,
    p_doctor_id: doctorId,
    p_scheduled_at: scheduledAt,
    p_reason: reason.slice(0, 200),
  });

  if (error) {
    return {
      ok: false,
      code: "unknown" as const,
      message: friendlyBookingError(error),
    };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      ok: false,
      code: "unknown" as const,
      message: "Could not book the appointment",
    };
  }

  const row = data[0] as {
    success?: boolean;
    appointment_id?: string;
    error_code?: unknown;
    error_message?: unknown;
  };
  if (!row) {
    return {
      ok: false,
      code: "unknown",
      message: "Could not book the appointment",
    };
  }

  if (typeof row.success === "boolean" && row.success && row.appointment_id) {
    return {
      ok: true,
      appointmentId: row.appointment_id,
    };
  }

  const rowErrorCode = String(row.error_code ?? "").toLowerCase();
  let errorCode: BookingResult["code"] = "unknown";
  if (rowErrorCode === "slot_taken") errorCode = "slot_taken";
  else if (rowErrorCode === "outside_working_hours") errorCode = "outside_working_hours";
  else if (rowErrorCode === "too_many_active_bookings") errorCode = "too_many_active_bookings";
  else if (rowErrorCode === "doctor_inactive") errorCode = "doctor_inactive";
  else if (rowErrorCode === "past_slot") errorCode = "past_slot";
  else if (rowErrorCode === "reason_too_long") errorCode = "reason_too_long";
  else if (rowErrorCode === "invalid_patient") errorCode = "invalid_patient";

  const errorMessage =
    typeof row.error_message === "string" && row.error_message.length > 0
      ? row.error_message
      : bookingCodeLabel(errorCode);

  return {
    ok: false,
    code: errorCode,
    message: errorMessage,
  };
}

export function formatSlotLabel(scheduledAt: string): string {
  const parsed = new Date(scheduledAt);
  if (isNaN(parsed.getTime())) {
    return scheduledAt;
  }

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  const hours = local.getHours();
  const minutes = local.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${h12}:${minutes} ${ampm}`;
}
