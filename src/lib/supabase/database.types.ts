// This file mirrors what `@supabase/gen` would emit for a project with
// the MediDesk schema. It exists so the frontend can type Supabase
// responses against the same shapes used in src/types/db.ts.
//
// When the real Supabase project is linked, replace these with the
// generated types from `supabase gen types typescript`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: "patient" | "doctor" | "admin";
          avatar_url: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role: "patient" | "doctor" | "admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: "patient" | "doctor" | "admin";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      patient_profiles: {
        Row: {
          id: string;
          profile_id: string;
          date_of_birth: string | null;
          blood_type: string | null;
          allergies: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          profile_id: string;
          date_of_birth?: string | null;
          blood_type?: string | null;
          allergies?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          date_of_birth?: string | null;
          blood_type?: string | null;
          allergies?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      doctor_profiles: {
        Row: {
          id: string;
          profile_id: string;
          specialization: string | null;
          license_number: string | null;
          years_of_experience: number | null;
          bio: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          profile_id: string;
          specialization?: string | null;
          license_number?: string | null;
          years_of_experience?: number | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          specialization?: string | null;
          license_number?: string | null;
          years_of_experience?: number | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          scheduled_at: string;
          duration_minutes: number;
          status: "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          patient_id: string;
          doctor_id: string;
          scheduled_at: string;
          duration_minutes: number;
          status?: "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          scheduled_at?: string;
          duration_minutes?: number;
          status?: "scheduled" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      medical_records: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          appointment_id: string | null;
          diagnosis: string | null;
          treatment_plan: string | null;
          prescriptions: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          patient_id: string;
          doctor_id: string;
          appointment_id?: string | null;
          diagnosis?: string | null;
          treatment_plan?: string | null;
          prescriptions?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          appointment_id?: string | null;
          diagnosis?: string | null;
          treatment_plan?: string | null;
          prescriptions?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          actor_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
