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

    // Close the drawer when a link is tapped
    nav.addEventListener("click", function (e) {
      if (e.target.closest(".nav__link")) closeNav();
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
