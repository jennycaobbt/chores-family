export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chores: {
        Row: {
          archived: boolean
          created_at: string
          default_person_id: string | null
          frequency_n: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          icon: string | null
          id: string
          location_id: string | null
          name: string
          points: number
        }
        Insert: {
          archived?: boolean
          created_at?: string
          default_person_id?: string | null
          frequency_n?: number | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          icon?: string | null
          id?: string
          location_id?: string | null
          name: string
          points?: number
        }
        Update: {
          archived?: boolean
          created_at?: string
          default_person_id?: string | null
          frequency_n?: number | null
          frequency_type?: Database["public"]["Enums"]["frequency_type"]
          icon?: string | null
          id?: string
          location_id?: string | null
          name?: string
          points?: number
        }
        Relationships: []
      }
      completions: {
        Row: {
          chore_id: string
          completed_at: string
          id: string
          person_id: string
          points_awarded: number
        }
        Insert: {
          chore_id: string
          completed_at?: string
          id?: string
          person_id: string
          points_awarded: number
        }
        Update: {
          chore_id?: string
          completed_at?: string
          id?: string
          person_id?: string
          points_awarded?: number
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_url: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      frequency_type:
        | "daily"
        | "weekly"
        | "monthly"
        | "every_n_days"
        | "every_n_weeks"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Person = Database["public"]["Tables"]["people"]["Row"]
export type Location = Database["public"]["Tables"]["locations"]["Row"]
export type Chore = Database["public"]["Tables"]["chores"]["Row"]
export type Completion = Database["public"]["Tables"]["completions"]["Row"]
export type FrequencyType = Database["public"]["Enums"]["frequency_type"]
