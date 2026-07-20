/* ===================================================================
   Serene Touch — Blog rendering
   Renders three things depending on which container is on the page:
     #blogList    -> the blog index (blog.html)
     #postArticle -> a single article (post.html?slug=...)
     #blogTeaser  -> the "From the Blog" strip (index.html)
=================================================================== */
(function () {
  "use strict";

  var POSTS = (window.SERENE_BLOG || []).slice().sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  function fmtDate(iso) {
    // Parse as local midnight (not UTC) so the day doesn't shift back in western timezones.
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }

  function card(p, featured) {
    return '' +
      '<article class="post-card' + (featured ? " post-card--featured" : "") + '">' +
        '<a class="post-card__media" href="post.html?slug=' + p.slug + '">' +
          '<img src="' + p.cover + '" alt="' + escAttr(p.title) + '" loading="lazy">' +
          '<span class="post-card__cat">' + p.category + '</span>' +
        '</a>' +
        '<div class="post-card__body">' +
          '<div class="post-card__meta">' + fmtDate(p.date) + ' &middot; ' + p.readTime + '</div>' +
          '<h3 class="post-card__title"><a href="post.html?slug=' + p.slug + '">' + p.title + '</a></h3>' +
          '<p class="post-card__excerpt">' + p.excerpt + '</p>' +
          '<a class="post-card__link" href="post.html?slug=' + p.slug + '">Read more &rarr;</a>' +
        '</div>' +
      '</article>';
  }

  var ctaBlock =
    '<aside class="post-cta">' +
      '<h3>Got a pest problem?</h3>' +
      '<p>Serene Touch offers fast, eco-friendly, family &amp; pet-safe pest control across the Greater Toronto Area.</p>' +
      '<div class="post-cta__btns">' +
        '<a class="btn btn--primary" href="index.html#contact">Get a Free Quote</a>' +
        '<a class="btn btn--ghost" href="tel:+14389886709">Call 438-988-6709</a>' +
      '</div>' +
    '</aside>';

  /* ---------- 1) Blog index ---------- */
  var listEl = document.getElementById("blogList");
  if (listEl) {
    if (!POSTS.length) {
      listEl.innerHTML = '<p class="blog-empty">No posts yet — check back soon!</p>';
    } else {
      var featured = POSTS[0];
      var rest = POSTS.slice(1);
      listEl.innerHTML =
        card(featured, true) +
        '<div class="post-grid">' + rest.map(function (p) { return card(p); }).join("") + '</div>';
    }
  }

  /* ---------- 2) Single article ---------- */
  var artEl = document.getElementById("postArticle");
  if (artEl) {
    var slug = new URLSearchParams(location.search).get("slug");
    var post = POSTS.filter(function (p) { return p.slug === slug; })[0];

    if (!post) {
      artEl.innerHTML =
        '<div class="container post-narrow post-notfound">' +
          '<h1>Article not found</h1>' +
          '<p>Sorry, we couldn&rsquo;t find that article.</p>' +
          '<p><a class="btn btn--primary" href="blog.html">&larr; Back to the blog</a></p>' +
        '</div>';
    } else {
      document.title = post.title + " | Serene Touch Pest Control";
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute("content", post.excerpt);

      // Point canonical + og tags at this specific article
      var canon = document.querySelector('link[rel="canonical"]');
      if (!canon) {
        canon = document.createElement("link");
        canon.rel = "canonical";
        document.head.appendChild(canon);
      }
      canon.href = location.origin + location.pathname + "?slug=" + post.slug;
      var ogT = document.querySelector('meta[property="og:title"]');
      if (ogT) ogT.setAttribute("content", post.title);
      var ogD = document.querySelector('meta[property="og:description"]');
      if (ogD) ogD.setAttribute("content", post.excerpt);

      var related = POSTS.filter(function (p) { return p.slug !== post.slug; }).slice(0, 3);

      artEl.innerHTML =
        '<div class="post-hero">' +
          '<div class="container post-narrow">' +
            '<a class="post-back" href="blog.html">&larr; All articles</a>' +
            '<span class="post-cat">' + post.category + '</span>' +
            '<h1 class="post-title">' + post.title + '</h1>' +
            '<div class="post-meta">By ' + post.author + ' &middot; ' + fmtDate(post.date) + ' &middot; ' + post.readTime + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="container post-narrow">' +
          '<img class="post-cover" src="' + post.cover + '" alt="' + escAttr(post.title) + '">' +
          '<div class="post-content">' + post.content + '</div>' +
          ctaBlock +
        '</div>' +
        (related.length
          ? '<div class="container related"><h2 class="related-h">More from the blog</h2>' +
            '<div class="post-grid">' + related.map(function (p) { return card(p); }).join("") + '</div></div>'
          : "");
    }
  }

  /* ---------- 3) Homepage teaser ---------- */
  var teaserEl = document.getElementById("blogTeaser");
  if (teaserEl) {
    teaserEl.innerHTML = POSTS.slice(0, 3).map(function (p) { return card(p); }).join("");
  }

  /* ---------- 4) Related posts (service pages) ----------
     Renders the posts named in data-slugs="a,b,c" (falls back to latest). */
  var relEl = document.getElementById("relatedPosts");
  if (relEl) {
    var slugs = (relEl.getAttribute("data-slugs") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var picked = slugs.map(function (sl) { return POSTS.filter(function (p) { return p.slug === sl; })[0]; }).filter(Boolean);
    if (!picked.length) picked = POSTS.slice(0, 3);
    relEl.innerHTML = picked.map(function (p) { return card(p); }).join("");
  }
})();
