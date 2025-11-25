import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton Supabase client
let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client during build time
    console.warn('Supabase environment variables not set. Using mock client.');
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
})();

// For server-side operations with elevated privileges
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Supabase environment variables are not set');
  }
  
  return createClient(url, serviceKey);
};
