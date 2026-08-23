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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      follow_up_records: {
        Row: {
          created_at: string
          id: string
          method: string
          notes: string | null
          occurred_at: string
          result: string
          talent_id: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          occurred_at?: string
          result: string
          talent_id: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          occurred_at?: string
          result?: string
          talent_id?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_records_talent_owner_fk"
            columns: ["talent_id", "user_id"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "follow_up_records_task_owner_fk"
            columns: ["task_id", "talent_id", "user_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id", "talent_id", "user_id"]
          },
          {
            foreignKeyName: "follow_up_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_contact_records: {
        Row: {
          created_at: string
          id: string
          method: string
          notes: string | null
          occurred_at: string
          resource_id: string
          result: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          occurred_at?: string
          resource_id: string
          result: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          occurred_at?: string
          resource_id?: string
          result?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_contact_records_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "talent_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "resource_contact_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_resources: {
        Row: {
          category: string
          converted_at: string | null
          converted_talent_id: string | null
          created_at: string
          discovered_at: string
          follower_count: number | null
          id: string
          next_action_at: string | null
          nickname: string
          notes: string | null
          platform_account: string | null
          primary_platform: string
          priority: string
          processing_status: string
          profile_url: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
          wechat: string | null
        }
        Insert: {
          category: string
          converted_at?: string | null
          converted_talent_id?: string | null
          created_at?: string
          discovered_at?: string
          follower_count?: number | null
          id?: string
          next_action_at?: string | null
          nickname: string
          notes?: string | null
          platform_account?: string | null
          primary_platform: string
          priority?: string
          processing_status?: string
          profile_url?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wechat?: string | null
        }
        Update: {
          category?: string
          converted_at?: string | null
          converted_talent_id?: string | null
          created_at?: string
          discovered_at?: string
          follower_count?: number | null
          id?: string
          next_action_at?: string | null
          nickname?: string
          notes?: string | null
          platform_account?: string | null
          primary_platform?: string
          priority?: string
          processing_status?: string
          profile_url?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wechat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_resources_converted_talent_owner_fk"
            columns: ["converted_talent_id", "user_id"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "talent_resources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talents: {
        Row: {
          archived_at: string | null
          created_at: string
          follower_count: number | null
          id: string
          nickname: string
          notes: string | null
          platform_account: string | null
          primary_platform: string
          priority: string
          profile_url: string | null
          stage: string
          tags: string[]
          updated_at: string
          user_id: string
          wechat: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          nickname: string
          notes?: string | null
          platform_account?: string | null
          primary_platform: string
          priority?: string
          profile_url?: string | null
          stage?: string
          tags?: string[]
          updated_at?: string
          user_id: string
          wechat?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          nickname?: string
          notes?: string | null
          platform_account?: string | null
          primary_platform?: string
          priority?: string
          profile_url?: string | null
          stage?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          wechat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agent_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          creator_id: string
          due_at: string
          execution_source: string
          id: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          resource_id: string | null
          result_code: string | null
          result_notes: string | null
          started_at: string | null
          status: string
          talent_id: string | null
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          due_at: string
          execution_source?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          resource_id?: string | null
          result_code?: string | null
          result_notes?: string | null
          started_at?: string | null
          status?: string
          talent_id?: string | null
          task_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          due_at?: string
          execution_source?: string
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          resource_id?: string | null
          result_code?: string | null
          result_notes?: string | null
          started_at?: string | null
          status?: string
          talent_id?: string | null
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_resource_owner_fk"
            columns: ["resource_id", "user_id"]
            isOneToOne: false
            referencedRelation: "talent_resources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_talent_owner_fk"
            columns: ["talent_id", "user_id"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_agent_task_result: {
        Args: {
          p_next_action?: string
          p_next_action_at?: string
          p_occurred_at?: string
          p_result_code: string
          p_result_notes?: string
          p_task_id: string
        }
        Returns: {
          result_code: string
          status: string
          task_id: string
        }[]
      }
      complete_task_and_record_follow_up: {
        Args: { p_talent_id: string; p_task_id: string }
        Returns: {
          completed_task_id: string
          follow_up_record_id: string
        }[]
      }
      convert_talent_resource: {
        Args: { p_resource_id: string }
        Returns: string
      }
      record_follow_up_and_schedule_next: {
        Args: {
          p_method: string
          p_next_stage?: string
          p_next_task_due_at?: string
          p_next_task_notes?: string
          p_next_task_type?: string
          p_notes?: string
          p_occurred_at: string
          p_result: string
          p_talent_id: string
          p_task_id?: string
        }
        Returns: {
          completed_task_id: string
          follow_up_record_id: string
          next_task_id: string
        }[]
      }
      record_resource_contact_and_maybe_convert: {
        Args: {
          p_method: string
          p_next_action_at?: string
          p_notes?: string
          p_occurred_at: string
          p_resource_id: string
          p_result: string
        }
        Returns: {
          converted_talent_id: string
          resource_contact_record_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
