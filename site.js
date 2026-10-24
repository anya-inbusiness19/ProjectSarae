(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var D = window.SITE_CONTENT || { fields: [], ticker: [], benefits: [], demos: [], plans: [], addons: [] };
  var sb = null;
  if (C.supabaseUrl && C.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = document.body.getAttribute("data-page") || "";
  function money(n) { return "$" + Number(n || 0).toLocaleString("en-US"); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }

  /* ---------- Content settings (saved in admin, cached for instant loads) ---------- */
  var S = {};
  try { S = JSON.parse(localStorage.getItem("ps_settings") || "{}") || {}; } catch (e) { S = {}; }
  var DEF = {};
  D.fields.forEach(function (f) { DEF[f.key] = f.def; });
  function txt(key) { var v = S[key]; return v != null && String(v).trim() !== "" ? v : (DEF[key] != null ? DEF[key] : ""); }
  function list(key) {
    try { var v = JSON.parse(S[key] || "null"); if (Array.isArray(v) && v.length) return v; } catch (e) {}
    return D[key] || [];
  }
  function setupFee() {
    var v = S.setup_fee;
    if (v != null && String(v).trim() !== "" && !isNaN(+v)) return Math.max(0, +v);
    return +D.setup_fee || 0;
  }
  function setupText() { return S.setup_fee_text && S.setup_fee_text.trim() ? S.setup_fee_text : D.setup_fee_text; }
  function plans() {
    var saved = list("plans"), out = {};
    D.plans.forEach(function (p) { out[p.key] = p; });
    saved.forEach(function (p) { if (out[p.key]) out[p.key] = p; });
    return D.plans.map(function (p) { return out[p.key]; });
  }
  function planMap() { var m = {}; plans().forEach(function (p) { m[p.key] = p; }); return m; }
  function addons() { return list("addons").filter(function (a) { return a && a.key && a.name; }); }
  function addonMap() { var m = {}; addons().forEach(function (a) { m[a.key] = a; }); return m; }
  function unitLabel(u) { return u === "month" ? "/month" : u === "setup" ? "one-time setup" : "one-time"; }
  window.PS = { txt: txt, list: list, setupFee: setupFee, plans: plans, addons: addons, unitLabel: unitLabel };

  /* ---------- Icons ---------- */
  var P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18" stroke="currentColor" stroke-width="2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    key: '<circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 12l9-9M16 7l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    file: '<path d="M6 3h8l4 4v14H6V3z M14 3v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    repeat: '<path d="M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    hand: '<path d="M9 11V5.5a1.5 1.5 0 013 0V11m0-1.5a1.5 1.5 0 013 0V12m0-1a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L4 15.5a1.5 1.5 0 012.4-1.8L9 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  var sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">';
  Object.keys(P).forEach(function (k) { sprite += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + P[k] + "</symbol>"; });
  document.body.insertAdjacentHTML("afterbegin", sprite + "</svg>");

  /* ---------- Header & footer (same on every page) ---------- */
  var links = [["index.html", "Home", "home"], ["pricing.html", "Pricing", "pricing"], ["book.html", "Booking", "book"]];
  var head = $("#site-header");
  if (head) {
    head.outerHTML =
      '<header class="nav"><div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="Project Sarae home"><img src="images/logo-dark.png" alt="" class="brand-logo"><span>PROJECT SARAE</span></a>' +
      '<button class="menu-btn" aria-label="Open menu" aria-expanded="false"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<nav class="nav-links" aria-label="Main">' +
      links.map(function (l) { return '<a href="' + l[0] + '"' + (page === l[2] ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<a class="btn btn-primary" href="book.html" data-track="nav_book">Book a Zoom meeting</a></nav></div></header>';
    var mb = $(".menu-btn");
    mb.addEventListener("click", function () {
      var open = $(".nav-links").classList.toggle("open");
      mb.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var foot = $("#site-footer");
  if (foot) {
    foot.outerHTML =
      '<footer><div class="wrap footer-grid">' +
      '<div><a class="brand" href="index.html"><img src="images/logo-dark.png" alt="" class="brand-logo"><span>PROJECT SARAE</span></a>' +
      '<p class="foot-tag">Websites for local businesses, built for you and kept up for you.</p></div>' +
      '<div><h4>Explore</h4>' + links.map(function (l) { return '<a href="' + l[0] + '">' + l[1] + "</a>"; }).join("") + '<a href="index.html#reviews">Reviews</a></div>' +
      '<div><h4>Policies</h4><a href="contract.html">Service Agreement</a><a href="terms.html">Terms &amp; Refunds</a><a href="privacy.html">Privacy Policy</a></div>' +
      '<div><h4>Contact</h4>' +
      (C.email ? '<a href="mailto:' + C.email + '" data-track="email">' + C.email + "</a>" : "") +
      (C.instagram ? '<a href="https://instagram.com/' + C.instagram + '" target="_blank" rel="noopener" data-track="instagram">@' + C.instagram + "</a>" : "") +
      '<a href="book.html">Book a Zoom meeting</a></div>' +
      '</div><div class="wrap foot-bottom"><span>© ' + new Date().getFullYear() + ' Project Sarae. All rights reserved.</span>' +
      '<span>This site counts visits anonymously. <a href="admin.html" rel="nofollow">Admin</a></span></div></footer>';
  }
  $$("[data-email]").forEach(function (a) { if (C.email) { a.href = "mailto:" + C.email; if (!a.textContent.trim()) a.textContent = C.email; } });
  $$("[data-fill]").forEach(function (el) { var v = C[el.getAttribute("data-fill")]; if (v) el.textContent = v; });

  /* ---------- Anonymous analytics ---------- */
  function sessionId() {
    try {
      var id = sessionStorage.getItem("ps_sid");
      if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("ps_sid", id); }
      return id;
    } catch (e) { return "nosession"; }
  }
  function device() { var w = window.innerWidth; return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop"; }
  function track(event, label) {
    if (!sb) return;
    var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : "";
    sb.from("page_views").insert({
      event: event, label: label ? String(label).slice(0, 80) : null,
      path: (location.pathname || "/").slice(0, 200), referrer: ref.slice(0, 300),
      device: device(), session_id: sessionId()
    }).then(function () {}, function () {});
  }
  track("view");
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (el) track("click", el.getAttribute("data-track"));
  });

  /* ---------- Put content on the page ---------- */
  function observeNew(nodes) { if (window.__psReveal) window.__psReveal(nodes); }

  function renderTicker() {
    var t = $("#ticker-track"); if (!t) return;
    var items = list("ticker").filter(function (x) { return String(x).trim(); });
    var one = items.map(function (x) { return '<span class="tk-item">' + esc(x) + '</span><span class="tk-dot" aria-hidden="true">✦</span>'; }).join("");
    // two copies make the loop seamless
    t.innerHTML = '<div class="tk-set">' + one + '</div><div class="tk-set" aria-hidden="true">' + one + "</div>";
    t.style.setProperty("--tk-dur", Math.max(24, items.length * 4.5) + "s");
    var sr = $("#ticker-sr"); if (sr) sr.textContent = "Our services: " + items.join(", ") + ".";
  }

  function renderBenefits() {
    var ol = $("#benefits"); if (!ol) return;
    ol.innerHTML = "";
    list("benefits").forEach(function (b, i) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="bn-n">' + String(i + 1).padStart(2, "0") + '</span><div><h3></h3><p></p></div>';
      $("h3", li).textContent = b.title || ""; $("p", li).textContent = b.text || "";
      ol.appendChild(li);
    });
    observeNew(Array.prototype.slice.call(ol.children));
  }

  var currentDemo = 0;
  function renderDemos() {
    var stage = $("#demo-stage"); if (!stage) return;
    var demos = list("demos").filter(function (d) { return d && d.url; });
    if (!demos.length) { stage.closest("section").hidden = true; return; }
    if (currentDemo >= demos.length) currentDemo = 0;
    var tabs = $("#demo-tabs");
    tabs.innerHTML = "";
    tabs.hidden = demos.length < 2;
    demos.forEach(function (d, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (i === currentDemo ? " on" : "");
      b.setAttribute("aria-pressed", i === currentDemo ? "true" : "false");
      b.textContent = d.name;
      b.addEventListener("click", function () { currentDemo = i; renderDemos(); track("click", "demo_tab_" + (i + 1)); });
      tabs.appendChild(b);
    });
    var d = demos[currentDemo];
    var live = $(".live", stage), frame = $("iframe", live);
    if (frame.getAttribute("src") !== d.url) {
      live.classList.remove("ready", "active");
      frame.setAttribute("src", d.url);
      frame.title = (d.name || "Website") + " live demo";
    }
    $("#demo-name").textContent = d.name || "";
    $("#demo-label").textContent = d.label || "";
    $("#demo-text").textContent = d.text || "";
    $("#demo-open").href = d.url;
  }

  function renderPricing(period) {
    var grid = $("#plan-grid"); if (!grid) return;
    period = period || grid.dataset.period || "monthly";
    grid.dataset.period = period;
    grid.innerHTML = "";
    plans().forEach(function (p) {
      var feat = !!(p.badge && String(p.badge).trim());
      var card = document.createElement("div");
      card.className = "card plan" + (feat ? " featured" : "");
      card.innerHTML = (feat ? '<span class="badge"></span>' : "") +
        '<div class="name"></div><div class="price"><span></span> <small></small></div><div class="note"></div><ul></ul>' +
        '<a class="btn btn-block ' + (feat ? "btn-primary" : "btn-ghost") + '"></a>';
      if (feat) $(".badge", card).textContent = p.badge;
      $(".name", card).textContent = p.name;
      $(".price span", card).textContent = money(p[period]);
      $(".price small", card).textContent = period === "yearly" ? "/year" : "/month";
      $(".note", card).textContent = period === "yearly" && p.monthly * 12 > p.yearly ? "Save " + money(p.monthly * 12 - p.yearly) + " vs. monthly" : "";
      var ul = $("ul", card);
      (p.features || []).forEach(function (f) {
        var li = document.createElement("li");
        li.innerHTML = '<svg width="14" height="14"><use href="#i-check"/></svg><span></span>';
        $("span", li).textContent = f; ul.appendChild(li);
      });
      var a = $("a", card);
      a.textContent = "Choose " + p.name;
      a.href = "book.html?plan=" + p.key + "&period=" + period;
      a.setAttribute("data-track", "choose_" + p.key + "_" + period);
      grid.appendChild(card);
    });
    if (grid.dataset.shown) grid.classList.add("swap"), setTimeout(function () { grid.classList.remove("swap"); }, 500);
    grid.dataset.shown = "1";
    observeNew(Array.prototype.slice.call(grid.children));
  }

  function renderAddons() {
    var box = $("#addon-list"); if (!box) return;
    box.innerHTML = "";
    addons().forEach(function (a) {
      var el = document.createElement("div"); el.className = "card addon";
      el.innerHTML = '<div><h3></h3><p></p></div><span class="amt"><span class="v"></span> <small></small></span>';
      $("h3", el).textContent = a.name; $("p", el).textContent = a.text || "";
      $(".v", el).textContent = money(a.price); $("small", el).textContent = unitLabel(a.unit);
      box.appendChild(el);
    });
    observeNew(Array.prototype.slice.call(box.children));
  }

  function renderSetupFee() {
    var fee = setupFee();
    $$("[data-setup-pill]").forEach(function (el) { el.textContent = fee ? "One-time setup fee: " + money(fee) : "No setup fee"; });
    $$("[data-setup-amount]").forEach(function (el) { el.textContent = fee ? money(fee) : "$0"; });
    $$("[data-setup-title]").forEach(function (el) { el.textContent = fee ? "One-time setup fee" : "No setup fee"; });
    $$("[data-setup-text]").forEach(function (el) { el.textContent = fee ? setupText() : "You only pay for your plan. There’s no upfront charge to design and launch your site."; });
    $$("[data-setup-line]").forEach(function (el) {
      el.textContent = fee ? money(fee) + " one time, due at checkout together with your first plan payment." : "None. Your first plan payment is due at checkout.";
    });
    $$("[data-setup-box]").forEach(function (el) { el.hidden = !fee; });
  }

  function applyContent() {
    $$("[data-edit]").forEach(function (el) { var v = txt(el.getAttribute("data-edit")); if (v) el.textContent = v; });
    $$("[data-edit-img]").forEach(function (el) {
      var v = txt(el.getAttribute("data-edit-img")); if (!v) return;
      if (el.tagName === "IMG") { if (el.getAttribute("src") !== v) el.src = v; }
      else el.style.backgroundImage = "url('" + String(v).replace(/'/g, "%27") + "')";
    });
    renderTicker(); renderBenefits(); renderDemos(); renderPricing(); renderAddons(); renderSetupFee();
  }
  applyContent();

  var settingsReady = new Promise(function (resolve) {
    if (!sb) { resolve(); return; }
    sb.from("site_settings").select("key,value").then(function (res) {
      if (res.error || !res.data) { resolve(); return; }
      var map = {};
      res.data.forEach(function (r) { map[r.key] = r.value; });
      var changed = JSON.stringify(map) !== JSON.stringify(S);
      S = map;
      try { localStorage.setItem("ps_settings", JSON.stringify(map)); } catch (e) {}
      if (changed) applyContent();
      resolve();
    }, function () { resolve(); });
  });

  /* Pricing page: monthly / yearly toggle */
  function bindToggle(onChange) {
    $$(".toggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".toggle button").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        onChange(b.dataset.period);
      });
    });
  }
  if (page === "pricing") bindToggle(function (period) { renderPricing(period); track("click", "toggle_" + period); });

  /* ---------- Homepage: live demo in the laptop ---------- */
  var tryBtn = $("#demo-try");
  if (tryBtn) {
    tryBtn.addEventListener("click", function () {
      var live = tryBtn.closest(".live");
      live.classList.add("active");
      track("click", "demo_try");
    });
  }

  /* ---------- Booking page ---------- */
  if (page === "book") {
    var q = new URLSearchParams(location.search);
    var period = q.get("period") === "yearly" ? "yearly" : "monthly";
    var showPicked = function () {
      var pm = planMap(), plan = pm[q.get("plan")] ? q.get("plan") : "";
      var banner = $("#picked");
      if (plan && banner) {
        banner.hidden = false;
        $("#picked-plan", banner).textContent = pm[plan].name + " plan · " + money(pm[plan][period]) + (period === "yearly" ? "/year" : "/month");
      }
      return plan ? "Interested in the " + pm[plan].name + " plan (" + period + ")" : "";
    };
    var note = showPicked();
    settingsReady.then(showPicked);
    var booking = $("#booking");
    var url = C.bookingLink || "https://cal.com/projectsarae/30min";
    var calLink = url.replace(/^https?:\/\/(app\.)?cal\.com\//, "").replace(/[?#].*$/, "").replace(/\/$/, "");
    var box = document.createElement("div");
    box.id = "cal-inline"; box.className = "booking-frame card";
    box.style.height = "auto"; box.style.minHeight = "640px"; box.style.overflow = "auto";
    booking.appendChild(box);
    /* Official Cal.com inline embed */
    (function (C2, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C2.document; C2.Cal = C2.Cal || function () { var cal = C2.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", "booking", { origin: "https://app.cal.com" });
    var calConfig = { layout: "month_view" };
    if (note) calConfig.notes = note;
    Cal.ns.booking("inline", { elementOrSelector: "#cal-inline", calLink: calLink, config: calConfig });
    Cal.ns.booking("ui", { hideEventTypeDetails: false, layout: "month_view" });
    var pp = document.createElement("p");
    pp.className = "fine"; pp.style.textAlign = "center";
    pp.innerHTML = 'Calendar not loading? <a target="_blank" rel="noopener" data-track="booking_open">Open the booking page</a>.';
    $("a", pp).href = url + (note ? "?notes=" + encodeURIComponent(note) : "");
    booking.appendChild(pp);
  }

  /* ---------- Reviews ---------- */
  function stars(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function reviewCard(r) {
    var card = document.createElement("article");
    card.className = "card review";
    card.innerHTML = '<div class="stars"></div><blockquote></blockquote><div class="who"></div>';
    $(".stars", card).textContent = stars(r.rating);
    $(".stars", card).setAttribute("aria-label", r.rating + " out of 5 stars");
    $("blockquote", card).textContent = r.body;
    var who = $(".who", card); who.textContent = r.name;
    if (r.business) { var s = document.createElement("span"); s.textContent = " · " + r.business; who.appendChild(s); }
    return card;
  }
  var reviewList = $("#review-list");
  if (reviewList) {
    var limit = +(reviewList.getAttribute("data-limit") || 50);
    var render = function (rows) {
      reviewList.innerHTML = "";
      var sum = $("#rating-summary");
      if (!rows.length) {
        reviewList.innerHTML = '<div class="empty">No reviews yet. Worked with us? Be the first to share your experience.</div>';
        if (sum) sum.innerHTML = "";
        return;
      }
      if (sum) {
        var avg = rows.reduce(function (a, r) { return a + r.rating; }, 0) / rows.length;
        sum.className = "rating-summary";
        sum.innerHTML = '<b></b><div><div class="stars"></div><div class="cnt"></div></div>';
        $("b", sum).textContent = avg.toFixed(1);
        $(".stars", sum).textContent = stars(Math.round(avg));
        $(".cnt", sum).textContent = rows.length + (rows.length === 1 ? " review" : " reviews");
      }
      rows.forEach(function (r) { reviewList.appendChild(reviewCard(r)); });
    };
    if (sb) {
      sb.from("reviews").select("name,business,rating,body,created_at").eq("approved", true)
        .order("created_at", { ascending: false }).limit(limit)
        .then(function (res) { render(res.error ? [] : res.data || []); }, function () { render([]); });
    } else render([]);
  }
  var revToggle = $("#review-toggle");
  if (revToggle) {
    revToggle.addEventListener("click", function () {
      var f = $("#review-form"), open = f.hidden;
      f.hidden = !open;
      revToggle.setAttribute("aria-expanded", open ? "true" : "false");
      revToggle.textContent = open ? "Close" : "Leave a review";
      if (open) { f.classList.add("pop"); $("#r-name").focus(); }
    });
  }
  var form = $("#review-form");
  if (form) {
    var rating = 0;
    $$("#star-input button").forEach(function (b) {
      b.addEventListener("click", function () {
        rating = +b.dataset.v;
        $$("#star-input button").forEach(function (x) { x.classList.toggle("on", +x.dataset.v <= rating); x.setAttribute("aria-checked", +x.dataset.v === rating); });
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("#review-msg");
      var name = $("#r-name").value.trim(), business = $("#r-business").value.trim(), body = $("#r-body").value.trim();
      msg.className = "msg";
      if (!name || !body || !rating) { msg.className = "msg err"; msg.textContent = "Please add your name, a star rating, and your review."; return; }
      if (!sb) { msg.className = "msg err"; msg.textContent = "Reviews aren’t connected yet. Please check back soon."; return; }
      var btn = $("button[type=submit]", form);
      btn.disabled = true; btn.textContent = "Sending…";
      sb.from("reviews").insert({ name: name, business: business || null, rating: rating, body: body }).then(function (res) {
        btn.disabled = false; btn.textContent = "Submit review";
        if (res.error) { msg.className = "msg err"; msg.textContent = "Something went wrong. Please try again."; return; }
        form.reset(); rating = 0;
        $$("#star-input button").forEach(function (x) { x.classList.remove("on"); });
        msg.className = "msg ok"; msg.textContent = "Thank you! Your review will appear once it’s approved.";
        track("review_submitted");
      });
    });
  }

  /* ---------- Private checkout (only reachable with a link from A'Nya) ---------- */
  if (page === "checkout") {
    var cbox = $("#checkout");
    var code = new URLSearchParams(location.search).get("code") || "";
    var showLocked = function (title, text) {
      cbox.innerHTML =
        '<div class="card locked"><div class="icon" style="margin:0 auto 16px"><svg width="20" height="20"><use href="#i-lock"/></svg></div>' +
        "<h2></h2><p></p>" +
        '<div class="hero-actions" style="justify-content:center;margin-top:22px"><a class="btn btn-primary" href="book.html">Book a Zoom meeting</a><a class="btn btn-ghost" href="pricing.html">See pricing</a></div></div>';
      $("h2", cbox).textContent = title; $("p", cbox).textContent = text;
    };
    var addonLine = function (a) { return a.name + (a.unit === "month" ? " (monthly)" : " (one-time)"); };
    var showPay = function (inv, links) {
      var PR = planMap(), AD = addonMap();
      var plan = PR[inv.chosen_plan], per = inv.chosen_period;
      var chosen = (inv.chosen_addons || []).filter(function (k) { return AD[k]; });
      var fee = setupFee();
      var total = plan[per] + fee + chosen.reduce(function (a, k) { return a + (+AD[k].price || 0); }, 0);
      cbox.innerHTML =
        '<div class="card pay-card"><div class="icon"><svg width="20" height="20"><use href="#i-check"/></svg></div>' +
        "<h2>You’re all set to pay</h2>" +
        '<p class="signed-line"></p>' +
        '<div class="summary" id="pay-sum"></div>' +
        '<div class="pay-buttons"></div>' +
        '<p class="fine">Payments are processed securely by Stripe. After today, your plan renews automatically ' + (per === "yearly" ? "each year" : "on the same date each month") + ". Questions? <a data-email></a></p></div>";
      $(".signed-line", cbox).textContent = "Agreement signed by " + inv.signed_name + ". You can read the full terms anytime on the Service Agreement page." +
        ((fee || chosen.length) ? " Each item below has its own secure payment button." : "");
      var sum = $("#pay-sum");
      var line = function (label, amt, cls) {
        var d = document.createElement("div"); if (cls) d.className = cls;
        var a = document.createElement("span"); a.textContent = label;
        var b = document.createElement("b"); b.textContent = amt;
        d.appendChild(a); d.appendChild(b); sum.appendChild(d);
      };
      line(plan.name + " plan (" + per + ")", money(plan[per]) + (per === "yearly" ? "/year" : "/month"));
      if (fee) line("Setup fee (one-time)", money(fee));
      chosen.forEach(function (k) { line(addonLine(AD[k]), money(AD[k].price) + (AD[k].unit === "month" ? "/month" : "")); });
      line("Due today", money(total), "total");
      var pb = $(".pay-buttons", cbox), n = 0, multi = !!(fee || chosen.length);
      var addBtn = function (label, url, track_) {
        n++;
        var a = document.createElement("a");
        a.className = "btn btn-primary btn-block"; a.textContent = (multi ? "Step " + n + ": " : "") + label;
        if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("data-track", track_); }
        else { a.className = "btn btn-ghost btn-block"; a.textContent += " (link coming by email)"; }
        pb.appendChild(a);
      };
      addBtn("Pay " + money(plan[per]) + " for your plan", links && links.plan_url, "pay_" + inv.chosen_plan + "_" + per);
      if (fee) addBtn("Pay the " + money(fee) + " setup fee", links && links.setup_url, "pay_setup");
      chosen.forEach(function (k) {
        var l = links && (links.addons || []).filter(function (x) { return x.key === k; })[0];
        addBtn("Pay " + money(AD[k].price) + " for " + AD[k].name.toLowerCase(), l && l.url, "pay_" + k);
      });
      var em = $("[data-email]", cbox); if (C.email) { em.href = "mailto:" + C.email; em.textContent = C.email; }
    };
    var showForm = function (inv) {
      var PR = planMap(), ADL = addons(), AD = addonMap(), fee = setupFee();
      var sel = { plan: PR[inv.recommended_plan] ? inv.recommended_plan : "business", period: "monthly", addons: {} };
      cbox.innerHTML =
        '<div class="checkout-grid"><div class="stack">' +
        '<div class="card"><span class="step-label">Step 1</span><h3>Choose your plan</h3>' +
        '<div class="toggle" role="group" aria-label="Billing period" style="margin:14px 0 16px"><button type="button" class="on" data-period="monthly">Monthly</button><button type="button" data-period="yearly">Yearly <small>2 months free</small></button></div>' +
        '<div class="plan-pick" role="radiogroup"></div></div>' +
        '<div class="card"><span class="step-label">Step 2</span><h3>Add-on services <span class="muted-inline">(optional)</span></h3><div class="addon-pick"></div></div>' +
        '<div class="card"><span class="step-label">Step 3</span><h3>Review &amp; sign the agreement</h3>' +
        '<ul class="key-terms">' +
        "<li>3-month minimum, then month-to-month. Cancel anytime after that.</li>" +
        "<li>You own your domain and your content. You get your site files after the minimum term.</li>" +
        "<li>Billing is automatic. A 14-day grace period with reminders comes before any pause for nonpayment.</li>" +
        "</ul>" +
        '<p style="margin-top:10px">Read the full <a href="contract.html" target="_blank" rel="noopener">Service Agreement</a>, <a href="terms.html" target="_blank" rel="noopener">Terms &amp; Refund Policy</a>, and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>' +
        '<label for="sig">Type your full legal name to sign</label><input id="sig" class="sig" maxlength="100" autocomplete="name">' +
        '<label class="agree"><input type="checkbox" id="agree"> I have read and agree to the Service Agreement, Terms &amp; Refund Policy, and Privacy Policy. I understand that typing my name is my electronic signature.</label>' +
        "</div></div>" +
        '<aside class="card summary-card"><h3>Summary</h3><div class="summary" id="sum"></div>' +
        '<button class="btn btn-primary btn-block" id="sign-btn" style="margin-top:18px"><svg width="16" height="16"><use href="#i-pen"/></svg>Sign &amp; continue to payment</button>' +
        '<div class="msg" id="sign-msg" role="status"></div><p class="fine">Secure payment by Stripe on the next step.</p></aside></div>';
      var pick = $(".plan-pick", cbox);
      plans().forEach(function (p) {
        var lab = document.createElement("label"); lab.className = "pick";
        lab.innerHTML = '<input type="radio" name="plan"><span class="pick-name"></span><span class="pick-price"></span>' + (p.key === inv.recommended_plan ? '<span class="rec">Recommended for you</span>' : "");
        $("input", lab).value = p.key; $("input", lab).checked = p.key === sel.plan;
        $(".pick-name", lab).textContent = p.name;
        pick.appendChild(lab);
      });
      var ap = $(".addon-pick", cbox);
      if (!ADL.length) ap.innerHTML = '<p class="muted-inline">No add-ons available right now.</p>';
      ADL.forEach(function (a) {
        var lab = document.createElement("label"); lab.className = "pick";
        lab.innerHTML = '<input type="checkbox"><span class="pick-name"></span><span class="pick-price"></span>';
        $("input", lab).value = a.key;
        $(".pick-name", lab).textContent = a.name;
        $(".pick-price", lab).textContent = money(a.price) + " " + unitLabel(a.unit);
        ap.appendChild(lab);
      });
      var update = function () {
        $$(".plan-pick .pick", cbox).forEach(function (lab) {
          var k = $("input", lab).value;
          $(".pick-price", lab).textContent = money(PR[k][sel.period]) + (sel.period === "yearly" ? "/year" : "/month");
          lab.classList.toggle("on", $("input", lab).checked);
        });
        $$(".addon-pick .pick", cbox).forEach(function (lab) { lab.classList.toggle("on", $("input", lab).checked); });
        var p = PR[sel.plan], today = p[sel.period], monthlyAdd = 0;
        var sum = $("#sum"); sum.innerHTML = "";
        var row = function (label, amt, cls) {
          var d = document.createElement("div"); if (cls) d.className = cls;
          var a = document.createElement("span"); a.textContent = label;
          var b = document.createElement("b"); b.textContent = amt;
          d.appendChild(a); d.appendChild(b); sum.appendChild(d);
        };
        row(p.name + " plan (" + sel.period + ")", money(p[sel.period]));
        if (fee) { row("Setup fee (one-time)", money(fee)); today += fee; }
        Object.keys(sel.addons).filter(function (k) { return sel.addons[k] && AD[k]; }).forEach(function (k) {
          row(addonLine(AD[k]), money(AD[k].price));
          today += +AD[k].price || 0;
          if (AD[k].unit === "month") monthlyAdd += +AD[k].price || 0;
        });
        row("Due today", money(today), "total");
        var after = document.createElement("p");
        after.className = "fine after";
        after.textContent = "Then " + money(p[sel.period]) + (sel.period === "yearly" ? " per year" : " per month") +
          (monthlyAdd ? ", plus " + money(monthlyAdd) + " per month for add-ons." : ".");
        sum.appendChild(after);
      };
      $$('input[name="plan"]', cbox).forEach(function (r) { r.addEventListener("change", function () { sel.plan = r.value; update(); }); });
      $$(".addon-pick input", cbox).forEach(function (c) { c.addEventListener("change", function () { sel.addons[c.value] = c.checked; update(); }); });
      bindToggle(function (per) { sel.period = per; update(); });
      update();
      $("#sign-btn").addEventListener("click", function () {
        var msg = $("#sign-msg"), name = $("#sig").value.trim();
        msg.className = "msg";
        if (name.length < 2) { msg.className = "msg err"; msg.textContent = "Please type your full name to sign."; $("#sig").focus(); return; }
        if (!$("#agree").checked) { msg.className = "msg err"; msg.textContent = "Please check the box to agree to the terms."; return; }
        var btn = this; btn.disabled = true; btn.textContent = "Signing…";
        var chosen = Object.keys(sel.addons).filter(function (k) { return sel.addons[k]; });
        sb.rpc("sign_and_get_links", { p_code: code, p_name: name, p_plan: sel.plan, p_period: sel.period, p_addons: chosen }).then(function (res) {
          if (res.error || !res.data) {
            btn.disabled = false; btn.textContent = "Sign & continue to payment";
            var why = (res.error && res.error.message) || "";
            msg.className = "msg err";
            msg.textContent = /add-on/i.test(why)
              ? "One of the add-ons you picked can’t be checked out yet. Please email me and I’ll fix it right away."
              : "This link may have expired. Please email me and I’ll send a new one.";
            return;
          }
          track("contract_signed", sel.plan + "_" + sel.period);
          window.scrollTo(0, 0);
          showPay({ signed_name: name, chosen_plan: sel.plan, chosen_period: sel.period, chosen_addons: chosen }, res.data);
        });
      });
    };
    if (!sb) showLocked("Checkout isn’t available yet", "Please book a Zoom meeting first. After the call, you’ll get a private checkout link.");
    else if (!code) showLocked("Checkout opens after your Zoom meeting", "To keep things personal, payment is only available through a private link I send after we meet. Book your free call to get started.");
    else {
      settingsReady.then(function () {
        sb.rpc("get_invite", { p_code: code }).then(function (res) {
          var inv = res.data;
          if (res.error || !inv) { showLocked("This checkout link isn’t valid", "It may have expired (links last 14 days). Email me and I’ll send a fresh one, or book a new call."); return; }
          var hi = $("#hello");
          if (hi) hi.textContent = "Hi " + inv.client_name.split(" ")[0] + ", thanks for meeting with me!";
          if (inv.signed) showPay(inv, inv.links);
          else showForm(inv);
        });
      });
    }
  }
})();

/* ---------- Gallery motion ---------- */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  if (reduce || !("IntersectionObserver" in window)) return;
  root.classList.add("js-reveal");

  /* 1. Tag blocks to reveal, with a stagger inside groups */
  $$("main section:not(.photo-hero):not(.page-head) .section-head, main .head-row > *, main .closer .wrap > *, main .doc, main .picked, main #booking, main .pricing-bar, main .demo-copy > *, main .lt-wrap, main .setup-card")
    .forEach(function (el) { el.classList.add("reveal"); });
  function stagger(g) {
    Array.prototype.forEach.call(g.children, function (c, i) {
      c.classList.add("reveal");
      c.style.setProperty("--d", Math.min(i, 6) * 90 + "ms");
    });
  }
  $$(".steps, .plans, .grid:not(#review-list), .flow, .facts-row, .stack, .split, .benefits").forEach(stagger);
  $$(".closer .wrap > *").forEach(function (c, i) { c.style.setProperty("--d", i * 110 + "ms"); });

  /* 2. Reveal on scroll */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
      $$("[data-count]", e.target).forEach(countUp);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach(function (el) { io.observe(el); });

  /* Content that is drawn later (reviews, saved settings): animate as it arrives */
  window.__psReveal = function (nodes) {
    nodes.forEach(function (c, i) {
      if (c.classList.contains("reveal")) return;
      c.classList.add("reveal"); c.style.setProperty("--d", Math.min(i, 6) * 90 + "ms"); io.observe(c);
    });
  };
  var rl = document.getElementById("review-list");
  if (rl && window.MutationObserver) {
    new MutationObserver(function () { window.__psReveal(Array.prototype.slice.call(rl.children)); }).observe(rl, { childList: true });
  }

  function countUp(el) {
    var target = Number(el.getAttribute("data-count")), start = null, node = el.firstChild;
    function tick(t) {
      if (!start) start = t;
      var k = Math.min(1, (t - start) / 900), e = 1 - Math.pow(1 - k, 3);
      node.nodeValue = "$" + Math.round(target * e);
      if (k < 1) requestAnimationFrame(tick);
    }
    node.nodeValue = "$0"; requestAnimationFrame(tick);
  }

  /* 3. Hero entrance on load */
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("loaded"); }); });

  /* 4. Hero photo drifts slightly as you scroll */
  var bg = document.querySelector(".photo-hero .hero-bg");
  if (bg) {
    var ticking = false;
    var upd = function () {
      ticking = false;
      var y = Math.min(window.scrollY, window.innerHeight);
      bg.style.setProperty("--py", (y * 0.18).toFixed(1) + "px");
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  }
})();

(function () {
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  /* 5. Live demo embeds: scale a full-size site into the laptop screen */
  var lives = $$(".live");
  if (lives.length) {
    var fit = function (el) {
      var w = Number(el.dataset.w);
      if (w) el.style.setProperty("--s", (el.clientWidth / w).toFixed(4));
    };
    lives.forEach(function (el) {
      var f = el.querySelector("iframe");
      if (f) f.addEventListener("load", function () { if (f.getAttribute("src")) el.classList.add("ready"); });
      fit(el);
    });
    if ("ResizeObserver" in window) { var ro = new ResizeObserver(function (en) { en.forEach(function (e) { fit(e.target); }); }); lives.forEach(function (el) { ro.observe(el); }); }
    else window.addEventListener("resize", function () { lives.forEach(fit); });
  }
})();
