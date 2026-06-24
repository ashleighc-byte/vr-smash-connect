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
      staff_survey_responses: {
        Row: {
          casting_worked: string | null
          completed_by: string | null
          created_at: string | null
          created_physical_tt_interest: string | null
          created_vr_sport_interest: string | null
          enough_rotation_time: string | null
          felt_like_event: string | null
          final_comments: string | null
          hardest_to_manage: string | null
          headset_setup: string | null
          house_points_drove_participation: string | null
          id: string
          interested_student_types: string[] | null
          internet_reliability: number | null
          lunchtime_format_worked: string | null
          non_sport_students_comments: string | null
          non_sport_students_involved: string | null
          playoff_felt_fair: string | null
          playoff_format: string | null
          playoff_student_count: number | null
          ran_playoffs: string | null
          recommend_to_schools: number | null
          role: string | null
          safe_space_worked: string | null
          school: string | null
          sessions_run: string | null
          setup_ease: number | null
          spectator_element_value: string | null
          student_engagement: number | null
          students_tried: number | null
          students_understood_rules: string | null
          technical_issues: string[] | null
          tournament_timing_workable: string | null
          what_needs_to_change: string[] | null
          what_worked_best: string | null
          would_run_again: string | null
        }
        Insert: {
          casting_worked?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_physical_tt_interest?: string | null
          created_vr_sport_interest?: string | null
          enough_rotation_time?: string | null
          felt_like_event?: string | null
          final_comments?: string | null
          hardest_to_manage?: string | null
          headset_setup?: string | null
          house_points_drove_participation?: string | null
          id?: string
          interested_student_types?: string[] | null
          internet_reliability?: number | null
          lunchtime_format_worked?: string | null
          non_sport_students_comments?: string | null
          non_sport_students_involved?: string | null
          playoff_felt_fair?: string | null
          playoff_format?: string | null
          playoff_student_count?: number | null
          ran_playoffs?: string | null
          recommend_to_schools?: number | null
          role?: string | null
          safe_space_worked?: string | null
          school?: string | null
          sessions_run?: string | null
          setup_ease?: number | null
          spectator_element_value?: string | null
          student_engagement?: number | null
          students_tried?: number | null
          students_understood_rules?: string | null
          technical_issues?: string[] | null
          tournament_timing_workable?: string | null
          what_needs_to_change?: string[] | null
          what_worked_best?: string | null
          would_run_again?: string | null
        }
        Update: {
          casting_worked?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_physical_tt_interest?: string | null
          created_vr_sport_interest?: string | null
          enough_rotation_time?: string | null
          felt_like_event?: string | null
          final_comments?: string | null
          hardest_to_manage?: string | null
          headset_setup?: string | null
          house_points_drove_participation?: string | null
          id?: string
          interested_student_types?: string[] | null
          internet_reliability?: number | null
          lunchtime_format_worked?: string | null
          non_sport_students_comments?: string | null
          non_sport_students_involved?: string | null
          playoff_felt_fair?: string | null
          playoff_format?: string | null
          playoff_student_count?: number | null
          ran_playoffs?: string | null
          recommend_to_schools?: number | null
          role?: string | null
          safe_space_worked?: string | null
          school?: string | null
          sessions_run?: string | null
          setup_ease?: number | null
          spectator_element_value?: string | null
          student_engagement?: number | null
          students_tried?: number | null
          students_understood_rules?: string | null
          technical_issues?: string[] | null
          tournament_timing_workable?: string | null
          what_needs_to_change?: string[] | null
          what_worked_best?: string | null
          would_run_again?: string | null
        }
        Relationships: []
      }
      student_survey_responses: {
        Row: {
          activity_frequency: string | null
          activity_identity: string | null
          created_at: string | null
          gaming_frequency: string | null
          house: string | null
          house_points_motivator: string | null
          id: string
          interest_in_physical_tt: number | null
          interest_in_vr_tt: number | null
          interest_reasons: string[] | null
          nervousness: string | null
          other_comments: string | null
          participation_barriers: string[] | null
          physical_tt_experience: string | null
          plays_school_team: string | null
          school: string | null
          suggestions: string | null
          top_motivators: string[] | null
          uses_karawhiua: string | null
          vr_experience: string | null
          wants_more_tt: string | null
          wants_to_represent: string | null
          year_level: string | null
        }
        Insert: {
          activity_frequency?: string | null
          activity_identity?: string | null
          created_at?: string | null
          gaming_frequency?: string | null
          house?: string | null
          house_points_motivator?: string | null
          id?: string
          interest_in_physical_tt?: number | null
          interest_in_vr_tt?: number | null
          interest_reasons?: string[] | null
          nervousness?: string | null
          other_comments?: string | null
          participation_barriers?: string[] | null
          physical_tt_experience?: string | null
          plays_school_team?: string | null
          school?: string | null
          suggestions?: string | null
          top_motivators?: string[] | null
          uses_karawhiua?: string | null
          vr_experience?: string | null
          wants_more_tt?: string | null
          wants_to_represent?: string | null
          year_level?: string | null
        }
        Update: {
          activity_frequency?: string | null
          activity_identity?: string | null
          created_at?: string | null
          gaming_frequency?: string | null
          house?: string | null
          house_points_motivator?: string | null
          id?: string
          interest_in_physical_tt?: number | null
          interest_in_vr_tt?: number | null
          interest_reasons?: string[] | null
          nervousness?: string | null
          other_comments?: string | null
          participation_barriers?: string[] | null
          physical_tt_experience?: string | null
          plays_school_team?: string | null
          school?: string | null
          suggestions?: string | null
          top_motivators?: string[] | null
          uses_karawhiua?: string | null
          vr_experience?: string | null
          wants_more_tt?: string | null
          wants_to_represent?: string | null
          year_level?: string | null
        }
        Relationships: []
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
    Enums: {},
  },
} as const
