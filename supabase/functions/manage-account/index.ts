// ============================================================================
//  Serene Touch — admin "manage-account" Edge Function  (OPTIONAL)
//  ---------------------------------------------------------------------------
//  Lets a signed-in ADMIN create a customer or technician login from inside
//  the portal. Creating auth users requires the service_role key, which must
//  NEVER live in the browser — so it lives here, server-side, on Supabase.
//
//  Deploy (one time):
//    1. Install the Supabase CLI:  https://supabase.com/docs/guides/cli
//    2. supabase login
//    3. supabase link --project-ref <your-project-ref>
//    4. supabase functions deploy manage-account
//  The SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY secrets
//  are injected automatically for deployed functions.
//
//  Then set manageAccountUrl in js/supabase-config.js to:
//    https://<project-ref>.supabase.co/functions/v1/manage-account
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Function not configured" }, 500);

  // 1) Identify the caller from their bearer token.
  const authHeader = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: who } = await asCaller.auth.getUser();
  if (!who?.user) return json({ error: "Unauthorized" }, 401);

  // 2) Confirm the caller is an admin (privileged client bypasses RLS).
  const admin = createClient(url, service);
  const { data: prof } = await admin
    .from("profiles").select("role").eq("id", who.user.id).single();
  if (prof?.role !== "admin") return json({ error: "Admin only" }, 403);

  // 3) Validate input.
  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role;
  if (!email || (role !== "customer" && role !== "technician")) {
    return json({ error: "email and role (customer|technician) are required" }, 400);
  }

  // 4) Create the auth user (confirmed, no password — they'll set one via the
  //    password-reset / magic-link email below).
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    // role is intentionally NOT placed in user_metadata — we never let a
    // client-influenced field decide a role. The role is set only on the
    // profiles row below (and handle_new_user always hard-codes 'customer').
    user_metadata: { full_name: body.full_name ?? null, phone: body.phone ?? null },
  });
  if (cErr || !created?.user) return json({ error: cErr?.message ?? "Create failed" }, 400);

  // 5) Set the profile details + the real role (the trigger made a base row as
  //    'customer'). If this fails, roll back the now-orphaned auth user so we
  //    don't leave an account that can sign in but has no usable profile.
  const { error: uErr } = await admin.from("profiles").update({
    full_name: body.full_name ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
    plan: body.plan ?? null,
    role,
  }).eq("id", created.user.id);
  if (uErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: "Could not set profile: " + uErr.message }, 500);
  }

  // 6) Email the new user a link to set their password / sign in.
  await admin.auth.admin.generateLink({ type: "recovery", email });

  return json({ ok: true, id: created.user.id });
});
