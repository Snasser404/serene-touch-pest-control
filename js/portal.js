/* ===================================================================
   Serene Touch — Customer Portal logic  (customer / technician / admin)
   -------------------------------------------------------------------
   NOTE: This is a front-end DEMO. The "login" is checked in the browser
   only and is NOT secure, and all demo users share the same sample data.
   Before using with real people, replace the auth + data layer with a
   real backend (see README). The workflow actions below persist to
   localStorage so switching roles shows the effects of each other's work.
=================================================================== */
(function () {
  "use strict";

  var DATA = window.SERENE_PORTAL_DATA;
  var SESSION_KEY = "serene_portal_session";   // { role, refId, email }
  var APPT_KEY = "serene_portal_appts";        // appointment overrides by id
  function prepKey(apptId) { return "serene_portal_prep_" + apptId; }

  /* ---------- tiny helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
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
     STORE  (base data + saved workflow overrides)
  ================================================================ */
  function loadOverrides() { try { return JSON.parse(localStorage.getItem(APPT_KEY)) || {}; } catch (e) { return {}; } }
  function saveOverride(id, patch) {
    var o = loadOverrides();
    o[id] = Object.assign({}, o[id], patch);
    localStorage.setItem(APPT_KEY, JSON.stringify(o));
  }
  function getAppointments() {
    var o = loadOverrides();
    return DATA.appointments.map(function (a) { return Object.assign({}, a, o[a.id] || {}); });
  }
  function customerById(id) { return DATA.customers.filter(function (c) { return c.id === id; })[0]; }
  function techById(id) { return id ? DATA.technicians.filter(function (t) { return t.id === id; })[0] : null; }
  function prepTotalFor(pest) { return (DATA.prepByPest[pest] || []).length + DATA.generalPrep.length; }
  function prepDoneFor(apptId) {
    try {
      var s = JSON.parse(localStorage.getItem(prepKey(apptId))) || {};
      return Object.keys(s).filter(function (k) { return s[k]; }).length;
    } catch (e) { return 0; }
  }

  /* status meta -> label + css modifier */
  function statusMeta(status) {
    var map = {
      "Unassigned": "unassigned",
      "Scheduled": "scheduled",
      "En route": "route",
      "In progress": "progress",
      "Completed": "done"
    };
    return map[status] || "scheduled";
  }
  function badge(status) { return '<span class="badge badge--' + statusMeta(status) + '">' + status + "</span>"; }

  /* ================================================================
     AUTH + ROUTING
  ================================================================ */
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
  function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function signOut() { localStorage.removeItem(SESSION_KEY); location.reload(); }

  var loginView = $("#loginView");
  var appShell = $("#appShell");
  var views = { customer: $("#customerView"), technician: $("#techView"), admin: $("#adminView") };

  function showLogin() {
    appShell.classList.add("hidden");
    loginView.classList.remove("hidden");
  }
  function route() {
    var s = getSession();
    if (!s) { showLogin(); return; }
    loginView.classList.add("hidden");
    appShell.classList.remove("hidden");
    Object.keys(views).forEach(function (k) { views[k].classList.toggle("hidden", k !== s.role); });
    setAppbar(s);
    if (s.role === "customer") renderCustomer(s);
    else if (s.role === "technician") renderTechnician(s);
    else renderAdmin(s);
  }

  function setAppbar(s) {
    var name = "User", role = "", sub = "PORTAL", av = "ST";
    if (s.role === "customer") {
      var c = customerById(s.refId);
      name = c.name; role = c.plan; sub = "CUSTOMER PORTAL"; av = initials(c.name);
    } else if (s.role === "technician") {
      var t = techById(s.refId);
      name = t.name; role = "Technician"; sub = "TECHNICIAN PORTAL"; av = t.initials;
    } else {
      name = "Operations Admin"; role = "Administrator"; sub = "ADMIN CONSOLE"; av = "AD";
    }
    $("#userName").textContent = name;
    $("#userRole").textContent = role;
    $("#appbarSub").textContent = sub;
    $("#userAvatar").textContent = av;
  }
  function initials(name) { return name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }

  // Login form (matches a demo account)
  var form = $("#loginForm"), errEl = $("#loginError");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = ($("#loginEmail").value || "").trim().toLowerCase();
      var pass = $("#loginPassword").value || "";
      var acct = DATA.accounts.filter(function (a) { return a.email === email && a.password === pass; })[0];
      if (acct) { errEl.textContent = ""; setSession({ role: acct.role, refId: acct.refId, email: acct.email }); route(); }
      else { errEl.textContent = "Incorrect email or password. Try a demo dashboard below."; }
    });
  }
  // Role demo buttons
  Array.prototype.forEach.call(document.querySelectorAll(".role-demo"), function (btn) {
    btn.addEventListener("click", function () {
      var role = btn.getAttribute("data-role");
      var acct = DATA.accounts.filter(function (a) { return a.role === role; })[0];
      if (acct) { setSession({ role: acct.role, refId: acct.refId, email: acct.email }); route(); }
    });
  });
  var soBtn = $("#signOutBtn");
  if (soBtn) soBtn.addEventListener("click", signOut);

  /* ================================================================
     CUSTOMER DASHBOARD
  ================================================================ */
  var ASSIST_APPT = null, ASSIST_CUSTOMER = null;

  function activeApptFor(customerId) {
    var list = getAppointments().filter(function (a) { return a.customerId === customerId; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    return list.filter(function (a) { return a.status !== "Completed"; })[0] || list[list.length - 1];
  }

  function renderCustomer(s) {
    var c = customerById(s.refId);
    var appt = activeApptFor(s.refId);
    ASSIST_APPT = appt; ASSIST_CUSTOMER = c;

    $("#welcomeTitle").textContent = "Hi " + c.firstName + " 👋";
    $("#apptBadge").textContent = appt.status;
    $("#apptBadge").className = "card__badge badge--" + statusMeta(appt.status);

    // Banner adapts to live status
    var bs = $("#bannerStrong"), bsp = $("#bannerSpan");
    if (appt.status === "Completed") {
      bs.textContent = "Treatment complete ✅";
      bsp.textContent = "Your follow-up (revisit) is on " + fmtFullDate(appt.revisit) + ".";
    } else if (appt.status === "En route") {
      bs.textContent = appt.technicianId ? (techById(appt.technicianId).firstName + " is on the way! 🚐") : "Your technician is on the way! 🚐";
      bsp.textContent = "Arriving for your " + appt.pest.toLowerCase() + " treatment around " + fmtTime(appt.start) + ".";
    } else if (appt.status === "In progress") {
      bs.textContent = "Your treatment is in progress 🛠️";
      bsp.textContent = "Your technician is on site working on your " + appt.pest.toLowerCase() + " treatment.";
    } else {
      bs.textContent = "Your next treatment is " + relDays(appt.start);
      bsp.textContent = fmtFullDate(appt.start) + " · " + fmtTime(appt.start) +
        (appt.technicianId ? " with " + techById(appt.technicianId).firstName : "");
    }

    // Appointment card
    var box = $("#apptBody"); box.innerHTML = "";
    var dl = el("div", "dl");
    dl.appendChild(dlRow(IC.calendar, "Date", fmtFullDate(appt.start)));
    dl.appendChild(dlRow(IC.clock, "Time", fmtTime(appt.start) + " – " + fmtTime(appt.end) + " (about 90 min)"));
    dl.appendChild(dlRow(IC.user, "Technician", appt.technicianId ? techById(appt.technicianId).name : "To be assigned"));
    dl.appendChild(dlRow(IC.pin, "Address", c.address));
    box.appendChild(dl);
    if (appt.notes) box.appendChild(el("div", "note", "<strong>Technician note:</strong> " + escapeHtml(appt.notes)));
    var actions = el("div", "card__actions");
    actions.innerHTML = '<a class="btn btn--ghost btn--sm" href="tel:+14389886709">Call to reschedule</a>' +
      '<button class="btn btn--ghost btn--sm" id="addCalBtn">Add to calendar</button>';
    box.appendChild(actions);
    $("#addCalBtn").addEventListener("click", function () { downloadICS(appt, c); });

    // Treatment card
    var tb = $("#treatBody"); tb.innerHTML = "";
    var dl2 = el("div", "dl");
    dl2.appendChild(dlRow(IC.bug, "Pest", appt.pest));
    dl2.appendChild(dlRow(IC.flask, "Treatment", appt.treatmentType));
    dl2.appendChild(dlRow(IC.pin, "Focus area", "Mainly your " + appt.targets + "."));
    tb.appendChild(dl2);
    tb.appendChild(el("div", "note", "🌿 <strong>Family &amp; pet safe.</strong> Keep children and pets out of treated areas for about " +
      appt.reEntryHours + " hours after the visit, then ventilate by opening a few windows."));

    renderTimeline(appt);
    renderPrep(appt);
    renderHistory(s.refId);
    initAssistant();
  }

  function dlRow(icon, label, value) {
    var row = el("div", "dl__row");
    row.innerHTML = icon + '<div><span class="dl__label">' + label + '</span><div class="dl__value">' + value + "</div></div>";
    return row;
  }

  function renderTimeline(appt) {
    var now = Date.now();
    var nodes = [
      { passedBy: appt.end, date: fmtDate(appt.start), title: "Treatment Visit", desc: appt.treatmentType + "." },
      { passedBy: appt.revisit, date: "1–2 weeks", title: "Settle-In Period", desc: "The treatment works through the colony. Some activity is normal — that's expected." },
      { passedBy: addDaysISO(appt.revisit, 1), date: fmtDate(appt.revisit), title: "Follow-Up Visit (Revisit)", desc: "We check the results and re-treat free of charge if anything remains." },
      { passedBy: appt.coverageEnds, date: "Through " + fmtDate(appt.coverageEnds), title: "Plan Coverage", desc: "You stay protected under your " + ASSIST_CUSTOMER.plan + ", with free return visits if pests come back." }
    ];
    var cur = nodes.findIndex(function (n) { return now < new Date(n.passedBy).getTime(); });
    if (cur < 0) cur = nodes.length - 1;
    // If the visit is already marked complete, reflect it: treatment is done,
    // the customer is now in the settle-in period heading toward the revisit.
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

  function buildPrepItems(pest) {
    var items = [];
    (DATA.prepByPest[pest] || []).forEach(function (t) { items.push({ text: t, group: "For your " + pest.toLowerCase() + " treatment" }); });
    DATA.generalPrep.forEach(function (t) { items.push({ text: t, group: "For every visit" }); });
    return items;
  }
  function renderPrep(appt) {
    var items = buildPrepItems(appt.pest);
    var key = prepKey(appt.id);
    var state; try { state = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { state = {}; }
    var list = $("#prepList"); list.innerHTML = "";
    var lastGroup = null;
    items.forEach(function (it, i) {
      if (it.group !== lastGroup) { list.appendChild(el("div", "prep__tag", it.group)); lastGroup = it.group; }
      var id = "prep_" + i;
      var label = el("label", "prep__item"); label.setAttribute("for", id);
      label.innerHTML = '<input type="checkbox" id="' + id + '" ' + (state[i] ? "checked" : "") + '>' +
        '<span class="prep__box">' + IC.check + '</span><span class="prep__text">' + it.text + "</span>";
      list.appendChild(label);
    });
    function update() {
      var boxes = list.querySelectorAll('input[type=checkbox]'), done = 0;
      boxes.forEach(function (b, i) { state[i] = b.checked; if (b.checked) done++; });
      localStorage.setItem(key, JSON.stringify(state));
      var pct = Math.round((done / boxes.length) * 100);
      $("#prepFill").style.width = pct + "%";
      $("#prepCount").textContent = done + "/" + boxes.length;
      $("#prepDone").classList.toggle("hidden", done !== boxes.length);
    }
    list.addEventListener("change", update);
    update();
  }

  function renderHistory(customerId) {
    var wrap = $("#historyList"); wrap.innerHTML = "";
    var list = DATA.history[customerId] || [];
    if (!list.length) { wrap.appendChild(el("p", "muted-note", "No past visits yet — your first treatment is coming up.")); return; }
    list.forEach(function (h) {
      var d = new Date(h.date);
      var item = el("div", "history__item");
      item.innerHTML = '<div class="history__date"><strong>' + d.getDate() + "</strong><span>" +
        d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) + "</span></div>" +
        '<div class="history__body"><h4>' + h.pest + "</h4><p>" + h.result + "</p>" +
        '<div class="history__meta">' + h.treatmentType + " · " + h.technician + "</div></div>";
      wrap.appendChild(item);
    });
  }

  /* ================================================================
     TECHNICIAN DASHBOARD
  ================================================================ */
  var STATUS_FLOW = ["Scheduled", "En route", "In progress", "Completed"];

  function renderTechnician(s) {
    var tech = techById(s.refId);
    var jobs = getAppointments().filter(function (a) { return a.technicianId === s.refId; })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });

    $("#techWelcome").textContent = "Hi " + tech.firstName + " 👋";
    $("#techSub").textContent = "Here are the jobs assigned to you. Update each one as you go.";

    var todayJobs = jobs.filter(function (j) { return isToday(j.start); });
    var openJobs = jobs.filter(function (j) { return j.status !== "Completed"; });
    var nextJob = openJobs[0];
    $("#techStats").innerHTML =
      stat("Jobs today", todayJobs.length, "scheduled") +
      stat("Open jobs", openJobs.length, "route") +
      stat("Completed", jobs.filter(function (j) { return j.status === "Completed"; }).length, "done") +
      stat("Next job", nextJob ? relDays(nextJob.start) : "—", "progress");

    var wrap = $("#techJobs"); wrap.innerHTML = "";
    if (!jobs.length) { wrap.appendChild(el("p", "muted-note", "No jobs assigned to you right now.")); return; }

    jobs.forEach(function (j) {
      var c = customerById(j.customerId);
      var done = prepDoneFor(j.id), total = prepTotalFor(j.pest);
      var pct = Math.round((done / total) * 100);
      var mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.address);

      var card = el("div", "job");
      card.innerHTML =
        '<div class="job__time">' +
          '<strong>' + fmtTime(j.start) + "</strong>" +
          '<span>' + (isToday(j.start) ? "Today" : fmtDateShort(j.start) + " · " + relDays(j.start)) + "</span>" +
          badge(j.status) +
        "</div>" +
        '<div class="job__main">' +
          "<h3>" + escapeHtml(c.name) + " · " + j.pest + "</h3>" +
          '<div class="job__row">' + IC.pin + "<span>" + escapeHtml(c.address) + "</span></div>" +
          '<div class="job__treat">' + IC.flask + " " + j.treatmentType + " — " + j.targets + "</div>" +
          '<div class="job__prep"><div class="mini-bar"><div class="mini-bar__fill" style="width:' + pct + '%"></div></div>' +
            "<span>Customer prep " + done + "/" + total + "</span></div>" +
          '<div class="job__links">' +
            '<a class="mini-btn" href="tel:' + c.phone.replace(/[^0-9+]/g, "") + '">' + IC.phone + " Call</a>" +
            '<a class="mini-btn" href="' + mapUrl + '" target="_blank" rel="noopener">' + IC.map + " Directions</a>" +
          "</div>" +
          '<label class="job__note-label">Visit notes' +
            '<textarea class="job__note" data-id="' + j.id + '" rows="2">' + escapeHtml(j.notes || "") + "</textarea>" +
          "</label>" +
        "</div>" +
        '<div class="job__actions" data-id="' + j.id + '">' + techActions(j) + "</div>";
      wrap.appendChild(card);
    });

    // wire note saving
    wrap.querySelectorAll(".job__note").forEach(function (ta) {
      ta.addEventListener("change", function () {
        saveOverride(ta.getAttribute("data-id"), { notes: ta.value });
        toast("Note saved");
      });
    });
    // wire action buttons
    wrap.querySelectorAll("[data-action]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id"), action = b.getAttribute("data-action");
        advanceJob(id, action);
        renderTechnician(s);
      });
    });
  }

  function techActions(j) {
    if (j.status === "Completed") {
      return '<div class="job__done">✅ Completed<br><small>Revisit ' + fmtDateShort(j.revisit) + "</small></div>";
    }
    var idx = STATUS_FLOW.indexOf(j.status);
    var next = STATUS_FLOW[idx + 1] || "Completed";
    var label = { "En route": "Mark en route", "In progress": "Start visit", "Completed": "Complete visit" }[next];
    var btns = '<button class="btn btn--primary btn--sm" data-id="' + j.id + '" data-action="' + next + '">' + label + "</button>";
    if (next === "En route") {
      btns += '<button class="btn btn--ghost btn--sm" data-id="' + j.id + '" data-action="In progress">Start visit</button>';
    }
    return btns;
  }

  function advanceJob(id, newStatus) {
    var patch = { status: newStatus };
    if (newStatus === "Completed") {
      var appt = getAppointments().filter(function (a) { return a.id === id; })[0];
      // ensure a revisit is booked ~2 weeks out if one isn't already in the future
      if (!appt.revisit || daysBetween(appt.revisit) < 0) patch.revisit = addDaysISO(new Date().toISOString(), 14);
      patch.completedAt = new Date().toISOString();
      toast("Visit completed — revisit booked 🎉");
    } else {
      toast("Status updated: " + newStatus);
    }
    saveOverride(id, patch);
  }

  function stat(label, value, mod) {
    return '<div class="stat stat--' + (mod || "scheduled") + '"><span class="stat__value">' + value + '</span><span class="stat__label">' + label + "</span></div>";
  }

  /* ================================================================
     ADMIN DASHBOARD
  ================================================================ */
  function renderAdmin() {
    var appts = getAppointments().sort(function (a, b) { return new Date(a.start) - new Date(b.start); });

    var todayCount = appts.filter(function (a) { return isToday(a.start); }).length;
    var weekCount = appts.filter(function (a) { var d = daysBetween(a.start); return d >= 0 && d <= 7; }).length;
    var unassigned = appts.filter(function (a) { return !a.technicianId; }).length;
    $("#adminStats").innerHTML =
      stat("Jobs today", todayCount, "scheduled") +
      stat("Next 7 days", weekCount, "route") +
      stat("Active customers", DATA.customers.length, "progress") +
      stat("Needs assignment", unassigned, unassigned ? "unassigned" : "done");

    // Appointments table
    var techOpts = function (sel) {
      var opts = '<option value="">Unassigned</option>';
      DATA.technicians.forEach(function (t) {
        opts += '<option value="' + t.id + '"' + (t.id === sel ? " selected" : "") + ">" + t.name + "</option>";
      });
      return opts;
    };
    var rows = '<div class="appt-row appt-row--head"><div>When</div><div>Customer</div><div>Service</div><div>Technician</div><div>Status</div></div>';
    appts.forEach(function (a) {
      var c = customerById(a.customerId);
      rows += '<div class="appt-row' + (a.technicianId ? "" : " appt-row--alert") + '">' +
        '<div data-label="When"><strong>' + fmtDateShort(a.start) + "</strong><small>" + fmtTime(a.start) + " · " + relDays(a.start) + "</small></div>" +
        '<div data-label="Customer"><strong>' + escapeHtml(c.name) + "</strong><small>" + escapeHtml(cityOf(c.address)) + "</small></div>" +
        '<div data-label="Service">' + a.pest + "<small>" + a.treatmentType + "</small></div>" +
        '<div data-label="Technician"><select class="tech-select" data-id="' + a.id + '">' + techOpts(a.technicianId) + "</select></div>" +
        '<div data-label="Status">' + badge(a.status) + "</div>" +
        "</div>";
    });
    $("#adminAppts").innerHTML = rows;

    $("#adminAppts").querySelectorAll(".tech-select").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id"), techId = sel.value || null;
        var appt = getAppointments().filter(function (a) { return a.id === id; })[0];
        var patch = { technicianId: techId };
        // assigning a tech to an unassigned job moves it to Scheduled; unassigning reverts
        if (techId && appt.status === "Unassigned") patch.status = "Scheduled";
        if (!techId) patch.status = "Unassigned";
        saveOverride(id, patch);
        toast(techId ? "Assigned to " + techById(techId).firstName : "Set to unassigned");
        renderAdmin();
      });
    });

    // Technicians list
    var techHtml = "";
    DATA.technicians.forEach(function (t) {
      var count = appts.filter(function (a) { return a.technicianId === t.id && a.status !== "Completed"; }).length;
      techHtml += '<div class="tech-item"><span class="avatar avatar--sm">' + t.initials + "</span>" +
        '<div class="tech-item__info"><strong>' + t.name + "</strong><small>" + IC.phone + " " + t.phone + "</small></div>" +
        '<span class="tech-item__count">' + count + " open job" + (count === 1 ? "" : "s") + "</span></div>";
    });
    $("#adminTechs").innerHTML = techHtml;
  }
  function cityOf(addr) { var parts = addr.split(","); return parts.length > 1 ? parts[1].trim() : addr; }

  /* ---------- Add-to-calendar (.ics) ---------- */
  function downloadICS(appt, c) {
    function z(iso) { return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"; }
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Serene Touch//Portal//EN", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@serenetouch", "DTSTAMP:" + z(new Date().toISOString()),
      "DTSTART:" + z(appt.start), "DTEND:" + z(appt.end),
      "SUMMARY:Serene Touch Pest Control — " + appt.treatmentType,
      "DESCRIPTION:" + (appt.notes || ""), "LOCATION:" + c.address, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
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
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("is-show"); }, 2600);
  }

  /* ================================================================
     ASSISTANT (customer only, data-aware)
  ================================================================ */
  var assistantReady = false;
  function initAssistant() {
    if (assistantReady) return;
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
    function greet() { addMsg("Hi " + ASSIST_CUSTOMER.firstName + "! 👋 I'm your Serene Touch assistant. I can see your account, so ask me anything about your <b>" + ASSIST_APPT.pest.toLowerCase() + " treatment</b>, your appointment, how to prepare, or what to expect.", "bot"); renderChips(); }
    function thinking(cb) { var t = el("div", "msg msg--bot", '<span class="typing"><span></span><span></span><span></span></span>'); body.appendChild(t); body.scrollTop = body.scrollHeight; setTimeout(function () { t.remove(); cb(); }, 460); }
    function handle(text) { addMsg(escapeHtml(text), "user"); thinking(function () { addMsg(respond(text), "bot"); renderChips(); }); }

    sendBtn.addEventListener("click", function () { var v = input.value.trim(); if (v) { handle(v); input.value = ""; } });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") sendBtn.click(); });
    renderChips();
  }

  function respond(raw) {
    var q = raw.toLowerCase();
    var s = ASSIST_APPT, c = ASSIST_CUSTOMER;
    var tech = s.technicianId ? techById(s.technicianId) : null;
    var has = function () { for (var i = 0; i < arguments.length; i++) if (q.indexOf(arguments[i]) > -1) return true; return false; };

    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(q)) return "Hello! How can I help with your " + s.pest.toLowerCase() + " treatment today?";
    if (has("reschedule", "cancel", "change my appoint", "can't make", "cannot make", "move my appoint", "different day"))
      return "No problem — to reschedule or cancel, just call or text us at <a href='tel:+14389886709'>438-988-6709</a>. Your visit is currently " + relDays(s.start) + " on " + fmtFullDate(s.start) + ".";
    if (has("revisit", "re-visit", "follow up", "follow-up", "come back", "next visit", "second visit", "again", "check back"))
      return "Your follow-up (revisit) is on <b>" + fmtFullDate(s.revisit) + "</b> — about two weeks after treatment. That gap lets the treatment work fully; at the revisit we check the results and re-treat free of charge if anything remains.";
    if (has("who is", "which tech", "technician", "who's coming", "who is coming"))
      return tech ? "Your technician is <b>" + tech.name + "</b>. They'll handle your " + s.pest.toLowerCase() + " treatment on " + fmtDate(s.start) + "." : "A technician will be assigned to your visit shortly — you'll see their name here once they're scheduled.";
    if (has("appointment", "appoint", "coming", "arrive", "when are you", "when is the", "schedule", "what time", "what day"))
      return "Your next treatment is <b>" + fmtFullDate(s.start) + "</b> from " + fmtTime(s.start) + " to " + fmtTime(s.end) + " (about 90 minutes)" + (tech ? ", with " + tech.name : "") + " — that's " + relDays(s.start) + ". You can tap “Add to calendar” on your appointment card.";
    if (has("prepare", "prep", "ready", "before you", "before the", "do before", "get ready", "what do i do", "what should i do"))
      return "Great question! For your " + s.pest.toLowerCase() + " visit, the key steps are: " + previewPrep(s.pest) + " You'll find the full, tickable checklist in the <b>How to Prepare</b> card — it saves your progress as you go.";
    if (has("safe", "pet", "dog", "cat", "fish", "kid", "child", "baby", "pregnan", "toxic", "harmful", "danger"))
      return "Our products are eco-friendly, low-toxic, and family &amp; pet safe. ✅ Just keep children and pets out of treated areas for about <b>" + s.reEntryHours + " hours</b> after the visit, then open a few windows to ventilate. If you have a fish tank, cover it and turn off the air pump during treatment.";
    if (has("treatment", "using", "product", "chemical", "spray", "method", "what kind", "how do you treat"))
      return "For your " + s.pest.toLowerCase() + ", we're using a <b>" + s.treatmentType + "</b>, focused mainly on your " + s.targets + ". It targets pests at the source while staying safe for your home.";
    if (has("plan", "coverage", "cover", "guarantee", "warranty", "expire", "protected until", "how long am i", "when does my plan", "end"))
      return "You're on the <b>" + c.plan + "</b>, with coverage through <b>" + fmtDate(s.coverageEnds) + "</b>. While you're covered, if pests come back between visits we return and re-treat at no extra cost.";
    if (has("how long", "duration", "take", "last", "long will", "long does"))
      return "The treatment visit takes about <b>90 minutes</b> (" + fmtTime(s.start) + "–" + fmtTime(s.end) + "). After that, the treatment keeps working over the next 1–2 weeks until your revisit.";
    if (has("still see", "still seeing", "still have", "more bug", "came back", "not working", "didn't work", "dead", "seeing more", "increase"))
      return DATA.aftercareByPest[s.pest] || "Some activity right after treatment can be normal. If it continues past your revisit on " + fmtDate(s.revisit) + ", call us at 438-988-6709 and we'll come back.";
    if (has("cost", "price", "pay", "invoice", "bill", "charge", "how much", "fee"))
      return "Billing for your " + c.plan + " follows your service agreement. For an invoice or any billing question, call us at <a href='tel:+14389886709'>438-988-6709</a> and we'll sort it out right away.";
    if (has("human", "person", "call", "phone", "speak", "representative", "agent", "contact", "talk to"))
      return "You can reach the Serene Touch team at <a href='tel:+14389886709'>438-988-6709</a> or <a href='mailto:info@serenetouchpest.ca'>info@serenetouchpest.ca</a> — Mon–Sat, 8am–7pm.";
    if (has("thank", "thx", "appreciate", "great", "awesome", "perfect")) return "You're very welcome, " + c.firstName + "! 🐾 Anything else I can help with?";
    if (has("address", "where", "location", "my place", "my home")) return "We have your service address as <b>" + escapeHtml(c.address) + "</b>. If that's not right, let us know at 438-988-6709.";
    return "I can help with your <b>appointment</b>, how to <b>prepare</b>, your <b>treatment</b>, your <b>revisit</b>, plan coverage, and safety. Try a quick question below — or for anything else, call us at <a href='tel:+14389886709'>438-988-6709</a>.";
  }
  function previewPrep(pest) {
    var list = (DATA.prepByPest[pest] || []).slice(0, 2).map(function (t) { return t.replace(/\.$/, "").toLowerCase(); });
    return list.join("; ") + "; and clear access to baseboards and under sinks.";
  }

  /* ================================================================
     BOOT
  ================================================================ */
  route();
})();
