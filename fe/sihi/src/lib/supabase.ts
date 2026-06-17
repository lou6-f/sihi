import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Supabase admin client dùng service role key.
 * Chỉ dùng phía server — KHÔNG expose ra client.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});
