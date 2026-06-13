# 🚀 Serene Touch — Go-Live Checklist & Google Business Profile Kit

Everything you need to take the site from "built" to "bringing in jobs." Work top to
bottom — the first few items matter most.

---

## ✅ Part 1 — Flip these switches (mostly quick)

### 1. Make the contact form actually email you
1. Go to **https://web3forms.com**, enter the email where you want leads, and copy the **Access Key**.
2. In **`index.html`**, find `YOUR_WEB3FORMS_ACCESS_KEY` and paste your key in its place.
3. Commit & push. Done — quote requests now land in your inbox. (Until then it shows a demo message.)

### 2. Replace the phone number
The site currently shows **438-988-6709** (a Montréal area code). Get a Toronto number
(**416 / 647 / 437** — a Google Voice number or cell works to start) and replace `438-988-6709`
and `+14389886709` everywhere. *(I can do this for you in one pass — just send the number.)*

### 3. Turn on Google Analytics (GA4)
1. Create a free property at **https://analytics.google.com** and copy your **Measurement ID** (`G-XXXXXXXXXX`).
2. In **`js/analytics.js`**, paste it over `G-XXXXXXXXXX`. Push. Tracking is live.

### 4. Verify Google Search Console & submit your sitemap
1. Go to **https://search.google.com/search-console**, add your site, choose **HTML tag** verification.
2. Paste the code into the `google-site-verification` tag in **`index.html`** (replace `PASTE_YOUR_SEARCH_CONSOLE_CODE_HERE`). Push, then click **Verify**.
3. In Search Console → **Sitemaps**, submit: `sitemap.xml`. (All 25+ pages get discovered.)

### 5. Buy a custom domain
Register e.g. **serenetouchpest.ca** (~$15/yr at Namecheap, Cloudflare, GoDaddy…). Then it points
at this site via a `CNAME` file + GitHub Pages settings. *(I'll configure it once you own the domain.)*

### 6. Make the reviews real
The homepage now shows **honest promises instead of fake reviews** (the invented testimonials and
stats were removed). As you collect real Google reviews, you can feature them there. See Part 3 for
how to start collecting them.

---

## 🗺️ Part 2 — Google Business Profile (your #1 source of local jobs)

Create it at **https://business.google.com**. This is what shows in Google Maps and the local
"map pack" — for a local pest-control business, nothing beats it. Use these exact details:

| Field | What to enter |
|-------|---------------|
| **Business name** | Serene Touch Pest Control Services |
| **Primary category** | Pest control service |
| **Secondary categories** | Animal control service · (optional) Exterminator |
| **Business type** | **Service-area business** (you visit customers — hide your address) |
| **Service areas** | Toronto, North York, Etobicoke, Scarborough, Mississauga, Brampton, Caledon, Vaughan, Markham, Richmond Hill, Newmarket, Aurora, Oakville, Burlington, Milton, Pickering, Ajax, Whitby, Oshawa |
| **Phone** | *(your real 416/647/437 number)* |
| **Website** | *(your custom domain, or the GitHub Pages URL for now)* |
| **Hours** | Mon–Sat 8:00 AM – 7:00 PM · Sun: Closed (or "by appointment") |
| **Services** | Ant Control · Bed Bug Treatment · Cockroach Control · Rodent Control (Mice & Rats) · Wasp Removal |
| **Attributes** | Online estimates · Onsite services · (if true) Identifies as… / LGBTQ+ friendly, etc. |

**Business description (paste this — ~700 chars):**
> Serene Touch Pest Control Services provides professional, eco-friendly pest control across
> Toronto and the Greater Toronto Area. We treat ants, bed bugs, cockroaches, and mice & rats
> using low-toxic, family- and pet-safe methods — eliminating pests at the source and sealing
> entry points so they stay gone. Every job is backed by our 100% satisfaction guarantee and a
> free two-week follow-up. We're fast, discreet, and affordable, with same-day service available.
> Serving Mississauga, Brampton, Vaughan, Markham, Scarborough, Oakville, Pickering and the wider
> GTA. Call or text us today for a free, no-obligation quote.

**Then:** add 10+ real photos (your van, team, before/afters, logo), and **verify** the profile
(Google mails a postcard or calls). Keep it active — post updates, answer questions, reply to every review.

---

## ⭐ Part 3 — Get reviews (do this from day one)

After every happy job, send this. Reviews drive both ranking *and* trust.

**Get your review link:** in your Google Business Profile → **Ask for reviews** → copy the short link.

**Copy-paste request (text/email):**
> Hi [name], thanks for trusting Serene Touch with your pest problem! If you were happy with the
> service, a quick Google review would mean the world to us and helps other GTA families find us:
> [your review link]. Thank you! — The Serene Touch team

Aim for your first **5 reviews** fast — that's the credibility tipping point.

---

## ⚖️ Part 4 — Be legal to operate (don't skip)

- **Ontario pesticide/exterminator licence** (Ministry of the Environment, Conservation & Parks) —
  required to apply pesticides. Confirm exactly what your services need.
- **Business registration** (Ontario), **HST number** (once revenue >$30k), **commercial general
  liability insurance**, and **WSIB** if you hire.
- Licence + insurance also unlock **Google Local Services Ads** ("Google Guaranteed" badge) — the
  best paid lead channel for pest control.

---

## 💸 Part 5 — Once the above is done, accelerate
Google Local Services Ads → Google Search Ads → Meta (Facebook/Instagram) → HomeStars, Yelp,
YellowPages.ca, Nextdoor listings → vehicle wrap + lawn signs.

---

*Questions on any step? Most of Part 1 I can finish for you in minutes — just send the
Web3Forms key, your real phone number, and (when ready) your GA4 ID and domain.*
