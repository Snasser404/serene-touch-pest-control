# Serene Touch Portal — Production Setup

This turns the portal (`portal.html`) from a browser-only demo into a **real, secure
platform** for customers, technicians, and admins, powered by [Supabase](https://supabase.com)
(managed Postgres + auth). The website itself stays on GitHub Pages — only logins and data
move to Supabase.

**Time:** ~15–20 minutes. **Cost:** free tier is plenty to start.

---

## What you get

- **Secure sign-in** (email + password, or passwordless "magic link") with password reset.
- **Three roles**, enforced *in the database* (Row-Level Security), not the browser:
  - **Customer** — sees only their own appointments, prep checklist, treatment, and history.
  - **Technician** — sees only their assigned jobs + those customers; updates status & notes.
  - **Admin** — sees everything; assigns technicians, creates appointments, manages people.
- The browser is never trusted: every change goes through server-side functions that
  re-check who you are.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** → sign up (free) → **New project**.
2. Pick a name (e.g. `serene-touch`), a strong **database password**, and a region close to
   Toronto (e.g. `East US` / `Canada` if offered).
3. Wait ~2 minutes for it to finish provisioning.

## Step 2 — Create the database

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this repo, copy all of it, paste, and click **Run**.
3. New query again → paste all of `supabase/policies.sql` → **Run**.

You should see "Success. No rows returned" for both. That's the entire secure backend.

## Step 3 — Connect the website

1. In Supabase: **Project Settings → API**.
2. Copy two values:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public** key (a long token — this one is safe in the browser)
3. Open **`js/supabase-config.js`** in this repo and paste them in:
   ```js
   window.SERENE_SUPABASE = {
     url:     "https://abcdefgh.supabase.co",
     anonKey: "eyJhbGciOi...the long anon key...",
     manageAccountUrl: ""
   };
   ```
4. Commit & push:
   ```powershell
   git add -A
   git commit -m "Connect portal to Supabase"
   git push
   ```

Now `https://serenetouch.ca/portal.html` shows a real sign-in screen.

## Step 4 — Create your first admin (and try it)

1. Supabase → **Authentication → Users → Add user**. Use your email + a password, and tick
   **Auto Confirm User**. Do this for three test accounts if you want the sample data:
   - `admin@serenetouch.ca`
   - `tech@serenetouch.ca`
   - `customer@serenetouch.ca`
2. (Optional sample data) SQL Editor → paste `supabase/seed.sql` → **Run**. This sets their
   roles and adds a sample appointment + history so you can see everything working.
3. If you skipped the seed, make yourself an admin: SQL Editor →
   ```sql
   update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
   ```
4. Go to `portal.html`, sign in. The customer/tech/admin dashboards now run on real data.

---

## Step 5 (optional) — Let admins create logins from the portal

By default you add customer/technician logins in the Supabase dashboard
(**Authentication → Users**, then fill their details in the admin "Add a person" form or via
SQL). To let an admin create accounts **directly from the portal**, deploy the included
Edge Function:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy manage-account
   ```
   (`<your-project-ref>` is the `abcdefgh` part of your project URL.)
2. In `js/supabase-config.js`, set:
   ```js
   manageAccountUrl: "https://<your-project-ref>.supabase.co/functions/v1/manage-account"
   ```
3. Commit & push. Admins now get a working **"＋ Add a person"** form that creates the login
   and emails the person a link to set their password.

The function uses the **service_role** key, which stays on Supabase's servers and is never
exposed to the browser. It refuses any caller who isn't a signed-in admin.

---

## 🔒 Security settings — do these BEFORE you share the portal

These are what make the difference between a demo and a safe production system. The code is
hardened, but a few Supabase dashboard settings must match:

1. **Turn OFF public sign-ups.** Every account is created by you (an admin), so nobody
   should be able to self-register. Supabase → **Authentication → Sign In / Providers →
   Email** → turn **off** *"Allow new users to sign up."*
   *(Why it matters: with signups on, a stranger could create their own portal account.
   The code also sends `shouldCreateUser: false`, but set this too — defence in depth.)*
2. **Set the Site URL + redirect allowlist.** Supabase → **Authentication → URL
   Configuration** → set **Site URL** to `https://serenetouch.ca`, and add
   `https://serenetouch.ca/portal.html` under **Redirect URLs**. This keeps magic-link and
   password-reset links pointing only at your site.
3. **Connect real email (SMTP).** The built-in sender is rate-limited and for testing only.
   Under **Project Settings → Authentication → SMTP Settings**, connect your own mailbox
   (e.g. Hostinger) or a service like Resend / SendGrid, so invites and resets actually
   arrive.
4. **Never expose the `service_role` key.** It is only ever used inside the Edge Function on
   Supabase's servers. Do not put it in `js/supabase-config.js` or any committed file — the
   browser only ever gets the **anon** key.

---

## Day-to-day

- **Add a customer/technician:** Supabase → Authentication → Users (or the portal's "Add a
  person" form if you did Step 5). Set their role + details.
- **Book a visit:** admin dashboard → **＋ New appointment**.
- **Assign a technician:** admin dashboard → the dropdown on each appointment.
- **Run a job:** technician signs in → advances *En route → In progress → Complete*
  (completing auto-books the ~2-week revisit).
- **Customer:** signs in → sees status, prep checklist (saved), timeline, history, assistant.

## Quick troubleshooting

- **"Portal not connected yet" screen** → keys aren't pasted in `js/supabase-config.js` (Step 3).
- **Can sign in but "profile isn't set up"** → the user row exists in Auth but has no profile;
  re-run `schema.sql` (it adds the auto-profile trigger) and re-create the user, or insert a
  profile row manually.
- **Admin sees nothing** → that account's `role` isn't `admin`; run the `update ... set role`
  query from Step 4.
- **Emails not arriving** → configure SMTP (see above); the built-in sender is limited.
- **Want the demo back temporarily** → open `portal.html?demo=1`.
