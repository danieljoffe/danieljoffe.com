// Placeholder. Regenerate from the wyrdfold schema once the rename-pass
// migration is applied:
//
//   pnpm supabase gen types typescript --project-id <project-id> \
//     > apps/wyrdfold/src/lib/supabase/types.ts
//
// Until then, BFF routes and surface ports import this empty Database type
// just so server clients stay typed at the call site.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
