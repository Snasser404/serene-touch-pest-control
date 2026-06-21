/* ===================================================================
   Serene Touch — Customer Portal logic  (customer / technician / admin)
   -------------------------------------------------------------------
   Runs in one of three modes:
     • REAL  — js/supabase-config.js holds real keys. Secure auth + data
               via Supabase (Row-Level Security + SECURITY DEFINER RPCs).
     • DEMO  — open portal.html?demo=1 to explore with local sample data
               (browser-only, not secure — for showing the concept).
     • SETUP — keys not pasted yet → a friendly "connect Supabase" screen.
   See PORTAL-SETUP.md for setup.
=================================================================== */
(function () {
  "use strict";

  /* ================================================================
     MODE + STATE
  ================================================================ */
  var CFG = window.SERENE_SUPABASE || {};
  function isPlaceholder(v) { return !v || String(v).indexOf("YOUR_") === 0; }
  var SUPA_OK = !isPlaceholder(CFG.url) && !isPlaceholder(CFG.anonKey) && !!window.supabase;
  var DEMO = /[?&]demo=1\b/.test(location.search);
  var MODE = SUPA_OK && !DEMO ? "real" : (DEMO ? "demo" : "setup");

  var DATA = window.SERENE_PORTAL_DATA;     // static content (+ demo sample data)
  var sb = null;                            // supabase client (real mode)
  var currentUserId = null;

  // The dashboards render from STATE (same shape in real + demo mode).
  var STATE = { role: null, me: null, customers: [], technicians: [], appointments: [], history: {} };

  /* ---------- tiny helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function uniq(arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); }
  function firstWord(s) { return s ? String(s).split(" ")[0] : s; }
  function initials(name) { return String(name || "ST").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }
  function fmtFullDate(iso) { return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  function fmtDateShort(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function fmtTime(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysBetween(iso) { return Math.round((startOfDay(iso) - startOfDay(new Date())) / 86400000); }
  function relDays(iso) {
    var d = daysBetween(iso);
    if (d === 0) return "today";
    if (d === 1) return "tomorrow";
    if (d === -1) return "yesterday";
    if (d > 1 && d < 14) return "in " + d + " days";
    if (d >= 14) return "in " + Math.round(d / 7) + " weeks";
    return Math.abs(d) + " days ago";
  }
  function isToday(iso) { return daysBetween(iso) === 0; }
  function addDaysISO(iso, n) { var d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); }

  /* ---------- icons ---------- */
  var IC = {
    calendar: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 11h-4v-2h2V7h2v6z"/></svg>',
    bug: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 8h-2.81a5.99 5.99 0 0 0-1.82-1.96l1.7-1.7-1.42-1.42-2.16 2.17A6.07 6.07 0 0 0 12 5c-.46 0-.91.05-1.34.15L8.5 2.99 7.08 4.41l1.7 1.7A5.99 5.99 0 0 0 6.96 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81a6 6 0 0 0 10.38 0H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z"/></svg>',
    flask: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 2v2h1v5.59l-5.7 9.12A1.5 1.5 0 0 0 5.58 21h12.84a1.5 1.5 0 0 0 1.28-2.29L14 9.59V4h1V2H9zm3 12a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg>',
    map: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>'
  };

  /* ================================================================
     DATA MAPPERS + STORE  (read from STATE)
  ================================================================ */
  function mapProfile(r) {
    return {
      id: r.id, name: r.full_name || r.email || "—", firstName: firstWord(r.full_name) || "there",
      email: r.email, phone: r.phone, address: r.address, plan: r.plan || "Service plan",
      memberSince: r.member_since, initials: initials(r.full_name)
    };
  }
  function mapAppt(r) {
    return {
      id: r.id, customerId: r.customer_id, technicianId: r.technician_id, technicianName: r.technician_name,
      pest: r.pest, treatmentType: r.treatment_type, targets: r.targets,
      start: r.starts_at, end: r.ends_at || r.starts_at, status: r.status,
      revisit: r.revisit_at, coverageEnds: r.coverage_ends_at, reEntryHours: r.re_entry_hours || 0,
      notes: r.notes, result: r.result, prepDone: r.prep_done || {}
    };
  }
  function getAppointments() { return STATE.appointments; }
  function customerById(id) { return STATE.customers.filter(function (c) { return c.id === id; })[0]; }
  function techById(id) { return id ? STATE.technicians.filter(function (t) { return t.id === id; })[0] : null; }
  function techNameFor(a) { return a.technicianName || (techById(a.technicianId) ? techById(a.technicianId).name : null); }

  function buildPrepItems(pest) {
    var items = [];
    (DATA.prepByPest[pest] || []).forEach(function (t) { items.push({ text: t, group: "For your " + pest.toLowerCase() + " treatment" }); });
    DATA.generalPrep.forEach(function (t) { items.push({ text: t, group: "For every visit" }); });
    return items;
  }
  function prepTotalFor(pest) { return buildPrepItems(pest).length; }
  function prepDoneCount(appt) {
    var map = appt.prepDone || {};
    return buildPrepItems(appt.pest).filter(function (it) { return map[it.text]; }).length;
  }

  function statusMeta(status) {
    return ({ "Unassigned": "unassigned", "Scheduled": "scheduled", "En route": "route", "In progress": "progress", "Completed": "done", "Cancelled": "unassigned" })[status] || "scheduled";
  }
  function badge(status) { return '<span class="badge badge--' + statusMeta(status) + '">' + status + "</span>"; }

  /* ================================================================
     VIEW REFERENCES
  ================================================================ */
  var loginView = $("#loginView");
  var appShell = $("#appShell");
  var views = { customer: $("#customerView"), technician: $("#techView"), admin: $("#adminView") };

  function showLogin() { appShell.classList.add("hidden"); loginView.classList.remove("hidden"); }
  function showApp() { loginView.classList.add("hidden"); appShell.classList.remove("hidden"); }

  function routeTo(role) {
    showApp();
    Object.keys(views).forEach(function (k) { views[k].classList.toggle("hidden", k !== role); });
    setAppbar(role);
    ensureRefreshBtn();
    if (role === "customer") renderCustomer();
    else if (role === "technician") renderTechnician();
    else renderAdmin();
  }

  function setAppbar(role) {
    var name = "User", sub = "PORTAL", roleLabel = "", av = "ST";
    if (role === "customer") { name = STATE.me.name; roleLabel = STATE.me.plan; sub = "CUSTOMER PORTAL"; av = STATE.me.initials; }
    else if (role === "technician") { name = STATE.me.name; roleLabel = "Technician"; sub = "TECHNICIAN PORTAL"; av = STATE.me.initials; }
    else { name = STATE.me.name || "Operations Admin"; roleLabel = "Administrator"; sub = "ADMIN CONSOLE"; av = STATE.me.initials || "AD"; }
    $("#userName").textContent = name;
    $("#userRole").textContent = roleLabel;
    $("#appbarSub").textContent = sub;
    $("#userAvatar").textContent = av;
  }

  /* ================================================================
     CUSTOMER DASHBOARD
  ================================================================ */
  var ASSIST_APPT = null, ASSIST_CUSTOMER = null;

  function activeApptFor(customerId) {
    var list = getAppointments().filter(function (a) { return a.customerId === customerId; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return list.filter(function (a) { return a.status !== "Completed" && a.status !== "Cancelled"; })[0] || list[list.length - 1];
  }

  function renderCustomer() {
    var c = STATE.me;
    var appt = activeApptFor(c.id);
    if (!appt) {
      ASSIST_APPT = null; ASSIST_CUSTOMER = c;
      $("#welcomeTitle").textContent = "Hi " + c.firstName + " 👋";
      $("#apptBadge").textContent = "None scheduled";
      $("#bannerStrong").textContent = "No upcoming visit yet";
      $("#bannerSpan").textContent = "We'll let you know as soon as your next treatment is booked.";
      $("#apptBody").innerHTML = '<p class="muted-note">You have no upcoming appointment. Call us at <a href="tel:+14389886709">438-988-6709</a> to book one.</p>';
      $("#treatBody").innerHTML = ""; $("#timeline").innerHTML = ""; $("#prepList").innerHTML = "";
      renderHistory(c.id);
      return;
    }
    ASSIST_APPT = appt; ASSIST_CUSTOMER = c;
    var tName = techNameFor(appt);

    $("#welcomeTitle").textContent = "Hi " + c.firstName + " 👋";
    $("#apptBadge").textContent = appt.status;
    $("#apptBadge").className = "card__badge badge--" + statusMeta(appt.status);

    var bs = $("#bannerStrong"), bsp = $("#bannerSpan");
    if (appt.status === "Completed") {
      bs.textContent = "Treatment complete ✅";
      bsp.textContent = appt.revisit ? "Your follow-up (revisit) is on " + fmtFullDate(appt.revisit) + "." : "Thank you — your visit is complete.";
    } else if (appt.status === "En route") {
      bs.textContent = (tName ? firstWord(tName) + " is on the way! 🚐" : "Your technician is on the way! 🚐");
      bsp.textContent = "Arriving for your " + appt.pest.toLowerCase() + " treatment around " + fmtTime(appt.start) + ".";
    } else if (appt.status === "In progress") {
      bs.textContent = "Your treatment is in progress 🛠️";
      bsp.textContent = "Your technician is on site working on your " + appt.pest.toLowerCase() + " treatment.";
    } else {
      bs.textContent = "Your next treatment is " + relDays(appt.start);
      bsp.textContent = fmtFullDate(appt.start) + " · " + fmtTime(appt.start) + (tName ? " with " + firstWord(tName) : "");
    }

    var box = $("#apptBody"); box.innerHTML = "";
    var dl = el("div", "dl");
    dl.appendChild(dlRow(IC.calendar, "Date", fmtFullDate(appt.start)));
    dl.appendChild(dlRow(IC.clock, "Time", fmtTime(appt.start) + " – " + fmtTime(appt.end) + " (about 90 min)"));
    dl.appendChild(dlRow(IC.user, "Technician", tName || "To be assigned"));
    dl.appendChild(dlRow(IC.pin, "Address", c.address || "On file"));
    box.appendChild(dl);
    if (appt.notes) box.appendChild(el("div", "note", "<strong>Technician note:</strong> " + escapeHtml(appt.notes)));
    var actions = el("div", "card__actions");
    actions.innerHTML = '<a class="btn btn--ghost btn--sm" href="tel:+14389886709">Call to reschedule</a>' +
      '<button class="btn btn--ghost btn--sm" id="addCalBtn">Add to calendar</button>';
    box.appendChild(actions);
    $("#addCalBtn").addEventListener("click", function () { downloadICS(appt, c); });

    var tb = $("#treatBody"); tb.innerHTML = "";
    var dl2 = el("div", "dl");
    dl2.appendChild(dlRow(IC.bug, "Pest", appt.pest));
    dl2.appendChild(dlRow(IC.flask, "Treatment", appt.treatmentType || "—"));
    dl2.appendChild(dlRow(IC.pin, "Focus area", appt.targets ? ("Mainly your " + appt.targets + ".") : "—"));
    tb.appendChild(dl2);
    tb.appendChild(el("div", "note", "🌿 <strong>Family &amp; pet safe.</strong> Keep children and pets out of treated areas for about " +
      appt.reEntryHours + " hours after the visit, then ventilate by opening a few windows."));

    renderTimeline(appt);
    renderPrep(appt);
    renderHistory(c.id);
    renderCustomerUpcoming(c.id);
    initAssistant();
  }

  function dlRow(icon, label, value) {
    var row = el("div", "dl__row");
    row.innerHTML = icon + '<div><span class="dl__label">' + label + '</span><div class="dl__value">' + escapeHtml(value) + "</div></div>";
    return row;
  }

  function renderTimeline(appt) {
    var now = Date.now();
    var revisit = appt.revisit || addDaysISO(appt.start, 14);
    var coverage = appt.coverageEnds || addDaysISO(appt.start, 90);
    var nodes = [
      { passedBy: appt.end, date: fmtDate(appt.start), title: "Treatment Visit", desc: (appt.treatmentType || "Treatment") + "." },
      { passedBy: revisit, date: "1–2 weeks", title: "Settle-In Period", desc: "The treatment works through the colony. Some activity is normal — that's expected." },
      { passedBy: addDaysISO(revisit, 1), date: fmtDate(revisit), title: "Follow-Up Visit (Revisit)", desc: "We check the results and re-treat free of charge if anything remains." },
      { passedBy: coverage, date: "Through " + fmtDate(coverage), title: "Plan Coverage", desc: "You stay protected under your " + escapeHtml(STATE.me.plan) + ", with free return visits if pests come back." }
    ];
    var cur = nodes.findIndex(function (n) { return now < new Date(n.passedBy).getTime(); });
    if (cur < 0) cur = nodes.length - 1;
    if (appt.status === "Completed" && cur < 1) cur = 1;
    else if ((appt.status === "En route" || appt.status === "In progress") && cur > 0) cur = 0;
    var wrap = $("#timeline"); wrap.innerHTML = "";
    nodes.forEach(function (n, i) {
      var state = i < cur ? "done" : (i === cur ? "current" : "upcoming");
      var item = el("div", "tl-item tl-item--" + state);
      item.innerHTML = '<span class="tl-item__dot"></span><div class="tl-item__date">' + n.date +
        (state === "current" ? '<span class="tl-pill tl-pill--current">Up next</span>' : "") + "</div>" +
        '<div class="tl-item__title">' + n.title + '</div><div class="tl-item__desc">' + n.desc + "</div>";
      wrap.appendChild(item);
    });
  }

  function renderPrep(appt) {
    var items = buildPrepItems(appt.pest);
    var state = Object.assign({}, appt.prepDone || {});   // keyed by item text
    var list = $("#prepList"); list.innerHTML = "";
    var lastGroup = null;
    items.forEach(function (it, i) {
      if (it.group !== lastGroup) { list.appendChild(el("div", "prep__tag", it.group)); lastGroup = it.group; }
      var id = "prep_" + i;
      var label = el("label", "prep__item"); label.setAttribute("for", id);
      label.innerHTML = '<input type="checkbox" id="' + id + '" ' + (state[it.text] ? "checked" : "") + ' data-text="' + escapeHtml(it.text) + '">' +
        '<span class="prep__box">' + IC.check + '</span><span class="prep__text">' + escapeHtml(it.text) + "</span>";
      list.appendChild(label);
    });
    function paint() {
      var boxes = list.querySelectorAll('input[type=checkbox]'), done = 0;
      boxes.forEach(function (b) { if (b.checked) done++; });
      var pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
      $("#prepFill").style.width = pct + "%";
      $("#prepCount").textContent = done + "/" + boxes.length;
      $("#prepDone").classList.toggle("hidden", !boxes.length || done !== boxes.length);
    }
    var saveTimer = null;
    list.onchange = function (e) {
      var cb = e.target;
      if (!cb || cb.type !== "checkbox") return;
      state[cb.getAttribute("data-text")] = cb.checked;
      paint();
      appt.prepDone = state;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { savePrep(appt.id, state); }, 250);
    };
    paint();
  }

  function renderHistory(customerId) {
    var wrap = $("#historyList"); wrap.innerHTML = "";
    var list = (STATE.history[customerId] || []).slice()
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (!list.length) { wrap.appendChild(el("p", "muted-note", "No past visits yet — your first treatment is coming up.")); return; }
    list.forEach(function (h) {
      var d = new Date(h.date);
      var item = el("div", "history__item");
      item.innerHTML = '<div class="history__date"><strong>' + d.getDate() + "</strong><span>" +
        d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) + "</span></div>" +
        '<div class="history__body"><h4>' + escapeHtml(h.pest) + "</h4><p>" + escapeHtml(h.result || "Treatment completed.") + "</p>" +
        '<div class="history__meta">' + escapeHtml(h.treatmentType || "") + (h.technician ? " · " + escapeHtml(h.technician) : "") + "</div></div>";
      wrap.appendChild(item);
    });
  }

  /* ================================================================
     TECHNICIAN DASHBOARD
  ================================================================ */
  var STATUS_FLOW = ["Scheduled", "En route", "In progress", "Completed"];

  function renderTechnician() {
    var tech = STATE.me;
    var jobs = getAppointments().filter(function (a) { return a.technicianId === tech.id; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });

    $("#techWelcome").textContent = "Hi " + tech.firstName + " 👋";
    $("#techSub").textContent = "Here are the jobs assigned to you. Update each one as you go.";

    var todayJobs = jobs.filter(function (j) { return isToday(j.start); });
    var openJobs = jobs.filter(function (j) { return j.status !== "Completed" && j.status !== "Cancelled"; });
    var nextJob = openJobs[0];
    $("#techStats").innerHTML =
      stat("Jobs today", todayJobs.length, "scheduled") +
      stat("Open jobs", openJobs.length, "route") +
      stat("Completed", jobs.filter(function (j) { return j.status === "Completed"; }).length, "done") +
      stat("Next job", nextJob ? relDays(nextJob.start) : "—", "progress");

    var wrap = $("#techJobs"); wrap.innerHTML = "";
    if (!jobs.length) { wrap.appendChild(el("p", "muted-note", "No jobs assigned to you right now.")); return; }

    jobs.forEach(function (j) {
      var c = customerById(j.customerId) || { name: "Customer", address: "", phone: "" };
      var done = prepDoneCount(j), total = prepTotalFor(j.pest);
      var pct = total ? Math.round((done / total) * 100) : 0;
      var mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.address || "");

      var card = el("div", "job");
      card.innerHTML =
        '<div class="job__time">' +
          '<strong>' + fmtTime(j.start) + "</strong>" +
          '<span>' + (isToday(j.start) ? "Today" : fmtDateShort(j.start) + " · " + relDays(j.start)) + "</span>" +
          badge(j.status) +
        "</div>" +
        '<div class="job__main">' +
          "<h3>" + escapeHtml(c.name) + " · " + escapeHtml(j.pest) + "</h3>" +
          '<div class="job__row">' + IC.pin + "<span>" + escapeHtml(c.address || "—") + "</span></div>" +
          '<div class="job__treat">' + IC.flask + " " + escapeHtml(j.treatmentType || "") + (j.targets ? " — " + escapeHtml(j.targets) : "") + "</div>" +
          '<div class="job__prep"><div class="mini-bar"><div class="mini-bar__fill" style="width:' + pct + '%"></div></div>' +
            "<span>Customer prep " + done + "/" + total + "</span></div>" +
          '<div class="job__links">' +
            (c.phone ? '<a class="mini-btn" href="tel:' + String(c.phone).replace(/[^0-9+]/g, "") + '">' + IC.phone + " Call</a>" : "") +
            '<a class="mini-btn" href="' + mapUrl + '" target="_blank" rel="noopener">' + IC.map + " Directions</a>" +
          "</div>" +
          '<label class="job__note-label">Visit notes' +
            '<textarea class="job__note" data-id="' + j.id + '" rows="2">' + escapeHtml(j.notes || "") + "</textarea>" +
          "</label>" +
        "</div>" +
        '<div class="job__actions" data-id="' + j.id + '">' + techActions(j) + "</div>";
      wrap.appendChild(card);
    });

    wrap.querySelectorAll(".job__note").forEach(function (ta) {
      ta.addEventListener("change", function () { saveNotes(ta.getAttribute("data-id"), ta.value); });
    });
    wrap.querySelectorAll("[data-action]").forEach(function (b) {
      b.addEventListener("click", function () {
        b.disabled = true;
        advanceJob(b.getAttribute("data-id"), b.getAttribute("data-action"));
      });
    });
  }

  function techActions(j) {
    if (j.status === "Completed") {
      return '<div class="job__done">✅ Completed' + (j.revisit ? "<br><small>Revisit " + fmtDateShort(j.revisit) + "</small>" : "") + "</div>";
    }
    if (j.status === "Unassigned") { return '<div class="job__done"><small>Waiting on scheduling</small></div>'; }
    var idx = STATUS_FLOW.indexOf(j.status);
    var next = STATUS_FLOW[idx + 1] || "Completed";
    var label = { "En route": "Mark en route", "In progress": "Start visit", "Completed": "Complete visit" }[next];
    var btns = '<button class="btn btn--primary btn--sm" data-id="' + j.id + '" data-action="' + next + '">' + label + "</button>";
    if (next === "En route") btns += '<button class="btn btn--ghost btn--sm" data-id="' + j.id + '" data-action="In progress">Start visit</button>';
    return btns;
  }

  function stat(label, value, mod) {
    return '<div class="stat stat--' + (mod || "scheduled") + '"><span class="stat__value">' + value + '</span><span class="stat__label">' + label + "</span></div>";
  }

  /* ================================================================
     ADMIN DASHBOARD
  ================================================================ */
  function renderAdmin() {
    var appts = getAppointments().slice().sort(function (a, b) { return new Date(a.start) - new Date(b.start); });

    var todayCount = appts.filter(function (a) { return isToday(a.start); }).length;
    var weekCount = appts.filter(function (a) { var d = daysBetween(a.start); return d >= 0 && d <= 7; }).length;
    var unassigned = appts.filter(function (a) { return !a.technicianId && a.status !== "Completed" && a.status !== "Cancelled"; }).length;
    $("#adminStats").innerHTML =
      stat("Jobs today", todayCount, "scheduled") +
      stat("Next 7 days", weekCount, "route") +
      stat("Active customers", STATE.customers.length, "progress") +
      stat("Needs assignment", unassigned, unassigned ? "unassigned" : "done");

    renderAdminTools();

    var techOpts = function (sel) {
      var opts = '<option value="">Unassigned</option>';
      STATE.technicians.forEach(function (t) { opts += '<option value="' + t.id + '"' + (t.id === sel ? " selected" : "") + ">" + escapeHtml(t.name) + "</option>"; });
      return opts;
    };
    var rows = '<div class="appt-row appt-row--head"><div>When</div><div>Customer</div><div>Service</div><div>Technician</div><div>Status</div></div>';
    appts.forEach(function (a) {
      var c = customerById(a.customerId) || { name: "—", address: "" };
      rows += '<div class="appt-row' + (a.technicianId ? "" : " appt-row--alert") + '">' +
        '<div data-label="When"><strong>' + fmtDateShort(a.start) + "</strong><small>" + fmtTime(a.start) + " · " + relDays(a.start) + "</small></div>" +
        '<div data-label="Customer"><strong>' + escapeHtml(c.name) + "</strong><small>" + escapeHtml(cityOf(c.address)) + "</small></div>" +
        '<div data-label="Service">' + escapeHtml(a.pest) + "<small>" + escapeHtml(a.treatmentType || "") + "</small></div>" +
        '<div data-label="Technician"><select class="tech-select" data-id="' + a.id + '">' + techOpts(a.technicianId) + "</select></div>" +
        '<div data-label="Status">' + badge(a.status) +
          '<div class="appt-acts">' +
            '<button type="button" data-act="edit" data-id="' + a.id + '">Edit</button>' +
            ((a.status !== "Cancelled" && a.status !== "Completed") ? '<button type="button" data-act="cancel" data-id="' + a.id + '">Cancel</button>' : "") +
            '<button type="button" data-act="del" data-id="' + a.id + '">Delete</button>' +
          "</div></div>" +
        "</div>";
    });
    $("#adminAppts").innerHTML = rows;

    $("#adminAppts").querySelectorAll(".tech-select").forEach(function (sel) {
      sel.addEventListener("change", function () { assignTech(sel.getAttribute("data-id"), sel.value || null); });
    });
    $("#adminAppts").querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id"), act = btn.getAttribute("data-act");
        var appt = getAppointments().filter(function (x) { return x.id === id; })[0];
        if (act === "edit") { if (appt) openEditAppt(appt); }
        else if (act === "cancel") { if (window.confirm("Cancel this appointment? The customer will see it as cancelled.")) cancelAppointment(id); }
        else if (act === "del") { if (window.confirm("Delete this appointment permanently? This cannot be undone.")) deleteAppointment(id); }
      });
    });

    var techHtml = "";
    if (!STATE.technicians.length) techHtml = '<p class="muted-note">No technicians yet. Add one with “Add a person” above.</p>';
    STATE.technicians.forEach(function (t) {
      var count = appts.filter(function (a) { return a.technicianId === t.id && a.status !== "Completed" && a.status !== "Cancelled"; }).length;
      techHtml += '<div class="tech-item"><span class="avatar avatar--sm">' + t.initials + "</span>" +
        '<div class="tech-item__info"><strong>' + escapeHtml(t.name) + "</strong><small>" + IC.phone + " " + escapeHtml(t.phone || "—") + "</small></div>" +
        '<span class="tech-item__count">' + count + " open job" + (count === 1 ? "" : "s") + "</span></div>";
    });
    $("#adminTechs").innerHTML = techHtml;
    renderAdminCustomers();
  }
  function cityOf(addr) { if (!addr) return ""; var parts = String(addr).split(","); return parts.length > 1 ? parts[1].trim() : addr; }

  /* ---- Admin tools: new appointment + add a person (injected once) ---- */
  function renderAdminTools() {
    var host = $("#adminTools");
    if (!host) {
      host = el("div"); host.id = "adminTools";
      var stats = $("#adminStats");
      stats.parentNode.insertBefore(host, stats.nextSibling);
    }
    var custOpts = STATE.customers.map(function (c) { return '<option value="' + c.id + '">' + escapeHtml(c.name) + "</option>"; }).join("");
    var canAddPeople = MODE === "real" && CFG.manageAccountUrl;

    host.innerHTML =
      '<div class="admin-tools">' +
        '<details class="card admin-tool"><summary>＋ New appointment</summary>' +
          '<form id="newApptForm" class="admin-form">' +
            '<div class="admin-form__grid">' +
              '<label class="field"><span>Customer</span><select name="customer" required>' + (custOpts || '<option value="">No customers yet</option>') + '</select></label>' +
              '<label class="field"><span>Pest</span><input name="pest" required placeholder="Cockroaches" /></label>' +
              '<label class="field"><span>Treatment</span><input name="treatment" placeholder="Gel Bait + Crack &amp; Crevice" /></label>' +
              '<label class="field"><span>Focus area</span><input name="targets" placeholder="kitchen and bathroom" /></label>' +
              '<label class="field"><span>Date</span><input name="date" type="date" required /></label>' +
              '<label class="field"><span>Time</span><input name="time" type="time" required value="09:00" /></label>' +
              '<label class="field"><span>Duration (min)</span><input name="duration" type="number" min="15" step="15" value="90" /></label>' +
              '<label class="field"><span>Re-entry (hours)</span><input name="reentry" type="number" min="0" value="4" /></label>' +
            "</div>" +
            '<label class="field"><span>Notes</span><textarea name="notes" rows="2" placeholder="Anything the technician should know"></textarea></label>' +
            '<button class="btn btn--primary" type="submit">Create appointment</button>' +
          "</form>" +
        "</details>" +
        '<details class="card admin-tool"><summary>＋ Add a person</summary>' +
          (canAddPeople ?
            '<form id="addPersonForm" class="admin-form">' +
              '<div class="admin-form__grid">' +
                '<label class="field"><span>Role</span><select name="role"><option value="customer">Customer</option><option value="technician">Technician</option></select></label>' +
                '<label class="field"><span>Full name</span><input name="full_name" required placeholder="Jane Doe" /></label>' +
                '<label class="field"><span>Email</span><input name="email" type="email" required placeholder="jane@example.com" /></label>' +
                '<label class="field"><span>Phone</span><input name="phone" placeholder="416-555-0199" /></label>' +
                '<label class="field"><span>Address (customers)</span><input name="address" placeholder="123 Maple Ave, Toronto" /></label>' +
                '<label class="field"><span>Plan (customers)</span><input name="plan" placeholder="Quarterly Protection Plan" /></label>' +
              "</div>" +
              '<button class="btn btn--primary" type="submit">Create login &amp; email an invite</button>' +
              '<p class="muted-note">They get an email to set their password and sign in.</p>' +
            "</form>"
            :
            '<p class="muted-note">To add customer or technician logins from here, deploy the optional <code>manage-account</code> Edge Function and set <code>manageAccountUrl</code> in <code>js/supabase-config.js</code> (see PORTAL-SETUP.md). Until then, add users under <b>Authentication → Users</b> in your Supabase dashboard.</p>'
          ) +
        "</details>" +
      "</div>";

    var apForm = $("#newApptForm");
    if (apForm) apForm.addEventListener("submit", onCreateAppointment);
    var ppForm = $("#addPersonForm");
    if (ppForm) ppForm.addEventListener("submit", onAddPerson);
  }

  function onCreateAppointment(e) {
    e.preventDefault();
    var f = e.target;
    var date = f.date.value, time = f.time.value;
    if (!f.customer.value || !date || !time) { toast("Please fill the required fields"); return; }
    var start = new Date(date + "T" + time);
    var dur = parseInt(f.duration.value, 10) || 90;
    var end = new Date(start.getTime() + dur * 60000);
    var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    createAppointment({
      p_customer: f.customer.value, p_pest: f.pest.value.trim(), p_treatment: f.treatment.value.trim(),
      p_targets: f.targets.value.trim(), p_starts_at: start.toISOString(), p_ends_at: end.toISOString(),
      p_re_entry_hours: parseInt(f.reentry.value, 10) || 0, p_coverage_ends: null, p_notes: f.notes.value.trim()
    }, function () { btn.disabled = false; });
  }

  function onAddPerson(e) {
    e.preventDefault();
    var f = e.target;
    var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    addPerson({
      role: f.role.value, full_name: f.full_name.value.trim(), email: f.email.value.trim(),
      phone: f.phone.value.trim(), address: f.address.value.trim(), plan: f.plan.value.trim()
    }, function () { btn.disabled = false; });
  }

  /* ---------- Add-to-calendar (.ics) ---------- */
  function downloadICS(appt, c) {
    function z(iso) { return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"; }
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Serene Touch//Portal//EN", "BEGIN:VEVENT",
      "UID:" + appt.id + "@serenetouch", "DTSTAMP:" + z(new Date().toISOString()),
      "DTSTART:" + z(appt.start), "DTEND:" + z(appt.end),
      "SUMMARY:Serene Touch Pest Control — " + (appt.treatmentType || appt.pest),
      "DESCRIPTION:" + (appt.notes || ""), "LOCATION:" + (c.address || ""), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var a = el("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "serene-touch-appointment.ics";
    a.click();
    toast("Calendar file downloaded 📅");
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("is-show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("is-show"); }, 2800);
  }

  /* ================================================================
     ASSISTANT (customer only, data-aware)
  ================================================================ */
  var assistantReady = false;
  function initAssistant() {
    if (assistantReady || !ASSIST_APPT) return;
    assistantReady = true;
    var launcher = $("#assistantLauncher"), panel = $("#assistant"), closeBtn = $("#assistantClose");
    var body = $("#assistantBody"), input = $("#assistantInput"), sendBtn = $("#assistantSend"), chipsWrap = $("#assistantChips");
    var greeted = false;
    launcher.classList.remove("hidden");

    var QUICK = ["When is my appointment?", "How do I prepare?", "When is my revisit?", "Is it safe for my pets?", "I still see pests"];
    function open() { panel.classList.add("is-open"); launcher.classList.add("hidden"); if (!greeted) { greet(); greeted = true; } setTimeout(function () { input.focus(); }, 200); }
    function close() { panel.classList.remove("is-open"); launcher.classList.remove("hidden"); }
    launcher.addEventListener("click", open);
    closeBtn.addEventListener("click", close);

    function addMsg(text, who) { var m = el("div", "msg msg--" + who, text); body.appendChild(m); body.scrollTop = body.scrollHeight; return m; }
    function renderChips() { chipsWrap.innerHTML = ""; QUICK.forEach(function (q) { var b = el("button", "chip", q); b.addEventListener("click", function () { handle(q); }); chipsWrap.appendChild(b); }); }
    function greet() { addMsg("Hi " + escapeHtml(ASSIST_CUSTOMER.firstName) + "! 👋 I'm your Serene Touch assistant. I can see your account, so ask me anything about your <b>" + escapeHtml(ASSIST_APPT.pest.toLowerCase()) + " treatment</b>, your appointment, how to prepare, or what to expect.", "bot"); renderChips(); }
    function thinking(cb) { var t = el("div", "msg msg--bot", '<span class="typing"><span></span><span></span><span></span></span>'); body.appendChild(t); body.scrollTop = body.scrollHeight; setTimeout(function () { t.remove(); cb(); }, 460); }
    function handle(text) { addMsg(escapeHtml(text), "user"); thinking(function () { addMsg(respond(text), "bot"); renderChips(); }); }

    sendBtn.addEventListener("click", function () { var v = input.value.trim(); if (v) { handle(v); input.value = ""; } });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") sendBtn.click(); });
    renderChips();
  }

  function respond(raw) {
    var q = raw.toLowerCase();
    var s = ASSIST_APPT, c = ASSIST_CUSTOMER;
    var tName = techNameFor(s);
    var has = function () { for (var i = 0; i < arguments.length; i++) if (q.indexOf(arguments[i]) > -1) return true; return false; };
    // escaped copies of user-controlled fields (these get embedded into HTML replies)
    var pestL = escapeHtml(String(s.pest || "").toLowerCase());
    var treat = escapeHtml(s.treatmentType || "targeted treatment");
    var targ = escapeHtml(s.targets || "");
    var plan = escapeHtml(c.plan || "");
    var fname = escapeHtml(c.firstName || "");

    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(q)) return "Hello! How can I help with your " + pestL + " treatment today?";
    if (has("reschedule", "cancel", "change my appoint", "can't make", "cannot make", "move my appoint", "different day"))
      return "No problem — to reschedule or cancel, just call or text us at <a href='tel:+14389886709'>438-988-6709</a>. Your visit is currently " + relDays(s.start) + " on " + fmtFullDate(s.start) + ".";
    if (has("revisit", "re-visit", "follow up", "follow-up", "come back", "next visit", "second visit", "again", "check back"))
      return s.revisit ? "Your follow-up (revisit) is on <b>" + fmtFullDate(s.revisit) + "</b> — about two weeks after treatment. That gap lets the treatment work fully; at the revisit we check the results and re-treat free of charge if anything remains." : "Your revisit is booked about two weeks after your treatment. You'll see the exact date here once your visit is complete.";
    if (has("who is", "which tech", "technician", "who's coming", "who is coming"))
      return tName ? "Your technician is <b>" + escapeHtml(tName) + "</b>. They'll handle your " + pestL + " treatment on " + fmtDate(s.start) + "." : "A technician will be assigned to your visit shortly — you'll see their name here once they're scheduled.";
    if (has("appointment", "appoint", "coming", "arrive", "when are you", "when is the", "schedule", "what time", "what day"))
      return "Your next treatment is <b>" + fmtFullDate(s.start) + "</b> from " + fmtTime(s.start) + " to " + fmtTime(s.end) + " (about 90 minutes)" + (tName ? ", with " + escapeHtml(tName) : "") + " — that's " + relDays(s.start) + ". You can tap “Add to calendar” on your appointment card.";
    if (has("prepare", "prep", "ready", "before you", "before the", "do before", "get ready", "what do i do", "what should i do"))
      return "Great question! For your " + pestL + " visit, the key steps are: " + previewPrep(s.pest) + " You'll find the full, tickable checklist in the <b>How to Prepare</b> card — it saves your progress as you go.";
    if (has("safe", "pet", "dog", "cat", "fish", "kid", "child", "baby", "pregnan", "toxic", "harmful", "danger"))
      return "Our products are eco-friendly, low-toxic, and family &amp; pet safe. ✅ Just keep children and pets out of treated areas for about <b>" + s.reEntryHours + " hours</b> after the visit, then open a few windows to ventilate. If you have a fish tank, cover it and turn off the air pump during treatment.";
    if (has("treatment", "using", "product", "chemical", "spray", "method", "what kind", "how do you treat"))
      return "For your " + pestL + ", we're using a <b>" + treat + "</b>" + (s.targets ? ", focused mainly on your " + targ : "") + ". It targets pests at the source while staying safe for your home.";
    if (has("plan", "coverage", "cover", "guarantee", "warranty", "expire", "protected until", "how long am i", "when does my plan", "end"))
      return "You're on the <b>" + plan + "</b>" + (s.coverageEnds ? ", with coverage through <b>" + fmtDate(s.coverageEnds) + "</b>" : "") + ". While you're covered, if pests come back between visits we return and re-treat at no extra cost.";
    if (has("how long", "duration", "take", "last", "long will", "long does"))
      return "The treatment visit takes about <b>90 minutes</b> (" + fmtTime(s.start) + "–" + fmtTime(s.end) + "). After that, the treatment keeps working over the next 1–2 weeks until your revisit.";
    if (has("still see", "still seeing", "still have", "more bug", "came back", "not working", "didn't work", "dead", "seeing more", "increase"))
      return DATA.aftercareByPest[s.pest] || ("Some activity right after treatment can be normal." + (s.revisit ? " If it continues past your revisit on " + fmtDate(s.revisit) + ", call us at 438-988-6709 and we'll come back." : " If it continues, call us at 438-988-6709 and we'll come back."));
    if (has("cost", "price", "pay", "invoice", "bill", "charge", "how much", "fee"))
      return "Billing for your " + plan + " follows your service agreement. For an invoice or any billing question, call us at <a href='tel:+14389886709'>438-988-6709</a> and we'll sort it out right away.";
    if (has("human", "person", "call", "phone", "speak", "representative", "agent", "contact", "talk to"))
      return "You can reach the Serene Touch team at <a href='tel:+14389886709'>438-988-6709</a> or <a href='mailto:support@serenetouch.ca'>support@serenetouch.ca</a> — Mon–Sat, 8am–7pm.";
    if (has("thank", "thx", "appreciate", "great", "awesome", "perfect")) return "You're very welcome, " + fname + "! 🐾 Anything else I can help with?";
    if (has("address", "where", "location", "my place", "my home")) return "We have your service address as <b>" + escapeHtml(c.address || "the address on file") + "</b>. If that's not right, let us know at 438-988-6709.";
    return "I can help with your <b>appointment</b>, how to <b>prepare</b>, your <b>treatment</b>, your <b>revisit</b>, plan coverage, and safety. Try a quick question below — or for anything else, call us at <a href='tel:+14389886709'>438-988-6709</a>.";
  }
  function previewPrep(pest) {
    var list = (DATA.prepByPest[pest] || []).slice(0, 2).map(function (t) { return t.replace(/\.$/, "").toLowerCase(); });
    return list.join("; ") + "; and clear access to baseboards and under sinks.";
  }

  /* ================================================================
     WRITE ACTIONS  (dispatch real RPC vs demo localStorage)
  ================================================================ */
  function advanceJob(id, status) {
    if (MODE === "real") {
      sb.rpc("advance_status", { p_appt: id, p_status: status }).then(function (r) {
        if (r.error) { toast(r.error.message || "Update failed"); renderTechnician(); return; }
        toast(status === "Completed" ? "Visit completed — revisit booked 🎉" : "Status updated: " + status);
        reloadThenRender();
      });
    } else { demoAdvance(id, status); renderTechnician(); }
  }
  function saveNotes(id, notes) {
    if (MODE === "real") {
      sb.rpc("save_notes", { p_appt: id, p_notes: notes }).then(function (r) { toast(r.error ? (r.error.message || "Save failed") : "Note saved"); });
    } else { demoPatch(id, { notes: notes }); toast("Note saved"); }
  }
  function savePrep(id, prep) {
    if (MODE === "real") { sb.rpc("set_prep", { p_appt: id, p_prep: prep }).then(function (r) { if (r.error) toast("Couldn't save prep"); }); }
    else { demoPatch(id, { prepDone: prep }); }
  }
  function assignTech(id, techId) {
    if (MODE === "real") {
      sb.rpc("assign_tech", { p_appt: id, p_tech: techId }).then(function (r) {
        if (r.error) { toast(r.error.message || "Assign failed"); renderAdmin(); return; }
        toast(techId ? "Assigned to " + firstWord((techById(techId) || {}).name) : "Set to unassigned");
        reloadThenRender();
      });
    } else {
      var patch = { technicianId: techId, technicianName: techId ? (techById(techId) || {}).name : null };
      var appt = getAppointments().filter(function (a) { return a.id === id; })[0];
      if (techId && appt.status === "Unassigned") patch.status = "Scheduled";
      if (!techId) patch.status = "Unassigned";
      demoPatch(id, patch); toast(techId ? "Assigned" : "Set to unassigned"); renderAdmin();
    }
  }
  function createAppointment(args, done) {
    if (MODE === "real") {
      sb.rpc("create_appointment", args).then(function (r) {
        done && done();
        if (r.error) { toast(r.error.message || "Could not create"); return; }
        toast("Appointment created ✅");
        reloadThenRender();
      });
    } else {
      var c = customerById(args.p_customer) || STATE.customers[0];
      var id = "A" + (Date.now());
      STATE.appointments.push({ id: id, customerId: args.p_customer, technicianId: null, technicianName: null, pest: args.p_pest, treatmentType: args.p_treatment, targets: args.p_targets, start: args.p_starts_at, end: args.p_ends_at, status: "Unassigned", revisit: null, coverageEnds: null, reEntryHours: args.p_re_entry_hours, notes: args.p_notes, prepDone: {} });
      done && done(); toast("Appointment created (demo)"); renderAdmin();
    }
  }
  function addPerson(payload, done) {
    if (MODE !== "real" || !CFG.manageAccountUrl) { done && done(); toast("Connect Supabase + the manage-account function to add people"); return; }
    sb.auth.getSession().then(function (res) {
      var token = res.data.session ? res.data.session.access_token : "";
      fetch(CFG.manageAccountUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (out) {
          done && done();
          if (!out.ok) { toast(out.j.error || "Could not create login"); return; }
          toast("Login created — invite emailed ✅");
          reloadThenRender();
        }).catch(function () { done && done(); toast("Network error"); });
    });
  }

  /* ---- demo persistence (localStorage), only in demo mode ---- */
  var DEMO_KEY = "serene_portal_demo_overrides";
  function demoLoad() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || {}; } catch (e) { return {}; } }
  function demoPatch(id, patch) {
    var o = demoLoad(); o[id] = Object.assign({}, o[id], patch); localStorage.setItem(DEMO_KEY, JSON.stringify(o));
    var a = getAppointments().filter(function (x) { return x.id === id; })[0]; if (a) Object.assign(a, patch);
  }
  function demoAdvance(id, status) {
    var patch = { status: status };
    if (status === "Completed") { patch.revisit = addDaysISO(new Date().toISOString(), 14); }
    demoPatch(id, patch);
  }

  /* ================================================================
     EDIT MODAL + EXTENDED ACTIONS (edit / cancel / delete / profiles)
  ================================================================ */
  var IC_REFRESH = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/></svg>';
  function dateInputVal(d) { d = new Date(d); var m = d.getMonth() + 1, day = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day); }
  function timeInputVal(d) { d = new Date(d); var h = d.getHours(), mi = d.getMinutes(); return (h < 10 ? "0" + h : h) + ":" + (mi < 10 ? "0" + mi : mi); }

  function openForm(opts) {
    var overlay = el("div", "pmodal");
    var fieldsHtml = (opts.fields || []).map(function (f) {
      var inner;
      if (f.type === "select")
        inner = '<select name="' + f.name + '"' + (f.required ? " required" : "") + '>' + (f.options || []).map(function (o) { return '<option value="' + escapeHtml(o.value) + '"' + (o.value === f.value ? " selected" : "") + ">" + escapeHtml(o.label) + "</option>"; }).join("") + "</select>";
      else if (f.type === "textarea")
        inner = '<textarea name="' + f.name + '" rows="2" placeholder="' + escapeHtml(f.placeholder || "") + '">' + escapeHtml(f.value || "") + "</textarea>";
      else
        inner = '<input name="' + f.name + '" type="' + (f.type || "text") + '"' + (f.required ? " required" : "") + (f.step ? ' step="' + f.step + '"' : "") + (f.min != null ? ' min="' + f.min + '"' : "") + ' value="' + escapeHtml(f.value == null ? "" : f.value) + '" placeholder="' + escapeHtml(f.placeholder || "") + '" />';
      return '<label class="field' + (f.full ? " field--full" : "") + '"><span>' + escapeHtml(f.label) + "</span>" + inner + "</label>";
    }).join("");
    overlay.innerHTML =
      '<div class="pmodal__card"><div class="pmodal__head"><h3>' + escapeHtml(opts.title) + '</h3><button class="pmodal__close" type="button" aria-label="Close">&times;</button></div>' +
      '<form class="admin-form pmodal__form"><div class="admin-form__grid">' + fieldsHtml + '</div><p class="pmodal__err" role="alert"></p>' +
      '<div class="pmodal__actions"><button type="button" class="btn btn--ghost pmodal__cancel">Cancel</button>' +
      '<button type="submit" class="btn btn--primary">' + escapeHtml(opts.submitLabel || "Save") + "</button></div></form></div>";
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    overlay.querySelector(".pmodal__close").addEventListener("click", close);
    overlay.querySelector(".pmodal__cancel").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    var errEl = overlay.querySelector(".pmodal__err");
    overlay.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var values = {}; (opts.fields || []).forEach(function (f) { values[f.name] = (e.target[f.name] || {}).value; });
      opts.onSubmit(values, close, function (m) { errEl.textContent = m || ""; });
    });
    setTimeout(function () { var first = overlay.querySelector("input,select,textarea"); if (first) first.focus(); }, 50);
  }

  function updateAppointment(id, args, done) {
    if (MODE === "real") {
      sb.rpc("update_appointment", Object.assign({ p_appt: id }, args)).then(function (r) {
        done && done();
        if (r.error) { toast(r.error.message || "Update failed"); return; }
        toast("Appointment updated ✅"); reloadThenRender();
      });
    } else {
      demoPatch(id, { pest: args.p_pest, treatmentType: args.p_treatment, targets: args.p_targets, start: args.p_starts_at, end: args.p_ends_at, reEntryHours: args.p_re_entry_hours, coverageEnds: args.p_coverage_ends, revisit: args.p_revisit, notes: args.p_notes });
      done && done(); toast("Appointment updated (demo)"); rerenderCurrent();
    }
  }
  function deleteAppointment(id) {
    if (MODE === "real") {
      sb.rpc("delete_appointment", { p_appt: id }).then(function (r) {
        if (r.error) { toast(r.error.message || "Delete failed"); return; }
        toast("Appointment deleted"); reloadThenRender();
      });
    } else {
      STATE.appointments = STATE.appointments.filter(function (a) { return a.id !== id; });
      var o = demoLoad(); delete o[id]; localStorage.setItem(DEMO_KEY, JSON.stringify(o));
      toast("Appointment deleted (demo)"); rerenderCurrent();
    }
  }
  function cancelAppointment(id) {
    if (MODE === "real") {
      sb.rpc("advance_status", { p_appt: id, p_status: "Cancelled" }).then(function (r) {
        if (r.error) { toast(r.error.message || "Couldn't cancel"); return; }
        toast("Appointment cancelled"); reloadThenRender();
      });
    } else { demoPatch(id, { status: "Cancelled" }); toast("Appointment cancelled (demo)"); rerenderCurrent(); }
  }
  function editProfile(id, args, done) {
    if (MODE === "real") {
      sb.rpc("upsert_profile_details", Object.assign({ p_id: id }, args)).then(function (r) {
        done && done();
        if (r.error) { toast(r.error.message || "Update failed"); return; }
        toast("Details updated ✅"); reloadThenRender();
      });
    } else {
      var who = STATE.customers.concat(STATE.technicians).filter(function (p) { return p.id === id; })[0];
      if (who) { if (args.p_full_name) { who.name = args.p_full_name; who.firstName = firstWord(args.p_full_name); who.initials = initials(args.p_full_name); } if (args.p_phone != null) who.phone = args.p_phone; if (args.p_address != null) who.address = args.p_address; if (args.p_plan != null) who.plan = args.p_plan; }
      done && done(); toast("Details updated (demo)"); rerenderCurrent();
    }
  }

  function openEditAppt(a) {
    var start = a.start ? new Date(a.start) : new Date();
    var durMin = (a.end && a.start) ? Math.max(15, Math.round((new Date(a.end) - new Date(a.start)) / 60000)) : 90;
    openForm({
      title: "Edit appointment", submitLabel: "Save changes",
      fields: [
        { name: "pest", label: "Pest", value: a.pest, required: true },
        { name: "treatment", label: "Treatment", value: a.treatmentType },
        { name: "targets", label: "Focus area", value: a.targets },
        { name: "date", label: "Date", type: "date", value: dateInputVal(start), required: true },
        { name: "time", label: "Time", type: "time", value: timeInputVal(start), required: true },
        { name: "duration", label: "Duration (min)", type: "number", min: 15, step: 15, value: durMin },
        { name: "reentry", label: "Re-entry (hours)", type: "number", min: 0, value: a.reEntryHours || 0 },
        { name: "revisit", label: "Revisit date", type: "date", value: a.revisit ? dateInputVal(new Date(a.revisit)) : "" },
        { name: "notes", label: "Notes", type: "textarea", value: a.notes, full: true }
      ],
      onSubmit: function (v, close, setErr) {
        if (!v.date || !v.time) { setErr("Date and time are required."); return; }
        var s = new Date(v.date + "T" + v.time);
        var e = new Date(s.getTime() + (parseInt(v.duration, 10) || 90) * 60000);
        updateAppointment(a.id, {
          p_pest: (v.pest || "").trim(), p_treatment: (v.treatment || "").trim(), p_targets: (v.targets || "").trim(),
          p_starts_at: s.toISOString(), p_ends_at: e.toISOString(), p_re_entry_hours: parseInt(v.reentry, 10) || 0,
          p_coverage_ends: a.coverageEnds || null, p_revisit: v.revisit ? new Date(v.revisit + "T09:00").toISOString() : null,
          p_notes: (v.notes || "").trim()
        }, close);
      }
    });
  }
  function openEditCustomer(p) {
    openForm({
      title: "Edit " + (p.name || "person"), submitLabel: "Save",
      fields: [
        { name: "full_name", label: "Full name", value: p.name },
        { name: "phone", label: "Phone", value: p.phone },
        { name: "address", label: "Address", value: p.address, full: true },
        { name: "plan", label: "Plan", value: p.plan }
      ],
      onSubmit: function (v, close) {
        editProfile(p.id, { p_full_name: (v.full_name || "").trim(), p_phone: (v.phone || "").trim(), p_address: (v.address || "").trim(), p_plan: (v.plan || "").trim(), p_role: null }, close);
      }
    });
  }

  /* ---- admin: customers management panel ---- */
  function renderAdminCustomers() {
    var card = $("#adminCustomersCard");
    if (!card) {
      card = el("section", "card card--wide"); card.id = "adminCustomersCard";
      card.innerHTML = '<div class="card__head"><span class="card__icon" aria-hidden="true">' + IC.user + '</span><h2>Customers</h2><span class="card__hint">Tap Edit to update contact details</span></div><div id="adminCustomersList"></div>';
      var techsCard = $("#adminTechs").closest(".card");
      techsCard.parentNode.insertBefore(card, techsCard);
    }
    var list = $("#adminCustomersList"); list.innerHTML = "";
    if (!STATE.customers.length) { list.innerHTML = '<p class="muted-note">No customers yet. Customers appear here once they register or you add them.</p>'; return; }
    STATE.customers.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }).forEach(function (c) {
      var row = el("div", "cust-item");
      row.innerHTML = '<span class="avatar avatar--sm">' + c.initials + "</span>" +
        '<div class="cust-item__info"><strong>' + escapeHtml(c.name) + "</strong><small>" + escapeHtml(c.phone || "no phone") + (c.address ? " · " + escapeHtml(cityOf(c.address)) : "") + "</small></div>" +
        '<span class="cust-item__plan">' + escapeHtml(c.plan || "—") + "</span>" +
        '<button class="btn btn--ghost btn--sm" data-edit="' + c.id + '">Edit</button>';
      list.appendChild(row);
    });
    list.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { var c = customerById(b.getAttribute("data-edit")); if (c) openEditCustomer(c); });
    });
  }

  /* ---- customer: list of all upcoming visits (when more than one) ---- */
  function renderCustomerUpcoming(custId) {
    var ups = getAppointments().filter(function (a) { return a.customerId === custId && a.status !== "Completed" && a.status !== "Cancelled"; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var card = $("#custUpcomingCard");
    if (ups.length <= 1) { if (card) card.remove(); return; }
    if (!card) {
      card = el("section", "card card--wide"); card.id = "custUpcomingCard";
      card.innerHTML = '<div class="card__head"><span class="card__icon" aria-hidden="true">' + IC.calendar + '</span><h2>Your upcoming visits</h2></div><div id="custUpcomingList"></div>';
      var grid = $("#customerView .grid"); grid.parentNode.insertBefore(card, grid);
    }
    var list = $("#custUpcomingList"); list.innerHTML = "";
    ups.forEach(function (a) {
      var row = el("div", "up-item");
      row.innerHTML = '<div class="up-item__date"><strong>' + fmtDateShort(a.start) + "</strong><span>" + fmtTime(a.start) + "</span></div>" +
        '<div class="up-item__body"><strong>' + escapeHtml(a.pest) + "</strong><small>" + escapeHtml(a.treatmentType || "Treatment") + " · " + relDays(a.start) + "</small></div>" + badge(a.status);
      list.appendChild(row);
    });
  }

  /* ---- refresh button in the app bar ---- */
  function ensureRefreshBtn() {
    if ($("#refreshBtn")) return;
    var so = $("#signOutBtn"); if (!so) return;
    var b = el("button", "btn btn--ghost btn--sm refresh-btn"); b.id = "refreshBtn"; b.type = "button"; b.title = "Refresh"; b.setAttribute("aria-label", "Refresh"); b.innerHTML = IC_REFRESH;
    so.parentNode.insertBefore(b, so);
    b.addEventListener("click", function () { b.classList.add("is-spin"); reloadThenRender(); toast("Refreshed"); setTimeout(function () { b.classList.remove("is-spin"); }, 700); });
  }

  /* ---- realtime: live updates across users ---- */
  var rtChannel = null, reloadTimer = null;
  function scheduleReload() { clearTimeout(reloadTimer); reloadTimer = setTimeout(function () { reloadThenRender(); }, 450); }
  function subscribeRealtime() {
    if (MODE !== "real" || rtChannel || !sb.channel) return;
    try {
      rtChannel = sb.channel("serene-appts")
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, scheduleReload)
        .subscribe();
    } catch (e) { /* realtime optional */ }
  }

  /* ================================================================
     DATA LOADING (real mode)
  ================================================================ */
  function buildHistoryFromAppointments() {
    STATE.history = {};
    getAppointments().forEach(function (a) {
      if (a.status === "Completed" || new Date(a.start) < startOfDay(new Date())) {
        (STATE.history[a.customerId] = STATE.history[a.customerId] || []).push({
          date: a.start, pest: a.pest, treatmentType: a.treatmentType, technician: a.technicianName, result: a.result
        });
      }
    });
  }

  function loadForSession(user) {
    return sb.from("profiles").select("*").eq("id", user.id).single().then(function (meRes) {
      if (meRes.error || !meRes.data) { if (window.console && console.error) console.error("[portal] profile query:", meRes.error); throw new Error("Account profile not found. If you're the owner, re-run supabase/schema.sql, then sign in again."); }
      STATE.me = mapProfile(meRes.data);
      STATE.role = meRes.data.role;

      if (STATE.role === "customer") {
        STATE.customers = [STATE.me];
        return sb.from("appointments").select("*").eq("customer_id", user.id).order("starts_at").then(function (ar) {
          STATE.appointments = (ar.data || []).map(mapAppt);
          buildHistoryFromAppointments();
        });
      }
      if (STATE.role === "technician") {
        return sb.from("appointments").select("*").eq("technician_id", user.id).order("starts_at").then(function (ar) {
          STATE.appointments = (ar.data || []).map(mapAppt);
          var ids = uniq(STATE.appointments.map(function (a) { return a.customerId; }));
          if (!ids.length) { STATE.customers = []; return; }
          return sb.from("profiles").select("*").in("id", ids).then(function (cr) {
            STATE.customers = (cr.data || []).map(mapProfile);
          });
        });
      }
      // admin
      return sb.from("profiles").select("*").then(function (pr) {
        var profs = pr.data || [];
        STATE.customers = profs.filter(function (p) { return p.role === "customer"; }).map(mapProfile);
        STATE.technicians = profs.filter(function (p) { return p.role === "technician"; }).map(mapProfile);
        return sb.from("appointments").select("*").order("starts_at").then(function (ar) {
          STATE.appointments = (ar.data || []).map(mapAppt);
        });
      });
    });
  }

  function reloadThenRender() {
    if (MODE !== "real" || !currentUserId) { rerenderCurrent(); return; }
    loadForSession({ id: currentUserId }).then(rerenderCurrent).catch(function (e) { toast(e.message || "Reload failed"); });
  }
  function rerenderCurrent() {
    if (STATE.role === "customer") renderCustomer();
    else if (STATE.role === "technician") renderTechnician();
    else if (STATE.role === "admin") renderAdmin();
  }

  /* ================================================================
     AUTH (real mode)
  ================================================================ */
  function setMsg(text, isErr) {
    var e = $("#loginError");
    if (e) { e.textContent = text || ""; e.style.color = isErr ? "" : "var(--green, #16a34a)"; }
  }

  function wireRealAuth() {
    // Hide demo-only UI
    document.querySelectorAll(".demo-flag").forEach(function (n) { n.style.display = "none"; });
    var demoBox = $(".login__demo"); if (demoBox) demoBox.style.display = "none";

    var form = $("#loginForm");
    var submitBtn = form.querySelector('button[type="submit"]');
    var mode = "signin";   // "signin" | "signup"

    // --- Continue with Google (only shown once Google is enabled in Supabase) ---
    var GOOGLE_SVG = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95L3.97 7.3C4.68 5.17 6.66 3.58 9 3.58z"/></svg>';
    var oauth = el("div", "login__oauth");
    oauth.innerHTML = '<div class="login__divider"><span>or</span></div>';
    var googleBtn = el("button", "btn btn--ghost btn--block login__google", GOOGLE_SVG + "<span>Continue with Google</span>");
    googleBtn.type = "button";
    oauth.appendChild(googleBtn);
    oauth.style.display = "none";   // revealed only if the provider is enabled
    form.appendChild(oauth);
    googleBtn.addEventListener("click", function () {
      setMsg("Redirecting to Google…");
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } })
        .then(function (r) { if (r.error) setMsg(r.error.message || "Google sign-in isn't available yet.", true); });
    });
    // ask the auth server which providers are on, reveal the button if Google is
    fetch(CFG.url + "/auth/v1/settings", { headers: { apikey: CFG.anonKey } })
      .then(function (r) { return r.json(); })
      .then(function (s) { if (s && s.external && s.external.google) oauth.style.display = ""; })
      .catch(function () {});

    // --- magic link (passwordless sign-in for existing users) ---
    var magic = el("button", "btn btn--ghost btn--block", "Email me a sign-in link");
    magic.type = "button"; magic.style.marginTop = "10px";
    form.appendChild(magic);
    magic.addEventListener("click", function () {
      var email = ($("#loginEmail").value || "").trim().toLowerCase();
      if (!email) { setMsg("Enter your email first, then tap the link button.", true); return; }
      magic.disabled = true;
      sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } })
        .then(function (r) { magic.disabled = false; setMsg(r.error ? r.error.message : "Check your email for a sign-in link ✉️", !!r.error); });
    });

    // --- sign in <-> create account toggle ---
    var toggle = el("p", "login__toggle");
    toggle.innerHTML = '<span id="toggleText">New customer?</span> <a href="#" id="toggleLink">Create an account</a>';
    form.appendChild(toggle);
    function setMode(m) {
      mode = m;
      submitBtn.textContent = (m === "signup") ? "Create account" : "Sign In";
      $("#toggleText").textContent = (m === "signup") ? "Already have an account?" : "New customer?";
      $("#toggleLink").textContent = (m === "signup") ? "Sign in instead" : "Create an account";
      setMsg("");
    }
    $("#toggleLink").addEventListener("click", function (ev) { ev.preventDefault(); setMode(mode === "signin" ? "signup" : "signin"); });

    // --- forgot password ---
    var forgot = $(".login__row a");
    if (forgot) {
      forgot.setAttribute("href", "#");
      forgot.addEventListener("click", function (ev) {
        ev.preventDefault();
        var email = ($("#loginEmail").value || "").trim().toLowerCase();
        if (!email) { setMsg("Enter your email, then tap “Forgot password”.", true); return; }
        sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
          .then(function (r) { setMsg(r.error ? r.error.message : "Password reset link sent ✉️", !!r.error); });
      });
    }

    // --- submit: sign in OR create account ---
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = ($("#loginEmail").value || "").trim().toLowerCase();
      var pass = $("#loginPassword").value || "";
      if (!email || !pass) { setMsg("Enter your email and password.", true); return; }

      if (mode === "signup") {
        setMsg("Creating your account…");
        sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } })
          .then(function (r) {
            if (r.error) {
              if (window.console && console.error) console.error("[portal] sign-up error:", r.error);
              setMsg(r.error.message || "Couldn't create your account.", true);
              return;
            }
            if (r.data && r.data.session) { enter(r.data.session); }                       // email confirmation off → straight in
            else { setMsg("Account created — check your email to confirm, then sign in. ✉️", false); setMode("signin"); }
          });
        return;
      }

      setMsg("Signing in…");
      sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
        if (r.error) {
          if (window.console && console.error) console.error("[portal] sign-in error:", r.error);
          setMsg(r.error.message || "Sign-in failed — check your email and password.", true);
          return;
        }
        if (r.data && r.data.session) enter(r.data.session);   // route immediately on success
      }).catch(function (err) {
        if (window.console && console.error) console.error("[portal] sign-in threw:", err);
        setMsg("Couldn't reach the server. Check your connection and try again.", true);
      });
    });

    var soBtn = $("#signOutBtn");
    if (soBtn) soBtn.addEventListener("click", function () { shownFor = null; currentUserId = null; sb.auth.signOut(); });
  }

  var shownFor = null, loadingFor = null;
  function enter(session) {
    if (!session || !session.user) { currentUserId = null; shownFor = null; showLogin(); return; }
    var uid = session.user.id;
    if (shownFor === uid || loadingFor === uid) return;   // already showing / loading this user
    loadingFor = uid; currentUserId = uid;
    setMsg("Loading your dashboard…");
    loadForSession(session.user).then(function () {
      loadingFor = null; shownFor = uid; setMsg(""); routeTo(STATE.role); subscribeRealtime();
    }).catch(function (e) {
      // reset so the user can simply try again (no stranded "Signing in…")
      loadingFor = null; shownFor = null; currentUserId = null;
      if (window.console && console.error) console.error("[portal] load failed:", e);
      setMsg((e && e.message) ? e.message : "Couldn't load your account. Please try again.", true);
      showLogin();
    });
  }

  function wireAuthEvents() {
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === "PASSWORD_RECOVERY") {
        var pw = window.prompt("Set a new password (at least 6 characters):");
        if (pw) sb.auth.updateUser({ password: pw }).then(function (r) { alert(r.error ? r.error.message : "Password updated — you're signed in."); });
        return;
      }
      if (event === "SIGNED_OUT") { currentUserId = null; shownFor = null; showLogin(); return; }
      if (session) enter(session);   // SIGNED_IN / INITIAL_SESSION / TOKEN_REFRESHED / USER_UPDATED
    });
  }

  /* ================================================================
     DEMO MODE
  ================================================================ */
  function loadDemoState(role) {
    STATE.role = role;
    STATE.technicians = DATA.technicians.map(function (t) { return { id: t.id, name: t.name, firstName: t.firstName, initials: t.initials, phone: t.phone }; });
    STATE.customers = DATA.customers.map(function (c) { return { id: c.id, name: c.name, firstName: c.firstName, email: c.email, phone: c.phone, address: c.address, plan: c.plan, initials: initials(c.name) }; });
    var o = demoLoad();
    STATE.appointments = DATA.appointments.map(function (a) {
      var prep = {};
      return Object.assign({
        id: a.id, customerId: a.customerId, technicianId: a.technicianId,
        technicianName: a.technicianId ? (DATA.technicians.filter(function (t) { return t.id === a.technicianId; })[0] || {}).name : null,
        pest: a.pest, treatmentType: a.treatmentType, targets: a.targets, start: a.start, end: a.end,
        status: a.status, revisit: a.revisit, coverageEnds: a.coverageEnds, reEntryHours: a.reEntryHours, notes: a.notes, prepDone: prep
      }, o[a.id] || {});
    });
    STATE.history = DATA.history;
    if (role === "customer") STATE.me = STATE.customers.filter(function (c) { return c.id === "C1"; })[0];
    else if (role === "technician") { var t = STATE.technicians.filter(function (x) { return x.id === "T1"; })[0]; STATE.me = { id: t.id, name: t.name, firstName: t.firstName, initials: t.initials }; }
    else STATE.me = { id: "A1", name: "Operations Admin", firstName: "Admin", initials: "AD", plan: "" };
  }

  function wireDemo() {
    var form = $("#loginForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = ($("#loginEmail").value || "").trim().toLowerCase();
      var pass = $("#loginPassword").value || "";
      var acct = DATA.accounts.filter(function (a) { return a.email === email && a.password === pass; })[0];
      if (acct) { setMsg(""); loadDemoState(acct.role); routeTo(acct.role); }
      else { setMsg("Incorrect email or password. Try a demo dashboard below.", true); }
    });
    document.querySelectorAll(".role-demo").forEach(function (btn) {
      btn.addEventListener("click", function () { var role = btn.getAttribute("data-role"); loadDemoState(role); routeTo(role); });
    });
    var soBtn = $("#signOutBtn");
    if (soBtn) soBtn.addEventListener("click", function () { currentUserId = null; showLogin(); });
  }

  /* ================================================================
     SETUP MODE (no keys yet)
  ================================================================ */
  function showSetup() {
    var card = $(".login__card");
    card.innerHTML =
      '<a href="index.html" class="logo login__logo"><span class="logo__mark">S</span>' +
      '<span class="logo__text"><span class="logo__name">SERENE TOUCH</span><span class="logo__sub">PEST CONTROL SERVICES</span></span></a>' +
      '<h1 class="login__title">Portal not connected yet</h1>' +
      '<p class="login__sub">To switch on real, secure logins for customers, technicians, and admins, connect a free Supabase project.</p>' +
      '<ol style="text-align:left;line-height:1.7;margin:18px 0;padding-left:20px;color:#475569">' +
      '<li>Create a project at <b>supabase.com</b></li>' +
      '<li>Run <code>supabase/schema.sql</code> then <code>supabase/policies.sql</code></li>' +
      '<li>Paste your URL + anon key into <code>js/supabase-config.js</code></li>' +
      "</ol>" +
      '<p class="login__sub">Full guide: <b>PORTAL-SETUP.md</b></p>' +
      '<a class="btn btn--primary btn--block" href="?demo=1">Explore the demo instead →</a>' +
      '<a href="index.html" class="login__back">← Back to website</a>';
    showLogin();
  }

  /* ================================================================
     BOOT
  ================================================================ */
  if (MODE === "setup") {
    showSetup();
  } else if (MODE === "demo") {
    wireDemo();
    showLogin();
  } else {
    sb = window.supabase.createClient(CFG.url, CFG.anonKey);
    wireRealAuth();
    wireAuthEvents();
    sb.auth.getSession().then(function (r) { if (r.data.session) enter(r.data.session); else showLogin(); });
  }
})();
