import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function genPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role,is_active").eq("user_id", userData.user.id).maybeSingle();
    if (!roleRow || roleRow.role !== "admin" || !roleRow.is_active) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const users: Array<{ email: string; password?: string; full_name?: string; role?: string; department?: string | null }> =
      Array.isArray(body?.users) ? body.users : [body];

    const results: Array<{ email: string; password?: string; status: string; error?: string }> = [];

    for (const u of users) {
      const email = (u.email ?? "").trim().toLowerCase();
      if (!email.endsWith("@tryclea.com")) {
        results.push({ email, status: "skipped", error: "Only @tryclea.com allowed" });
        continue;
      }
      const password = u.password && u.password.length >= 8 ? u.password : genPassword(14);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name ?? email.split("@")[0] },
      });
      if (createErr || !created.user) {
        results.push({ email, status: "error", error: createErr?.message ?? "unknown" });
        continue;
      }
      // Set role/department if provided (handle_new_user trigger created default staff row)
      if (u.role || u.department !== undefined) {
        await admin.from("user_roles").update({
          ...(u.role ? { role: u.role } : {}),
          ...(u.department !== undefined ? { department: u.department } : {}),
        }).eq("user_id", created.user.id);
      }
      results.push({ email, password, status: "created" });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
