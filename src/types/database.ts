export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string
          destination: string
          start_date: string
          end_date: string
          budget: number
          pace: string
          interests: string[] | null
          total_cost: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          destination: string
          start_date: string
          end_date: string
          budget?: number
          pace?: string
          interests?: string[] | null
          total_cost?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          destination?: string
          start_date?: string
          end_date?: string
          budget?: number
          pace?: string
          interests?: string[] | null
          total_cost?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      day_plans: {
        Row: {
          id: string
          trip_id: string
          day_number: number
          date: string
          total_cost: number | null
          total_duration: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          day_number: number
          date: string
          total_cost?: number | null
          total_duration?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          trip_id?: string
          day_number?: number
          date?: string
          total_cost?: number | null
          total_duration?: number | null
          created_at?: string | null
        }
      }
      activities: {
        Row: {
          id: string
          day_plan_id: string
          time: string
          name: string
          type: string
          description: string | null
          duration: number | null
          cost: number | null
          location_lat: number | null
          location_lng: number | null
          location_address: string | null
          why_this: string | null
          order_index: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          day_plan_id: string
          time: string
          name: string
          type?: string
          description?: string | null
          duration?: number | null
          cost?: number | null
          location_lat?: number | null
            }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}