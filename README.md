# Serene Touch Pest Control — Website

A fast, responsive, single-page marketing website for **Serene Touch Pest Control Services**.
Built with plain HTML, CSS, and JavaScript — no build step, no dependencies.

## Files

| File | Purpose |
|------|---------|
| `index.html` | All page content (hero, services, why-us, process, reviews, contact, footer) |
| `css/styles.css` | All styling and responsive layout |
| `js/script.js` | Mobile menu, scroll animations, active-nav highlighting, form handling |

## View it locally

Open `index.html` directly in your browser, **or** run a small local server:

```powershell
py -m http.server 5500
```

Then visit <http://localhost:5500>.

## Things to customize (search & replace)

Most details were filled in from your poster. A few are **placeholders** — update them with your real info:

| Placeholder | Where | Replace with |
|-------------|-------|--------------|
| `info@serenetouchpest.ca` | top bar, contact, footer | Your real email |
| `the Greater Toronto Area & surrounding areas` | top bar, contact, footer | Your real service area |
| `Mon–Sat: 8am–7pm` | top bar, contact, footer | Your real hours |
| `10+`, `5,000+`, `4.9★` | hero card | Your real stats (or remove) |
| Testimonials (Sarah M., David L., Amélie R.) | "Reviews" section | **Real reviews only** — the sample ones are illustrative |

The phone number **438-988-6709** is already wired everywhere as a clickable call link.

### Brand colors
Defined once at the top of `css/styles.css`:

```css
--navy-800: #0e3a6b;   /* primary blue   */
--gold:     #f6c324;   /* accent yellow  */
--green:    #22c55e;   /* logo / buttons */
```

### Add your own photos
The design uses CSS gradients and icons so it looks good with no images. To add real photos
(e.g. your technician, before/after shots), drop them in an `images/` folder and place
`<img>` tags in the hero or service cards.

## Make the contact form actually send

Right now the form shows a confirmation message but **does not email you** (it has no backend).
Two easy options:

1. **Formspree (no code):** create a free form at <https://formspree.io>, then in `index.html`
   change the form tag to:
   ```html
   <form class="contact__form" id="quoteForm" action="https://formspree.io/f/YOUR_ID" method="POST">
   ```
   and in `js/script.js` remove the line `e.preventDefault();` inside the submit handler.

2. **Your own backend / email service** — point the form `action` at your endpoint.

## Portal (3 roles: customer · technician · admin)

A role-based portal lives at **`portal.html`** (linked from the site's "Log In" button).
One sign-in page routes each user to the right dashboard.

| File | Purpose |
|------|---------|
| `portal.html` | Login screen + all three dashboards |
| `css/portal.css` | Portal styling |
| `js/portal-data.js` | **The sample data** (customers, technicians, appointments) — edit this |
| `js/portal.js` | Login/routing, all three dashboards, the workflow, and the assistant |

**Try it:** open `portal.html` and click a demo dashboard — **Customer**, **Technician**, or
**Admin**. (Or sign in manually; all demo passwords are `demo123`.)

| Role | Account | Sees |
|------|---------|------|
| Customer | `demo@serenetouch.ca` | Their appointment, treatment, "what's next" timeline, prep checklist, history, and the assistant |
| Technician | `tech@serenetouch.ca` | Their assigned jobs/route, each customer's prep progress, call/directions, and status controls |
| Admin | `admin@serenetouch.ca` | All appointments, technician assignment, team workload, and stats |

### How the roles link together (the workflow)
1. **Admin** assigns an unassigned job to a technician → the job becomes *Scheduled*.
2. **Technician** sees it in their route, advances it *En route → In progress → Complete*.
   Completing it **auto-books the ≈2-week revisit**.
3. **Customer** instantly sees the new status, revisit date, and updated timeline.
4. **Customer** ticks off their prep checklist → the **technician** sees the prep % for that job.

Changes are saved in the browser (`localStorage`) so switching between the demo accounts shows
each other's effects.

### Customer features
- **Next appointment** (date, time, technician, address) + "Add to calendar"
- **Treatment details** and family/pet-safe re-entry guidance
- **"What happens next" timeline** — treatment → settle-in → revisit (≈2 weeks) → coverage end
- **Interactive preparation checklist** (saves progress)
- **Service history**
- **Serene Assistant** — a chat assistant that reads the customer's data and answers questions
  about their appointment, prep, treatment, revisit, safety, and "I still see pests"

### ⚠️ Important: this is a front-end demo
Login and data run **in the browser only** — it is **not secure**, and all demo users share the
same sample data. Before using it with real people you need a backend. The pieces to replace:

1. **Authentication & roles** — swap the demo `accounts` check in `portal.js` for a real service
   like **Firebase Auth**, **Auth0**, or your own server, and enforce roles on the server. Never
   trust browser-only login.
2. **Data** — instead of `js/portal-data.js`, fetch real records from your backend after sign-in,
   filtered by who's logged in (a customer gets only their own data; a technician only their jobs;
   an admin everything). The dashboards already expect this same data shape.
