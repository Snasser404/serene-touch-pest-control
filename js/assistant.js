/* ===================================================================
   Serene Touch — website chat assistant
   -------------------------------------------------------------------
   A lightweight, rule-based assistant for site visitors. No backend,
   no API keys — it answers common questions about services, pricing,
   areas served, safety, and booking, and links to the right pages.
   Self-injects on every marketing page. (The portal has its own,
   account-aware assistant.)
=================================================================== */
(function () {
  "use strict";
  if (window.__sereneSiteChat) return;
  window.__sereneSiteChat = true;

  var PHONE = "+14389886709", PHONE_DISPLAY = "438-988-6709", EMAIL = "support@serenetouch.ca";

  var CHAT_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM7 9h10v2H7zm0 4h7v2H7z"/></svg>';
  var SEND_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';

  var onHome = /(\/|index\.html)$/i.test(location.pathname);
  function contactHref() { return onHome ? "#contact" : "index.html#contact"; }
  function areasHref() { return onHome ? "#areas" : "index.html#areas"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---- page context, for a tailored greeting ----
  function pageContext() {
    var p = location.pathname.toLowerCase();
    var svc = { "ant-control": "ant", "bed-bug-treatment": "bed bug", "cockroach-control": "cockroach", "rodent-control": "rodent" };
    for (var k in svc) { if (p.indexOf(k) > -1) return { type: "service", label: svc[k] }; }
    var m = p.match(/pest-control-([a-z-]+)\.html/);
    if (m) return { type: "city", label: m[1].replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) };
    return { type: "home" };
  }
  var ctx = pageContext();

  function build() {
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    var launch = document.createElement("button");
    launch.className = "chatw__launch"; launch.type = "button";
    launch.setAttribute("aria-label", "Open chat with us");
    launch.innerHTML = CHAT_ICON + "<span>Chat with us</span>";

    var panel = document.createElement("div");
    panel.className = "chatw"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Serene Touch assistant");
    panel.innerHTML =
      '<div class="chatw__head"><span class="chatw__avatar" aria-hidden="true">S</span>' +
        '<div class="chatw__id"><strong>Serene Assistant</strong><span><i class="chatw__dot"></i> Online · replies instantly</span></div>' +
        '<button class="chatw__close" type="button" aria-label="Close chat">&times;</button></div>' +
      '<div class="chatw__body" id="chatwBody"></div>' +
      '<div class="chatw__chips" id="chatwChips"></div>' +
      '<div class="chatw__foot"><input id="chatwInput" type="text" placeholder="Ask about services, pricing, areas…" autocomplete="off" />' +
        '<button class="chatw__send" type="button" aria-label="Send message">' + SEND_ICON + "</button></div>";

    document.body.appendChild(launch);
    document.body.appendChild(panel);

    var body = panel.querySelector("#chatwBody"), input = panel.querySelector("#chatwInput"),
        chips = panel.querySelector("#chatwChips"), sendBtn = panel.querySelector(".chatw__send"),
        closeBtn = panel.querySelector(".chatw__close");
    var greeted = false;

    function open() { panel.classList.add("is-open"); launch.classList.add("is-hidden"); if (!greeted) { greet(); greeted = true; } setTimeout(function () { input.focus(); }, 150); }
    function close() { panel.classList.remove("is-open"); launch.classList.remove("is-hidden"); }
    launch.addEventListener("click", open);
    closeBtn.addEventListener("click", close);

    function add(html, who) { var m = document.createElement("div"); m.className = "chatw__msg chatw__msg--" + who; m.innerHTML = html; body.appendChild(m); body.scrollTop = body.scrollHeight; return m; }
    function renderChips() {
      chips.innerHTML = "";
      ["What do you treat?", "How much does it cost?", "Areas you serve", "Book a visit", "Safe for pets?"].forEach(function (q) {
        var b = document.createElement("button"); b.className = "chatw__chip"; b.type = "button"; b.textContent = q;
        b.addEventListener("click", function () { handle(q); }); chips.appendChild(b);
      });
    }
    function greet() {
      var g;
      if (ctx.type === "service") g = "Hi! 👋 I'm the Serene Touch assistant. Questions about <b>" + esc(ctx.label) + " treatment</b>, pricing, or booking? Ask away — or I can connect you with our team.";
      else if (ctx.type === "city") g = "Hi! 👋 Looking for pest control in <b>" + esc(ctx.label) + "</b>? I can help with our services, pricing, the areas we cover, and booking a visit.";
      else g = "Hi! 👋 I'm the Serene Touch assistant. Ask me about our pest control services, pricing, the areas we serve, or how to book a visit.";
      add(g, "bot"); renderChips();
    }
    function think(cb) { if (reduce) { cb(); return; } var t = add('<span class="chatw__typing"><span></span><span></span><span></span></span>', "bot"); setTimeout(function () { t.remove(); cb(); }, 480); }
    function handle(text) { add(esc(text), "user"); think(function () { add(respond(text), "bot"); renderChips(); }); }

    sendBtn.addEventListener("click", function () { var v = input.value.trim(); if (v) { handle(v); input.value = ""; } });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") sendBtn.click(); });

    function respond(raw) {
      var q = raw.toLowerCase();
      var has = function () { for (var i = 0; i < arguments.length; i++) if (q.indexOf(arguments[i]) > -1) return true; return false; };
      var call = "<a href='tel:" + PHONE + "'>" + PHONE_DISPLAY + "</a>";
      var quote = "<a href='" + contactHref() + "'>request a free quote</a>";

      if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(q)) return "Hello! 👋 How can I help — services, pricing, the areas we serve, or booking a visit?";
      if (has("ant")) return "We handle <b>ants</b>, including carpenter ants, with targeted low-toxic treatments. See <a href='ant-control.html'>Ant Control</a>, or " + quote + ".";
      if (has("bed bug", "bedbug")) return "Yes — we provide discreet, effective <b>bed bug treatment</b>. Details on <a href='bed-bug-treatment.html'>Bed Bug Treatment</a>, or " + quote + ".";
      if (has("roach", "cockroach")) return "We treat <b>cockroaches</b> at the source with gel bait + crack-and-crevice treatment. See <a href='cockroach-control.html'>Cockroach Control</a>, or " + quote + ".";
      if (has("rodent", "mice", "mouse", "rat")) return "We deal with <b>mice & rats</b> — removal plus sealing entry points so they stay out. See <a href='rodent-control.html'>Rodent Control</a>, or " + quote + ".";
      if (has("wasp", "hornet", "spider", "wildlife", "flea", "silverfish", "earwig", "what pest", "which pest", "what do you treat", "service", "what do you do", "do you do", "treat", "get rid", "pest"))
        return "We treat <b>ants, bed bugs, cockroaches, and rodents</b>, plus common GTA pests like wasps and spiders. Tell me your pest, or " + quote + " and we'll take care of it.";
      if (has("plan", "subscription", "monthly", "quarterly", "preventative", "preventive", "recurring", "package", "membership"))
        return "We offer a <b>one-time treatment</b> (with a free 2-week follow-up) plus <b>quarterly and monthly protection plans</b> with free re-treatments. See our <a href='plans.html'>Plans &amp; Pricing</a>, or " + quote + ".";
      if (has("price", "cost", "how much", "quote", "estimate", "fee", "charge", "afford", "cheap", "expensive"))
        return "Plans start around <b>$179 one-time</b> or <b>$129/visit on a quarterly plan</b> — full details on <a href='plans.html'>Plans &amp; Pricing</a>. Every home is different, so we confirm with a <b>free, no-obligation quote</b>: " + quote + " or call " + call + ".";
      if (has("book", "appoint", "schedule", "visit", "come out", "set up", "when can", "availab", "reserve"))
        return "Happy to help you book! Use the <a href='" + contactHref() + "'>quote form</a> with your details, or call/text " + call + " — Mon–Sat, 8am–7pm. Same-day service is often available.";
      if (has("area", "serve", "location", "near me", "city", "toronto", "mississauga", "scarborough", "brampton", "vaughan", "markham", "etobicoke", "north york", "richmond hill", "oakville", "burlington", "milton", "pickering", "ajax", "whitby", "oshawa", "newmarket", "aurora", "caledon", "gta", "cover"))
        return "We serve <b>Toronto and the Greater Toronto Area</b> — 19+ communities. See <a href='" + areasHref() + "'>Areas We Serve</a>, or tell me your city and I'll confirm we cover it.";
      if (has("safe", "pet", "dog", "cat", "kid", "child", "baby", "toxic", "eco", "green", "chemical", "harm", "danger"))
        return "Our treatments are <b>eco-friendly, low-toxic, and family &amp; pet safe</b>. 🌿 We also give you simple re-entry guidance after each visit so everyone stays comfortable.";
      if (has("guarantee", "warranty", "effective", "come back", "return", "again", "work"))
        return "We back our work with a <b>satisfaction guarantee</b> — if covered pests return between visits, we come back and re-treat at no extra cost.";
      if (has("hour", "open", "time", "emergency", "urgent", "same day", "today", "weekend", "when are"))
        return "We're available <b>Mon–Sat, 8am–7pm</b>, with same-day service often available. For anything urgent, call " + call + ".";
      if (has("how", "process", "inspect", "step"))
        return "Simple: we <b>inspect</b> your home, <b>treat</b> the problem at the source with pet-safe products, then book a <b>free follow-up</b> to confirm it's gone.";
      if (has("contact", "phone", "email", "reach", "call", "talk", "human", "speak", "representative", "number"))
        return "Reach our team at " + call + " or <a href='mailto:" + EMAIL + "'>" + EMAIL + "</a>, Mon–Sat 8am–7pm. Or " + quote + " and we'll get right back to you.";
      if (has("thank", "thx", "appreciate", "great", "awesome", "perfect")) return "You're welcome! 🐾 Anything else — services, pricing, or booking a visit?";
      return "I can help with our <b>services</b>, <b>pricing</b>, the <b>areas we serve</b>, <b>safety</b>, and <b>booking</b>. Try a question below, or call us anytime at " + call + ".";
    }

    renderChips();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
