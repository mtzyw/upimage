export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      anonymous_tasks: {
        Row: {
          batch_id: string | null
          browser_fingerprint: string
          created_at: string
          freepik_task_id: string
          result_data: Json | null
          scale_factor: string
          status: string
        }
        Insert: {
          batch_id?: string | null
          browser_fingerprint: string
          created_at?: string
          freepik_task_id: string
          result_data?: Json | null
          scale_factor?: string
          status?: string
        }
        Update: {
          batch_id?: string | null
          browser_fingerprint?: string
          created_at?: string
          freepik_task_id?: string
          result_data?: Json | null
          scale_factor?: string
          status?: string
        }
        Relationships: []
      }
      credit_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          one_time_balance_after: number
          related_order_id: string | null
          subscription_balance_after: number
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          one_time_balance_after: number
          related_order_id?: string | null
          subscription_balance_after: number
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          one_time_balance_after?: number
          related_order_id?: string | null
          subscription_balance_after?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_logs_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      freepik_api_keys: {
        Row: {
          created_at: string | null
          daily_limit: number | null
          id: string
          is_active: boolean | null
          key: string
          last_reset_date: string | null
          name: string | null
          updated_at: string | null
          used_today: number | null
        }
        Insert: {
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          key: string
          last_reset_date?: string | null
          name?: string | null
          updated_at?: string | null
          used_today?: number | null
        }
        Update: {
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_active?: boolean | null
          key?: string
          last_reset_date?: string | null
          name?: string | null
          updated_at?: string | null
          used_today?: number | null
        }
        Relationships: []
      }
      image_enhancement_tasks: {
        Row: {
          api_key_id: string | null
          cdn_url: string | null
          completed_at: string | null
          created_at: string | null
          creativity: number | null
          credits_consumed: number
          engine: string | null
          error_message: string | null
          fractality: number | null
          hdr: number | null
          id: string
          optimized_for: string | null
          prompt: string | null
          r2_optimized_key: string | null
          r2_original_key: string | null
          resemblance: number | null
          scale_factor: string
          status: string
          user_id: string
        }
        Insert: {
          api_key_id?: string | null
          cdn_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          creativity?: number | null
          credits_consumed: number
          engine?: string | null
          error_message?: string | null
          fractality?: number | null
          hdr?: number | null
          id: string
          optimized_for?: string | null
          prompt?: string | null
          r2_optimized_key?: string | null
          r2_original_key?: string | null
          resemblance?: number | null
          scale_factor: string
          status?: string
          user_id: string
        }
        Update: {
          api_key_id?: string | null
          cdn_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          creativity?: number | null
          credits_consumed?: number
          engine?: string | null
          error_message?: string | null
          fractality?: number | null
          hdr?: number | null
          id?: string
          optimized_for?: string | null
          prompt?: string | null
          r2_optimized_key?: string | null
          r2_original_key?: string | null
          resemblance?: number | null
          scale_factor?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_enhancement_tasks_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "freepik_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_enhancement_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_discount: number | null
          amount_subtotal: number | null
          amount_tax: number | null
          amount_total: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_type: string
          plan_id: string | null
          price_id: string | null
          product_id: string | null
          provider: string
          provider_order_id: string
          status: string
          subscription_provider_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_discount?: number | null
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total: number
          created_at?: string
          currency: string
          id?: string
          metadata?: Json | null
          order_type: string
          plan_id?: string | null
          price_id?: string | null
          product_id?: string | null
          provider: string
          provider_order_id: string
          status: string
          subscription_provider_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_discount?: number | null
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_type?: string
          plan_id?: string | null
          price_id?: string | null
          product_id?: string | null
          provider?: string
          provider_order_id?: string
          status?: string
          subscription_provider_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          description: string | null
          featured_image_url: string | null
          id: string
          is_pinned: boolean
          language: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          description?: string | null
          featured_image_url?: string | null
          id?: string
          is_pinned?: boolean
          language: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          description?: string | null
          featured_image_url?: string | null
          id?: string
          is_pinned?: boolean
          language?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          benefits_jsonb: Json | null
          button_link: string | null
          button_text: string | null
          card_description: string | null
          card_title: string
          created_at: string
          currency: string | null
          display_order: number
          display_price: string | null
          enable_manual_input_coupon: boolean
          environment: string
          features: Json
          highlight_text: string | null
          id: string
          is_active: boolean
          is_highlighted: boolean
          lang_jsonb: Json
          original_price: string | null
          payment_type: string | null
          price: number | null
          price_suffix: string | null
          recurring_interval: string | null
          stripe_coupon_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_period_days: number | null
          updated_at: string
        }
        Insert: {
          benefits_jsonb?: Json | null
          button_link?: string | null
          button_text?: string | null
          card_description?: string | null
          card_title: string
          created_at?: string
          currency?: string | null
          display_order?: number
          display_price?: string | null
          enable_manual_input_coupon?: boolean
          environment: string
          features?: Json
          highlight_text?: string | null
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          lang_jsonb?: Json
          original_price?: string | null
          payment_type?: string | null
          price?: number | null
          price_suffix?: string | null
          recurring_interval?: string | null
          stripe_coupon_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_period_days?: number | null
          updated_at?: string
        }
        Update: {
          benefits_jsonb?: Json | null
          button_link?: string | null
          button_text?: string | null
          card_description?: string | null
          card_title?: string
          created_at?: string
          currency?: string | null
          display_order?: number
          display_price?: string | null
          enable_manual_input_coupon?: boolean
          environment?: string
          features?: Json
          highlight_text?: string | null
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          lang_jsonb?: Json
          original_price?: string | null
          payment_type?: string | null
          price?: number | null
          price_suffix?: string | null
          recurring_interval?: string | null
          stripe_coupon_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_period_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          plan_id: string
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          price_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      trial_usage_records: {
        Row: {
          browser_fingerprint: string
          used_at: string
        }
        Insert: {
          browser_fingerprint: string
          used_at?: string
        }
        Update: {
          browser_fingerprint?: string
          used_at?: string
        }
        Relationships: []
      }
      usage: {
        Row: {
          balance_jsonb: Json
          created_at: string
          id: string
          one_time_credits_balance: number
          subscription_credits_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_jsonb?: Json
          created_at?: string
          id?: string
          one_time_credits_balance?: number
          subscription_credits_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_jsonb?: Json
          created_at?: string
          id?: string
          one_time_credits_balance?: number
          subscription_credits_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          payment_provider: string | null
          role: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          payment_provider?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          payment_provider?: string | null
          role?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_specific_monthly_credit_for_year_plan: {
        Args: {
          p_user_id: string
          p_monthly_credits: number
          p_current_yyyy_mm: string
        }
        Returns: undefined
      }
      check_anonymous_trial_eligibility: {
        Args: { p_browser_fingerprint: string }
        Returns: Json
      }
      cleanup_expired_anonymous_tasks: {
        Args: { p_hours_old?: number }
        Returns: number
      }
      create_individual_anonymous_task: {
        Args: {
          p_freepik_task_id: string
          p_browser_fingerprint: string
          p_batch_id: string
          p_scale_factor: string
        }
        Returns: boolean
      }
      deduct_credits_and_log: {
        Args: { p_user_id: string; p_deduct_amount: number; p_notes: string }
        Returns: boolean
      }
      get_anonymous_task_status: {
        Args: { p_freepik_task_id: string }
        Returns: Json
      }
      get_available_freepik_api_key: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          key: string
        }[]
      }
      get_batch_tasks_status: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      grant_one_time_credits_and_log: {
        Args: {
          p_user_id: string
          p_credits_to_add: number
          p_related_order_id?: string
        }
        Returns: undefined
      }
      grant_subscription_credits_and_log: {
        Args: {
          p_user_id: string
          p_credits_to_set: number
          p_related_order_id?: string
        }
        Returns: undefined
      }
      grant_welcome_bonus_manually: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      initialize_or_reset_yearly_allocation: {
        Args: {
          p_user_id: string
          p_total_months: number
          p_monthly_credits: number
          p_subscription_start_date: string
          p_related_order_id?: string
        }
        Returns: undefined
      }
      revoke_credits_and_log: {
        Args: {
          p_user_id: string
          p_revoke_one_time: number
          p_revoke_subscription: number
          p_log_type: string
          p_notes: string
          p_related_order_id?: string
          p_clear_yearly_details?: boolean
          p_clear_monthly_details?: boolean
        }
        Returns: undefined
      }
      update_anonymous_task_status: {
        Args: {
          p_freepik_task_id: string
          p_status: string
          p_result_data?: Json
        }
        Returns: boolean
      }
      update_batch_task_status: {
        Args: {
          p_freepik_task_id: string
          p_status: string
          p_result_data?: Json
        }
        Returns: boolean
      }
      update_my_profile: {
        Args: { new_full_name: string; new_avatar_url: string }
        Returns: undefined
      }
      use_trial_and_create_batch_tasks: {
        Args: {
          p_browser_fingerprint: string
          p_batch_id: string
          p_freepik_task_ids: Json
        }
        Returns: Json
      }
      use_trial_and_create_task: {
        Args: { p_browser_fingerprint: string; p_freepik_task_id: string }
        Returns: Json
      }
      use_trial_for_batch: {
        Args: { p_browser_fingerprint: string }
        Returns: Json
      }
    }
    Enums: {
      post_status: "draft" | "published" | "archived"
      post_visibility: "public" | "logged_in" | "subscribers"
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
      post_status: ["draft", "published", "archived"],
      post_visibility: ["public", "logged_in", "subscribers"],
    },
  },
} as const
