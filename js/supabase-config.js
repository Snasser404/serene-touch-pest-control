/* ===================================================================
   Serene Touch portal — Supabase connection settings
   -------------------------------------------------------------------
   Paste your project's URL and anon (public) key below.

     1. Create a free project at https://supabase.com
     2. Project Settings → API
     3. Copy "Project URL" and the "anon public" key
     4. Paste them here and save (commit + push)

   The anon key is SAFE to expose in the browser — it only grants the
   access your Row-Level Security policies allow. Never put the
   "service_role" key here.

   Full setup guide: PORTAL-SETUP.md
=================================================================== */
window.SERENE_SUPABASE = {
  url:     "https://psftpnmlthfqbpnqsvnb.supabase.co",       // Project URL (base only — NOT the /rest/v1/ path)
  anonKey: "sb_publishable_SbFoKQJVCUZn4oyCrSClfw_SJqE54Wu", // publishable key (browser-safe)

  // Optional: only needed if you deploy the admin "manage-account" Edge
  // Function so admins can create customer/technician logins from the portal.
  // Leave as-is otherwise. Usually: <url>/functions/v1/manage-account
  manageAccountUrl: ""
};
