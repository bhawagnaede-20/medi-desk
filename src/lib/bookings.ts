import { createClient } from "@/lib/supabase/client";
import type { BookingSlot, BookingResult } from "@/types/bookings";

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
    const p = (r.profiles as { id: string; full_name: string | null } | null) ?? null;
    out.push({
      id: r.profile_id,
      full_name: p?.full_name ?? null,
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
      code: "unknown",
      message: friendlyBookingError(error),
    };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      ok: false,
      code: "unknown",
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

export function friendlyBookingError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Could not book the appointment";
  }

  const e = error as { status?: number; code?: unknown; message?: unknown };

  if (typeof e.status === "number" && e.status === 409) {
    return "This slot is no longer available";
  }

  if (typeof e.status === "number" && e.status === 403) {
    return "You are not allowed to book this appointment";
  }

  if (typeof e.status === "number" && e.status >= 500) {
    return "The booking service is unavailable right now";
  }

  const code = String(e.code ?? "");
  if (/slot_taken/i.test(code)) {
    return "This slot is no longer available";
  }
  if (/working/i.test(code) || /hour/i.test(code)) {
    return "This time is outside the doctor's working hours";
  }
  if (/active|many/i.test(code)) {
    return "You already have too many active bookings";
  }
  if (/inactive/i.test(code)) {
    return "This doctor is not currently available";
  }

  const message = e.message;
  if (typeof message === "string" && message.length > 0) {
    if (/slot_taken/i.test(message)) {
      return "This slot is no longer available";
    }
    if (/working/i.test(message) || /hour/i.test(message)) {
      return "This time is outside the doctor's working hours";
    }
    if (/active/i.test(message) || /many/i.test(message)) {
      return "You already have too many active bookings";
    }
    if (/inactive/i.test(message)) {
      return "This doctor is not currently available";
    }
    if (/past/i.test(message)) {
      return "Cannot book a past time";
    }
  }

  return "Could not book the appointment";
}

export function bookingCodeLabel(code: BookingResult["code"]): string {
  switch (code) {
    case "slot_taken":
      return "This slot is no longer available";
    case "outside_working_hours":
      return "This time is outside the doctor's working hours";
    case "too_many_active_bookings":
      return "You already have too many active bookings";
    case "doctor_inactive":
      return "This doctor is not currently available";
    case "past_slot":
      return "Cannot book a past time";
    case "reason_too_long":
      return "Reason must be 200 characters or fewer";
    case "invalid_patient":
      return "Invalid patient";
    default:
      return "Could not book the appointment";
  }
}
