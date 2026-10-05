import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type PatientProfile = Database["public"]["Tables"]["patient_profiles"]["Row"];
export type PatientProfileInsert = Database["public"]["Tables"]["patient_profiles"]["Insert"];
export type PatientProfileUpdate = Database["public"]["Tables"]["patient_profiles"]["Update"];

export type DoctorProfile = Database["public"]["Tables"]["doctor_profiles"]["Row"];
export type DoctorProfileInsert = Database["public"]["Tables"]["doctor_profiles"]["Insert"];
export type DoctorProfileUpdate = Database["public"]["Tables"]["doctor_profiles"]["Update"];

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

export type MedicalRecord = Database["public"]["Tables"]["medical_records"]["Row"];
export type MedicalRecordInsert = Database["public"]["Tables"]["medical_records"]["Insert"];
export type MedicalRecordUpdate = Database["public"]["Tables"]["medical_records"]["Update"];

export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
export type AuditLogUpdate = Database["public"]["Tables"]["audit_logs"]["Update"];

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type UserRole = "patient" | "doctor" | "admin";

export type ProfilesRelations = {
  patient_profile?: PatientProfile;
  doctor_profile?: DoctorProfile;
  appointments?: Appointment[];
  medical_records?: MedicalRecord[];
  audit_logs?: AuditLog[];
};

export type AppointmentsRelations = {
  patient?: Profile;
  doctor?: Profile;
  medical_record?: MedicalRecord | null;
};

export type MedicalRecordsRelations = {
  patient?: Profile;
  doctor?: Profile;
  appointment?: Appointment | null;
};

export type AuditLogsRelations = {
  actor?: Profile | null;
  resource?: Record<string, unknown> | null;
};
