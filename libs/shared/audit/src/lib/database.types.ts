export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      email_log: {
        Row: {
          id: string;
          lead_id: string;
          resend_id: string | null;
          sent_at: string | null;
          template: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          resend_id?: string | null;
          sent_at?: string | null;
          template: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          resend_id?: string | null;
          sent_at?: string | null;
          template?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_log_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id'];
          },
        ];
      };
      leads: {
        Row: {
          company: string | null;
          created_at: string | null;
          email: string;
          email_sequence_step: number | null;
          id: string;
          last_email_at: string | null;
          name: string | null;
          scan_id: string | null;
          source: string | null;
          unsubscribed: boolean | null;
          unsubscribed_at: string | null;
          url_scanned: string | null;
        };
        Insert: {
          company?: string | null;
          created_at?: string | null;
          email: string;
          email_sequence_step?: number | null;
          id?: string;
          last_email_at?: string | null;
          name?: string | null;
          scan_id?: string | null;
          source?: string | null;
          unsubscribed?: boolean | null;
          unsubscribed_at?: string | null;
          url_scanned?: string | null;
        };
        Update: {
          company?: string | null;
          created_at?: string | null;
          email?: string;
          email_sequence_step?: number | null;
          id?: string;
          last_email_at?: string | null;
          name?: string | null;
          scan_id?: string | null;
          source?: string | null;
          unsubscribed?: boolean | null;
          unsubscribed_at?: string | null;
          url_scanned?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_scan_id_fkey';
            columns: ['scan_id'];
            isOneToOne: false;
            referencedRelation: 'scans';
            referencedColumns: ['id'];
          },
        ];
      };
      scan_issues: {
        Row: {
          category: string;
          description: string;
          fix_difficulty: string | null;
          id: string;
          impact: string | null;
          scan_id: string;
          severity: string;
          sort_order: number | null;
          technical_detail: Json | null;
          title: string;
        };
        Insert: {
          category: string;
          description: string;
          fix_difficulty?: string | null;
          id?: string;
          impact?: string | null;
          scan_id: string;
          severity: string;
          sort_order?: number | null;
          technical_detail?: Json | null;
          title: string;
        };
        Update: {
          category?: string;
          description?: string;
          fix_difficulty?: string | null;
          id?: string;
          impact?: string | null;
          scan_id?: string;
          severity?: string;
          sort_order?: number | null;
          technical_detail?: Json | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scan_issues_scan_id_fkey';
            columns: ['scan_id'];
            isOneToOne: false;
            referencedRelation: 'scans';
            referencedColumns: ['id'];
          },
        ];
      };
      scans: {
        Row: {
          axe_raw: Json | null;
          cls: number | null;
          completed_at: string | null;
          created_at: string | null;
          error_message: string | null;
          fcp_ms: number | null;
          grade_overall: string | null;
          id: string;
          ip_hash: string | null;
          lcp_ms: number | null;
          lighthouse_raw: Json | null;
          normalized_url: string;
          page_description: string | null;
          page_screenshot_url: string | null;
          page_title: string | null;
          score_accessibility: number | null;
          score_best_practices: number | null;
          score_performance: number | null;
          score_seo: number | null;
          si_ms: number | null;
          source: string | null;
          status: string;
          tbt_ms: number | null;
          url: string;
        };
        Insert: {
          axe_raw?: Json | null;
          cls?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          fcp_ms?: number | null;
          grade_overall?: string | null;
          id?: string;
          ip_hash?: string | null;
          lcp_ms?: number | null;
          lighthouse_raw?: Json | null;
          normalized_url: string;
          page_description?: string | null;
          page_screenshot_url?: string | null;
          page_title?: string | null;
          score_accessibility?: number | null;
          score_best_practices?: number | null;
          score_performance?: number | null;
          score_seo?: number | null;
          si_ms?: number | null;
          source?: string | null;
          status?: string;
          tbt_ms?: number | null;
          url: string;
        };
        Update: {
          axe_raw?: Json | null;
          cls?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          fcp_ms?: number | null;
          grade_overall?: string | null;
          id?: string;
          ip_hash?: string | null;
          lcp_ms?: number | null;
          lighthouse_raw?: Json | null;
          normalized_url?: string;
          page_description?: string | null;
          page_screenshot_url?: string | null;
          page_title?: string | null;
          score_accessibility?: number | null;
          score_best_practices?: number | null;
          score_performance?: number | null;
          score_seo?: number | null;
          si_ms?: number | null;
          source?: string | null;
          status?: string;
          tbt_ms?: number | null;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
