export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          archived: boolean
          assigned_agent: string
          assigned_specialist: string
          company_name: string
          contact_person: string
          country: string
          created_at: string
          created_by: string | null
          email: string
          engagement_status: string
          first_name: string
          follow_up_required: boolean
          id: string
          industry: string
          kyc_documents: Json
          last_contact_date: string | null
          last_name: string
          notes: string
          onboard_date: string | null
          onboarding_status: string
          phone: string
          registration_date: string | null
          stage: Database["public"]["Enums"]["client_stage"]
          transaction_volume: number
          updated_at: string
          user_type: string
        }
        Insert: {
          archived?: boolean
          assigned_agent?: string
          assigned_specialist?: string
          company_name: string
          contact_person?: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string
          engagement_status?: string
          first_name?: string
          follow_up_required?: boolean
          id?: string
          industry?: string
          kyc_documents?: Json
          last_contact_date?: string | null
          last_name?: string
          notes?: string
          onboard_date?: string | null
          onboarding_status?: string
          phone?: string
          registration_date?: string | null
          stage?: Database["public"]["Enums"]["client_stage"]
          transaction_volume?: number
          updated_at?: string
          user_type?: string
        }
        Update: {
          archived?: boolean
          assigned_agent?: string
          assigned_specialist?: string
          company_name?: string
          contact_person?: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string
          engagement_status?: string
          first_name?: string
          follow_up_required?: boolean
          id?: string
          industry?: string
          kyc_documents?: Json
          last_contact_date?: string | null
          last_name?: string
          notes?: string
          onboard_date?: string | null
          onboarding_status?: string
          phone?: string
          registration_date?: string | null
          stage?: Database["public"]["Enums"]["client_stage"]
          transaction_volume?: number
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          archived: boolean
          assignee_id: string | null
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          requester_email: string
          requester_name: string
          resolved_at: string | null
          source: Database["public"]["Enums"]["ticket_source"]
          status: Database["public"]["Enums"]["ticket_status"]
          tags: string[]
          ticket_number: number
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          assignee_id?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester_email?: string
          requester_name?: string
          resolved_at?: string | null
          source?: Database["public"]["Enums"]["ticket_source"]
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[]
          ticket_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          assignee_id?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requester_email?: string
          requester_name?: string
          resolved_at?: string | null
          source?: Database["public"]["Enums"]["ticket_source"]
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[]
          ticket_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          department: Database["public"]["Enums"]["app_department"] | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          department?: Database["public"]["Enums"]["app_department"] | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          department?: Database["public"]["Enums"]["app_department"] | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_clients: { Args: { _user_id: string }; Returns: boolean }
      can_edit_tickets: { Args: { _user_id: string }; Returns: boolean }
      get_user_department: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_department"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_department:
        | "sales"
        | "marketing"
        | "customer_success"
        | "engineering"
        | "design"
        | "operations"
        | "support"
        | "onboarding"
        | "compliance"
        | "finance"
        | "hr"
        | "product_dev"
      app_role: "admin" | "manager" | "staff"
      client_stage:
        | "Lead"
        | "KYC Submitted"
        | "KYC Review"
        | "Verified"
        | "Onboarded"
        | "Active"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_source: "staff" | "portal" | "crm_import" | "email"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_on_client"
        | "resolved"
        | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_department: [
        "sales",
        "marketing",
        "customer_success",
        "engineering",
        "design",
        "operations",
        "support",
        "onboarding",
        "compliance",
        "finance",
        "hr",
        "product_dev",
      ],
      app_role: ["admin", "manager", "staff"],
      client_stage: [
        "Lead",
        "KYC Submitted",
        "KYC Review",
        "Verified",
        "Onboarded",
        "Active",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_source: ["staff", "portal", "crm_import", "email"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_on_client",
        "resolved",
        "closed",
      ],
    },
  },
} as const
