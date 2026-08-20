/**
 * Supabase Browser Client Factory
 * -------------------------------------------------------------------
 * Creates an instance of the Supabase client specifically for Browser / Client-Side components.
 * Uses `@supabase/ssr` to maintain consistent cookie and session handling across client and server.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
