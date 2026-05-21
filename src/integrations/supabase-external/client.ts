// External Supabase client - NOT managed by Lovable Cloud.
// Points to the dedicated project "negeygrzbhbdrdcdqpwb" used for DB + Storage.
// Auth/session stays handled separately (see src/lib/session.ts).
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://negeygrzbhbdrdcdqpwb.supabase.co';
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_J3hHmTWwim_fggB6a8yiog_Cnl4yoOT';

export const supabaseExternal = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'sb-external-auth',
    },
  },
);
