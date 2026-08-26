import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function authenticateAgentApiRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch) {
    const token = bearerMatch[1]?.trim();
    if (!token) return null;

    const env = getSupabasePublicEnv();
    const supabase = createSupabaseClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || !userId) return null;
    return { authType: "bearer" as const, supabase, userId };
  }

  const supabase = await createCookieClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  return { authType: "cookie" as const, supabase, userId };
}
