// =====================================================
// src/lib/supabase.ts
// ÚNICA instancia de Supabase en toda la app.
// Importar siempre desde aquí — NUNCA crear otro createClient()
// =====================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}
console.log("URL:", import.meta.env.VITE_SUPABASE_URL)
console.log("KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
