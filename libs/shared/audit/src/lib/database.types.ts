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
      analyses: {
        Row: {
          cost_usd: number;
          created_at: string;
          id: string;
          job_posting_id: string;
          latency_ms: number;
          model: string;
          optimized_doc_id: string | null;
          recommendation: string;
          scorecard: Json;
          target_id: string;
          user_id: string | null;
        };
        Insert: {
          cost_usd?: number;
          created_at?: string;
          id?: string;
          job_posting_id: string;
          latency_ms?: number;
          model: string;
          optimized_doc_id?: string | null;
          recommendation: string;
          scorecard: Json;
          target_id: string;
          user_id?: string | null;
        };
        Update: {
          cost_usd?: number;
          created_at?: string;
          id?: string;
          job_posting_id?: string;
          latency_ms?: number;
          model?: string;
          optimized_doc_id?: string | null;
          recommendation?: string;
          scorecard?: Json;
          target_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'job_analyses_job_posting_id_fkey';
            columns: ['job_posting_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_analyses_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'targets';
            referencedColumns: ['id'];
          },
        ];
      };
      batch_runs: {
        Row: {
          completed: number;
          created_at: string;
          failed: number;
          id: string;
          items: Json;
          status: string;
          total: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          completed?: number;
          created_at?: string;
          failed?: number;
          id?: string;
          items?: Json;
          status?: string;
          total: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          completed?: number;
          created_at?: string;
          failed?: number;
          id?: string;
          items?: Json;
          status?: string;
          total?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          payload_md: string | null;
          resume_id: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload: Json;
          payload_md?: string | null;
          resume_id: string;
          source: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          payload_md?: string | null;
          resume_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tailored_resume_versions_resume_id_fkey';
            columns: ['resume_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          approved_at: string | null;
          cost_usd: number | null;
          created_at: string;
          document_type: string;
          docx_payload_md_hash: string | null;
          id: string;
          input_tokens: number | null;
          jd_snapshot: string;
          jd_snapshot_hash: string;
          job_posting_id: string | null;
          latency_ms: number | null;
          model: string | null;
          output_tokens: number | null;
          payload: Json;
          payload_md: string | null;
          resume_type: string;
          source_resume_id: string | null;
          storage_path: string | null;
          updated_at: string | null;
          user_id: string | null;
          warnings: Json;
        };
        Insert: {
          approved_at?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          document_type?: string;
          docx_payload_md_hash?: string | null;
          id?: string;
          input_tokens?: number | null;
          jd_snapshot: string;
          jd_snapshot_hash: string;
          job_posting_id?: string | null;
          latency_ms?: number | null;
          model?: string | null;
          output_tokens?: number | null;
          payload: Json;
          payload_md?: string | null;
          resume_type: string;
          source_resume_id?: string | null;
          storage_path?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          warnings?: Json;
        };
        Update: {
          approved_at?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          document_type?: string;
          docx_payload_md_hash?: string | null;
          id?: string;
          input_tokens?: number | null;
          jd_snapshot?: string;
          jd_snapshot_hash?: string;
          job_posting_id?: string | null;
          latency_ms?: number | null;
          model?: string | null;
          output_tokens?: number | null;
          payload?: Json;
          payload_md?: string | null;
          resume_type?: string;
          source_resume_id?: string | null;
          storage_path?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          warnings?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'tailored_resumes_job_posting_id_fkey';
            columns: ['job_posting_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tailored_resumes_source_resume_id_fkey';
            columns: ['source_resume_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
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
      experience_chunks: {
        Row: {
          chunk_ref: string;
          chunk_type: string;
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          metadata: Json;
          optimized_doc_id: string;
        };
        Insert: {
          chunk_ref: string;
          chunk_type: string;
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
          optimized_doc_id: string;
        };
        Update: {
          chunk_ref?: string;
          chunk_type?: string;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
          optimized_doc_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'experience_chunks_optimized_doc_id_fkey';
            columns: ['optimized_doc_id'];
            isOneToOne: false;
            referencedRelation: 'experience_optimized_docs';
            referencedColumns: ['id'];
          },
        ];
      };
      experience_conversation_turns: {
        Row: {
          content: string;
          conversation_type: string;
          created_at: string;
          id: string;
          metadata: Json;
          prose_doc_id: string | null;
          role: string;
          skipped: boolean;
          turn_index: number;
          user_id: string | null;
        };
        Insert: {
          content: string;
          conversation_type: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          prose_doc_id?: string | null;
          role: string;
          skipped?: boolean;
          turn_index: number;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          conversation_type?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          prose_doc_id?: string | null;
          role?: string;
          skipped?: boolean;
          turn_index?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'experience_conversation_turns_prose_doc_id_fkey';
            columns: ['prose_doc_id'];
            isOneToOne: false;
            referencedRelation: 'experience_prose_docs';
            referencedColumns: ['id'];
          },
        ];
      };
      experience_optimized_docs: {
        Row: {
          created_at: string;
          id: string;
          markdown_view: string | null;
          payload: Json;
          prose_doc_id: string | null;
          source: string;
          user_id: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          markdown_view?: string | null;
          payload: Json;
          prose_doc_id?: string | null;
          source?: string;
          user_id?: string | null;
          version: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          markdown_view?: string | null;
          payload?: Json;
          prose_doc_id?: string | null;
          source?: string;
          user_id?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'experience_optimized_docs_prose_doc_id_fkey';
            columns: ['prose_doc_id'];
            isOneToOne: false;
            referencedRelation: 'experience_prose_docs';
            referencedColumns: ['id'];
          },
        ];
      };
      experience_preferences: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload?: Json;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      experience_prose_docs: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          user_id: string | null;
          version: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
          version: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
          version?: number;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          absolute_url: string | null;
          company_name: string;
          created_at: string | null;
          department: string | null;
          description_html: string | null;
          external_id: number;
          first_seen_at: string | null;
          greenhouse_updated_at: string | null;
          id: string;
          llm_analysis_id: string | null;
          llm_score: number | null;
          location: string | null;
          salary_text: string | null;
          score: number;
          score_breakdown: Json | null;
          source_id: string;
          status: string;
          target_id: string | null;
          title: string;
          updated_at: string | null;
          url_validation_status: string | null;
          url_validation_warnings: Json | null;
        };
        Insert: {
          absolute_url?: string | null;
          company_name: string;
          created_at?: string | null;
          department?: string | null;
          description_html?: string | null;
          external_id: number;
          first_seen_at?: string | null;
          greenhouse_updated_at?: string | null;
          id?: string;
          llm_analysis_id?: string | null;
          llm_score?: number | null;
          location?: string | null;
          salary_text?: string | null;
          score?: number;
          score_breakdown?: Json | null;
          source_id: string;
          status?: string;
          target_id?: string | null;
          title: string;
          updated_at?: string | null;
          url_validation_status?: string | null;
          url_validation_warnings?: Json | null;
        };
        Update: {
          absolute_url?: string | null;
          company_name?: string;
          created_at?: string | null;
          department?: string | null;
          description_html?: string | null;
          external_id?: number;
          first_seen_at?: string | null;
          greenhouse_updated_at?: string | null;
          id?: string;
          llm_analysis_id?: string | null;
          llm_score?: number | null;
          location?: string | null;
          salary_text?: string | null;
          score?: number;
          score_breakdown?: Json | null;
          source_id?: string;
          status?: string;
          target_id?: string | null;
          title?: string;
          updated_at?: string | null;
          url_validation_status?: string | null;
          url_validation_warnings?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'job_postings_llm_analysis_id_fkey';
            columns: ['llm_analysis_id'];
            isOneToOne: false;
            referencedRelation: 'analyses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_postings_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_postings_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'targets';
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
      llm_costs: {
        Row: {
          cache_creation_input_tokens: number;
          cache_read_input_tokens: number;
          cost_usd: number;
          created_at: string;
          id: string;
          input_tokens: number;
          latency_ms: number;
          metadata: Json;
          model: string;
          output_tokens: number;
          purpose: string;
          user_id: string | null;
        };
        Insert: {
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_ms?: number;
          metadata?: Json;
          model: string;
          output_tokens?: number;
          purpose: string;
          user_id?: string | null;
        };
        Update: {
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
          cost_usd?: number;
          created_at?: string;
          id?: string;
          input_tokens?: number;
          latency_ms?: number;
          metadata?: Json;
          model?: string;
          output_tokens?: number;
          purpose?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notifications_sent: {
        Row: {
          channel: string;
          external_id: string | null;
          id: string;
          job_posting_id: string;
          score_at_send: number;
          sent_at: string;
          user_profile_id: string;
        };
        Insert: {
          channel?: string;
          external_id?: string | null;
          id?: string;
          job_posting_id: string;
          score_at_send: number;
          sent_at?: string;
          user_profile_id: string;
        };
        Update: {
          channel?: string;
          external_id?: string | null;
          id?: string;
          job_posting_id?: string;
          score_at_send?: number;
          sent_at?: string;
          user_profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'job_notification_sent_job_posting_id_fkey';
            columns: ['job_posting_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_notification_sent_user_profile_id_fkey';
            columns: ['user_profile_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reference_jds: {
        Row: {
          created_at: string | null;
          extracted_profile: Json;
          id: string;
          jd_text: string;
          jd_url: string | null;
          target_id: string;
        };
        Insert: {
          created_at?: string | null;
          extracted_profile?: Json;
          id?: string;
          jd_text: string;
          jd_url?: string | null;
          target_id: string;
        };
        Update: {
          created_at?: string | null;
          extracted_profile?: Json;
          id?: string;
          jd_text?: string;
          jd_url?: string | null;
          target_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'target_reference_jds_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'targets';
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
          device_mode: string;
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
          paired_scan_id: string | null;
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
          device_mode?: string;
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
          paired_scan_id?: string | null;
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
          device_mode?: string;
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
          paired_scan_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: 'scans_paired_scan_id_fkey';
            columns: ['paired_scan_id'];
            isOneToOne: false;
            referencedRelation: 'scans';
            referencedColumns: ['id'];
          },
        ];
      };
      scores: {
        Row: {
          created_at: string;
          excluded: boolean;
          id: string;
          job_posting_id: string;
          matched_keywords: string[] | null;
          score: number;
          score_breakdown: Json | null;
          scored_profile_version: number;
          scoring_status: string;
          target_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          excluded?: boolean;
          id?: string;
          job_posting_id: string;
          matched_keywords?: string[] | null;
          score?: number;
          score_breakdown?: Json | null;
          scored_profile_version?: number;
          scoring_status?: string;
          target_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          excluded?: boolean;
          id?: string;
          job_posting_id?: string;
          matched_keywords?: string[] | null;
          score?: number;
          score_breakdown?: Json | null;
          scored_profile_version?: number;
          scoring_status?: string;
          target_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'job_target_scores_job_posting_id_fkey';
            columns: ['job_posting_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_target_scores_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'targets';
            referencedColumns: ['id'];
          },
        ];
      };
      sources: {
        Row: {
          board_token: string;
          company_name: string;
          created_at: string | null;
          enabled: boolean | null;
          id: string;
          job_count: number | null;
          last_polled_at: string | null;
          provider: string;
        };
        Insert: {
          board_token: string;
          company_name: string;
          created_at?: string | null;
          enabled?: boolean | null;
          id?: string;
          job_count?: number | null;
          last_polled_at?: string | null;
          provider?: string;
        };
        Update: {
          board_token?: string;
          company_name?: string;
          created_at?: string | null;
          enabled?: boolean | null;
          id?: string;
          job_count?: number | null;
          last_polled_at?: string | null;
          provider?: string;
        };
        Relationships: [];
      };
      status_log: {
        Row: {
          created_at: string | null;
          id: string;
          new_status: string;
          note: string | null;
          old_status: string | null;
          posting_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          new_status: string;
          note?: string | null;
          old_status?: string | null;
          posting_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          new_status?: string;
          note?: string | null;
          old_status?: string | null;
          posting_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'job_status_log_posting_id_fkey';
            columns: ['posting_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      targets: {
        Row: {
          activation_status: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          label: string;
          normalized_label: string | null;
          profile_version: number;
          scoring_profile: Json;
          search_keywords: Json | null;
          updated_at: string | null;
        };
        Insert: {
          activation_status?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          label: string;
          normalized_label?: string | null;
          profile_version?: number;
          scoring_profile?: Json;
          search_keywords?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          activation_status?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string;
          normalized_label?: string | null;
          profile_version?: number;
          scoring_profile?: Json;
          search_keywords?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      uploaded_resumes: {
        Row: {
          created_at: string;
          extracted_text: string;
          file_size_bytes: number;
          file_type: string;
          filename: string;
          id: string;
          page_count: number | null;
          prose_doc_id: string | null;
          storage_path: string;
          user_id: string | null;
          warnings: Json;
        };
        Insert: {
          created_at?: string;
          extracted_text: string;
          file_size_bytes: number;
          file_type: string;
          filename: string;
          id?: string;
          page_count?: number | null;
          prose_doc_id?: string | null;
          storage_path: string;
          user_id?: string | null;
          warnings?: Json;
        };
        Update: {
          created_at?: string;
          extracted_text?: string;
          file_size_bytes?: number;
          file_type?: string;
          filename?: string;
          id?: string;
          page_count?: number | null;
          prose_doc_id?: string | null;
          storage_path?: string;
          user_id?: string | null;
          warnings?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'resume_uploads_prose_doc_id_fkey';
            columns: ['prose_doc_id'];
            isOneToOne: false;
            referencedRelation: 'experience_prose_docs';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          job_notifications_enabled: boolean;
          job_score_threshold: number;
          linkedin_url: string | null;
          location: string | null;
          name: string | null;
          phone_number: string | null;
          sms_daily_limit: number;
          sms_notifications_enabled: boolean;
          sms_score_threshold: number;
          unsubscribed_at: string | null;
          updated_at: string;
          user_id: string | null;
          website_url: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          job_notifications_enabled?: boolean;
          job_score_threshold?: number;
          linkedin_url?: string | null;
          location?: string | null;
          name?: string | null;
          phone_number?: string | null;
          sms_daily_limit?: number;
          sms_notifications_enabled?: boolean;
          sms_score_threshold?: number;
          unsubscribed_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          website_url?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          job_notifications_enabled?: boolean;
          job_score_threshold?: number;
          linkedin_url?: string | null;
          location?: string | null;
          name?: string | null;
          phone_number?: string | null;
          sms_daily_limit?: number;
          sms_notifications_enabled?: boolean;
          sms_score_threshold?: number;
          unsubscribed_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
      user_targets: {
        Row: {
          created_at: string;
          fit_score: number | null;
          fit_score_reasoning: string | null;
          id: string;
          is_active: boolean;
          target_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          fit_score?: number | null;
          fit_score_reasoning?: string | null;
          id?: string;
          is_active?: boolean;
          target_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          fit_score?: number | null;
          fit_score_reasoning?: string | null;
          id?: string;
          is_active?: boolean;
          target_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_targets_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'targets';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      insights_domains_view: {
        Row: {
          domain: string | null;
          latest_grade: string | null;
          latest_scan_at: string | null;
          scan_count: number | null;
        };
        Relationships: [];
      };
      insights_summary_view: {
        Row: {
          avg_overall_score: number | null;
          top_violation: string | null;
          total_scans: number | null;
          unique_domains: number | null;
        };
        Relationships: [];
      };
      insights_violations_view: {
        Row: {
          category: string | null;
          occurrence_count: number | null;
          severity_critical: number | null;
          severity_info: number | null;
          severity_warning: number | null;
          title: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      bulk_update_salaries: { Args: { p_updates: Json }; Returns: number };
      bulk_update_scores: { Args: { p_updates: Json }; Returns: number };
      get_target_jobs: {
        Args: {
          p_ascending?: boolean;
          p_company?: string;
          p_limit?: number;
          p_min_score?: number;
          p_offset?: number;
          p_search?: string;
          p_sort?: string;
          p_status?: string;
          p_target_id: string;
        };
        Returns: {
          absolute_url: string;
          company_name: string;
          created_at: string;
          department: string;
          external_id: number;
          first_seen_at: string;
          greenhouse_updated_at: string;
          id: string;
          location: string;
          salary_text: string;
          score: number;
          score_breakdown: Json;
          scoring_status: string;
          source_id: string;
          status: string;
          title: string;
          total_count: number;
        }[];
      };
      insights_score_stats: {
        Args: { period_days?: number };
        Returns: {
          avg_accessibility: number;
          avg_best_practices: number;
          avg_overall: number;
          avg_performance: number;
          avg_seo: number;
          grade_a: number;
          grade_b: number;
          grade_c: number;
          grade_d: number;
          grade_f: number;
          total: number;
        }[];
      };
      insights_trends: {
        Args: { bucket_interval?: string; period_months?: number };
        Returns: {
          avg_overall: number;
          bucket_start: string;
          scan_count: number;
        }[];
      };
      match_target_by_label: {
        Args: { query_label: string; threshold?: number };
        Returns: {
          activation_status: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          label: string;
          normalized_label: string | null;
          profile_version: number;
          scoring_profile: Json;
          search_keywords: Json | null;
          updated_at: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'targets';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
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