3. **The assistant** — currently rule-based (fast, free, offline). It can be upgraded to a real
   AI by sending the customer's data + question to an LLM API. Tell me if you'd like that.

## Service pages

Each service has its own dedicated, SEO-optimized page — far better for ranking on searches like
*"bed bug treatment Toronto"* than a single homepage.

| Page | Pest |
|------|------|
| `ant-control.html` | Ants (incl. carpenter ants) |
| `bed-bug-treatment.html` | Bed bugs |
| `cockroach-control.html` | Cockroaches |
| `rodent-control.html` | Mice & rats |

Each has a unique write-up (signs → process → FAQ), a relevant photo, an FAQ section backed by
**Google FAQ structured data**, **Service + LocalBusiness (PestControlService) schema**, and
two-way links with the blog. The homepage cards and every footer point to these pages.

**To edit the words**, open the matching `.html` file and edit the text directly (plain HTML).
If you change an FAQ question, update **both** the visible `<details>` block **and** the matching
entry in the `application/ld+json` FAQ script near the top of the file — Google requires them to
match.

**To add a new service**, copy one of these files, rename it (e.g. `wasp-control.html`), update
the text/title/schema, then add a homepage card and footer link pointing to it.

> Tip: after deploying, you can paste any page URL into Google's
> [Rich Results Test](https://search.google.com/test/rich-results) to confirm the FAQ and Service
> data is detected.

## Blog

The blog is **data-driven** — you don't touch HTML to publish a post.

| File | Purpose |
|------|---------|
| `blog.html` | The blog index (list of all posts) |
| `post.html` | Renders a single article from `?slug=...` |
| `js/blog-data.js` | **All the posts live here** — one object per post |
| `js/blog.js` | Renders the index, the article, and the homepage teaser |

**To add a post:** open `js/blog-data.js`, copy an existing entry, and change the fields
(`slug`, `title`, `excerpt`, `date`, `category`, `readTime`, `content`). The blog index, the
homepage "From the Blog" strip, and the article page all update automatically. Optionally add a
cover image in `images/blog/` and point `cover` at it.

## Pictures / images

The site uses a mix of:

- **Real photos** (`images/photos/`) — the homepage hero background and the four blog covers
  (living room, kitchen, bedroom, leaves, brick house). These are **public-domain (CC0)** images
  sourced via [Openverse](https://openverse.org) (rawpixel & Flickr), so they're free for
  commercial use with **no attribution required**, and they're self-hosted so they never break.
- **Custom brand illustrations** (`images/`, `images/blog/`) — e.g. the "protected home" graphic
  in the Why-Us section. SVGs are crisp at any size and never break.

**To swap in your own photos:** drop files into `images/photos/` and update the relevant
`<img src="...">` or CSS `background` (the hero is in `css/styles.css` → `.hero__bg`), or the
`cover:` field in `js/blog-data.js`. Keep links **relative** (e.g. `images/photos/my-photo.jpg`,
never `/images/...`) so they work on GitHub Pages.

## Sharing, SEO files & UX extras

- **`images/og-image.png`** — the branded card shown when the site is shared on WhatsApp,
  Facebook, LinkedIn, iMessage, etc. (wired up via Open Graph tags on every page).
- **`sitemap.xml` / `robots.txt`** — submit the sitemap in Google Search Console to speed up
  indexing. The portal is excluded from search engines.
- **`404.html`** — branded "page not found" page (GitHub Pages serves it automatically).
- **Injected UX features** (in `js/script.js`, run on every marketing page): skip-to-content
  link, back-to-top button, hero stat count-up, one-at-a-time FAQ accordions, and a reading
  progress bar on blog articles. All respect the visitor's reduced-motion preference.

## Hosting — already live ✅

The site is deployed on **GitHub Pages**:

- **Live site:** <https://snasser404.github.io/serene-touch-pest-control/>
- **Repo:** <https://github.com/Snasser404/serene-touch-pest-control>

**To publish changes**, commit and push — Pages rebuilds automatically in ~1–2 minutes:

```powershell
git add -A
git commit -m "Update site"
git push
```

You can connect a custom domain (e.g. `serenetouchpest.ca`) later in the repo's
**Settings → Pages** section.
