/* ===================================================================
   Serene Touch Pest Control — Interactions
=================================================================== */
(function () {
  "use strict";

  /* ---------- Current year in footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky header shadow on scroll ---------- */
  var header = document.getElementById("header");
  function onScroll() {
    if (window.scrollY > 8) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  function closeNav() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }
  function openNav() {
    nav.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      if (nav.classList.contains("is-open")) closeNav();
      else openNav();
    });

    // Close the drawer when any link is tapped (including dropdown sub-links)
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------- Scroll reveal animations ---------- */
  var revealTargets = document.querySelectorAll(
    ".feature, .service-card, .process-step, .testimonial, .why__media-card, .why__content, .contact__form, .contact__info, .section__head"
  );
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Active nav link on scroll (scroll spy) ---------- */
  var sections = document.querySelectorAll("section[id]");
  var navLinks = document.querySelectorAll(".nav__link");

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute("id");
          navLinks.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + id
            );
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Quote form handling ----------
     Demo behaviour: validates input and shows a confirmation.
     To receive real submissions, either:
       1) Set the form's `action` to a service like Formspree:
          <form action="https://formspree.io/f/yourid" method="POST">
          and remove the e.preventDefault() below, OR
       2) Wire up your own backend / email endpoint.
  -------------------------------------------------------------- */
  var form = document.getElementById("quoteForm");
  var note = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        if (note) {
          note.textContent = "Please fill in the required fields so we can reach you.";
          note.className = "form-note is-error";
        }
        return;
      }

      var name = (document.getElementById("name") || {}).value || "there";
      var first = name.trim().split(" ")[0];

      if (note) {
        note.textContent =
          "Thanks, " + first + "! Your request has been received — we’ll be in touch shortly. " +
          "For urgent issues, call 438-988-6709.";
        note.className = "form-note is-success";
      }
      form.reset();
    });
  }
})();

/* ===================================================================
   Polish pass — skip link, back-to-top, stat count-up, FAQ accordion,
   reading progress. All features are guarded so they no-op on pages
   that don't have the relevant elements.
=================================================================== */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Skip-to-content link ---------- */
  var main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main";
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + main.id;
    skip.textContent = "Skip to content";
    document.body.insertBefore(skip, document.body.firstChild);
    skip.addEventListener("click", function () {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    });
  }

  /* ---------- Back-to-top button ---------- */
  var toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.type = "button";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5l7 7-1.4 1.4L13 8.8V20h-2V8.8l-4.6 4.6L5 12z"/></svg>';
  document.body.appendChild(toTop);
  function onTopScroll() {
    toTop.classList.toggle("is-show", window.scrollY > 700);
  }
  window.addEventListener("scroll", onTopScroll, { passive: true });
  onTopScroll();
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- Hero stats count-up ---------- */
  var stats = document.querySelectorAll(".hero__card-stats strong");
  if (stats.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var raw = en.target.textContent.trim();
        var m = raw.match(/^([\d.,]+)(.*)$/);
        if (!m) return;
        var target = parseFloat(m[1].replace(/,/g, ""));
        var suffix = m[2] || "";
        var decimals = m[1].indexOf(".") > -1 ? 1 : 0;
        var t0 = null, dur = 1100;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          p = 1 - Math.pow(1 - p, 3); // ease-out
          var v = target * p;
          en.target.textContent =
            (decimals ? v.toFixed(1) : Math.round(v).toLocaleString("en-US")) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { io.observe(s); });
  }

  /* ---------- FAQ: only one open at a time ---------- */
  var faqs = Array.prototype.slice.call(document.querySelectorAll(".faq__item"));
  faqs.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Reading progress bar (blog articles) ---------- */
  if (document.querySelector(".post-content")) {
    var bar = document.createElement("div");
    bar.className = "read-progress";
    document.body.appendChild(bar);
    function onProgress() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var y = h.scrollTop || document.body.scrollTop;
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
    window.addEventListener("scroll", onProgress, { passive: true });
    onProgress();
  }
})();
