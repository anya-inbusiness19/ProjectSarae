(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var sb = null;
  if (C.supabaseUrl && C.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = document.body.getAttribute("data-page") || "";
  var PRICES = {
    starter:  { name: "Starter",  monthly: 50,  yearly: 500 },
    business: { name: "Business", monthly: 80,  yearly: 800 },
    pro:      { name: "Pro",      monthly: 120, yearly: 1200 }
  };
  var ADDONS = {
    addonAccounts: { name: "Customer accounts / member area", price: 100 },
    addonStore:    { name: "Online store", price: 150 }
  };
  var SETUP_FEE = 180;
  function money(n) { return "$" + n.toLocaleString("en-US"); }

  /* ---------- Icons ---------- */
  var P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    search: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    down: '<path d="M3 7l7 7 4-4 7 7M21 12v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18" stroke="currentColor" stroke-width="2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    chat: '<path d="M4 5h16v11H9l-5 4V5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    users: '<circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5M16 4.8a3.4 3.4 0 010 6.4M18 14.8c2 .7 3.3 2.5 3.6 5.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    pie: '<path d="M12 3a9 9 0 109 9h-9V3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15 3.5A9 9 0 0120.5 9H15V3.5z" fill="currentColor"/>',
    globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" fill="none" stroke="currentColor" stroke-width="2"/>',
    key: '<circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 12l9-9M16 7l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    file: '<path d="M6 3h8l4 4v14H6V3z M14 3v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    repeat: '<path d="M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 6l8.5 7 8.5-7" fill="none" stroke="currentColor" stroke-width="2"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 10l5-3v10l-5-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
  };
  var sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">';
  Object.keys(P).forEach(function (k) { sprite += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + P[k] + "</symbol>"; });
  document.body.insertAdjacentHTML("afterbegin", sprite + "</svg>");

  /* ---------- Header & footer (same on every page) ---------- */
  var links = [
    ["index.html", "Home", "home"], ["services.html", "Services", "services"], ["work.html", "Work", "work"],
    ["pricing.html", "Pricing", "pricing"], ["about.html", "About", "about"], ["reviews.html", "Reviews", "reviews"]
  ];
  var head = $("#site-header");
  if (head) {
    head.outerHTML =
      '<header class="nav"><div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="Project Sarae home"><img src="images/logo-white.png" alt="" class="brand-logo"><span>PROJECT SARAE</span></a>' +
      '<button class="menu-btn" aria-label="Open menu" aria-expanded="false"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<nav class="nav-links">' +
      links.map(function (l) { return '<a href="' + l[0] + '"' + (page === l[2] ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<a class="btn btn-primary" href="book.html" data-track="nav_book">Book a Zoom call</a></nav></div></header>';
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
      '<div><a class="brand" href="index.html"><img src="images/logo-white.png" alt="" class="brand-logo"><span>PROJECT SARAE</span></a>' +
      '<p class="foot-tag">Websites for local businesses, built for you and kept up for you.</p></div>' +
      '<div><h4>Explore</h4>' + links.map(function (l) { return '<a href="' + l[0] + '">' + l[1] + "</a>"; }).join("") + "</div>" +
      '<div><h4>Policies</h4><a href="contract.html">Service Agreement</a><a href="terms.html">Terms &amp; Refunds</a><a href="privacy.html">Privacy Policy</a></div>' +
      '<div><h4>Contact</h4>' +
      (C.email ? '<a href="mailto:' + C.email + '" data-track="email">' + C.email + "</a>" : "") +
      (C.instagram ? '<a href="https://instagram.com/' + C.instagram + '" target="_blank" rel="noopener" data-track="instagram">@' + C.instagram + "</a>" : "") +
      '<a href="book.html">Book a Zoom call</a></div>' +
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

  /* ---------- Photo, About text, portfolio (managed in admin) ---------- */
  if (sb && $("[data-setting], [data-setting-text], #portrait, #about-text")) {
    sb.from("site_settings").select("key,value").then(function (res) {
      if (res.error || !res.data) return;
      var map = {};
      res.data.forEach(function (r) { map[r.key] = r.value; });
      var por = $("#portrait");
      if (por && map.about_photo) {
        por.innerHTML = "";
        var img = document.createElement("img"); img.src = map.about_photo; img.alt = C.ownerName || "Owner photo";
        por.appendChild(img);
      }
      if ($("#about-text") && map.about_text) $("#about-text").textContent = map.about_text;
      $$("[data-setting]").forEach(function (el) { var v = map[el.dataset.setting]; if (v) el.src = v; });
      $$("[data-setting-text]").forEach(function (el) { var v = map[el.dataset.settingText]; if (v) el.textContent = v; });
    });
  }

  /* ---------- Pricing page ---------- */
  function bindToggle(onChange) {
    $$(".toggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".toggle button").forEach(function (x) { x.classList.toggle("on", x === b); });
        onChange(b.dataset.period);
      });
    });
  }
  if (page === "pricing") {
    var setPeriod = function (period) {
      $$(".plan[data-plan]").forEach(function (card) {
        var key = card.dataset.plan, p = PRICES[key];
        $(".price span", card).textContent = money(p[period]);
        $(".price small", card).textContent = period === "yearly" ? "/year" : "/month";
        $(".note", card).textContent = period === "yearly" ? "Save " + money(p.monthly * 12 - p.yearly) + " vs. monthly" : "";
        var a = $("a.btn", card);
        a.href = "book.html?plan=" + key + "&period=" + period;
        a.setAttribute("data-track", "choose_" + key + "_" + period);
      });
      track("click", "toggle_" + period);
    };
    bindToggle(setPeriod);
    setPeriod("monthly");
  }

  /* ---------- Booking page ---------- */
  if (page === "book") {
    var q = new URLSearchParams(location.search);
    var plan = PRICES[q.get("plan")] ? q.get("plan") : "";
    var period = q.get("period") === "yearly" ? "yearly" : "monthly";
    var banner = $("#picked");
    if (plan && banner) {
      banner.hidden = false;
      $("#picked-plan", banner).textContent = PRICES[plan].name + " plan · " + money(PRICES[plan][period]) + (period === "yearly" ? "/year" : "/month");
    }
    var booking = $("#booking");
    if (C.bookingLink) {
      var url = C.bookingLink;
      if (plan && /cal\.com/.test(url)) {
        url += (url.indexOf("?") > -1 ? "&" : "?") + "notes=" + encodeURIComponent("Interested in the " + PRICES[plan].name + " plan (" + period + ")");
      }
      var f = document.createElement("iframe");
      f.className = "booking-frame card"; f.src = /cal\.com/.test(url) ? url.replace(/^(https:\/\/cal\.com\/[^?#]+?)\/?(\?|#|$)/, "$1/embed$2") : url; f.loading = "lazy";
      f.title = "Book a Zoom call with Project Sarae";
      booking.appendChild(f);
      var p = document.createElement("p");
      p.className = "fine"; p.style.textAlign = "center";
      p.innerHTML = 'Calendar not loading? <a target="_blank" rel="noopener" data-track="booking_open">Open the booking page</a>.';
      $("a", p).href = url;
      booking.appendChild(p);
    } else {
      booking.innerHTML =
        '<div class="card booking-empty"><div class="icon" style="margin:0 auto 16px"><svg width="20" height="20"><use href="#i-video"/></svg></div>' +
        "<h3>Online booking is coming soon</h3><p>Email me two or three times that work for you, and I’ll send a Zoom link.</p>" +
        '<a class="btn btn-primary" data-track="booking_email">Email to book a call</a></div>';
      var subj = "Zoom call: website for my business" + (plan ? " (" + PRICES[plan].name + " plan)" : "");
      $("a", booking).href = "mailto:" + (C.email || "") + "?subject=" + encodeURIComponent(subj);
    }
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
        if (limit < 50) { var sec = reviewList.closest("section"); if (sec) sec.hidden = true; return; }
        reviewList.innerHTML = '<div class="empty">No reviews yet. Be the first to share your experience.</div>';
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
        .then(function (res) { render(res.error ? [] : res.data || []); });
    } else render([]);
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
    var box = $("#checkout");
    var code = new URLSearchParams(location.search).get("code") || "";
    var showLocked = function (title, text) {
      box.innerHTML =
        '<div class="card locked"><div class="icon" style="margin:0 auto 16px"><svg width="20" height="20"><use href="#i-lock"/></svg></div>' +
        "<h2></h2><p></p>" +
        '<div class="hero-actions" style="justify-content:center;margin-top:22px"><a class="btn btn-primary" href="book.html">Book a free Zoom call</a><a class="btn btn-ghost" href="pricing.html">See pricing</a></div></div>';
      $("h2", box).textContent = title; $("p", box).textContent = text;
    };
    var showPay = function (inv, links) {
      var plan = PRICES[inv.chosen_plan], per = inv.chosen_period;
      var addons = (inv.chosen_addons || []).filter(function (k) { return ADDONS[k]; });
      var planToday = SETUP_FEE + plan[per];
      var total = planToday + addons.reduce(function (a, k) { return a + ADDONS[k].price; }, 0);
      box.innerHTML =
        '<div class="card pay-card"><div class="icon"><svg width="20" height="20"><use href="#i-check"/></svg></div>' +
        "<h2>You’re all set to pay</h2>" +
        '<p class="signed-line"></p>' +
        '<div class="summary" id="pay-sum"></div>' +
        '<div class="pay-buttons"></div>' +
        '<p class="fine">Payments are processed securely by Stripe. After today, your plan renews automatically ' + (per === "yearly" ? "each year" : "on the same date each month") + ". Questions? <a data-email></a></p></div>";
      $(".signed-line", box).textContent = "Agreement signed by " + inv.signed_name + ". You can read the full terms anytime on the Service Agreement page." +
        (addons.length ? " Your add-ons are paid as a separate one-time payment." : "");
      var sum = $("#pay-sum");
      var line = function (label, amt, cls) {
        var d = document.createElement("div"); if (cls) d.className = cls;
        var a = document.createElement("span"); a.textContent = label;
        var b = document.createElement("b"); b.textContent = amt;
        d.appendChild(a); d.appendChild(b); sum.appendChild(d);
      };
      line(plan.name + " plan (" + per + ")", money(plan[per]) + (per === "yearly" ? "/year" : "/month"));
      line("One-time setup", money(SETUP_FEE));
      addons.forEach(function (k) { line(ADDONS[k].name + " (one-time)", money(ADDONS[k].price)); });
      line("Due today", money(total), "total");
      var pb = $(".pay-buttons", box);
      var addBtn = function (label, url, track_) {
        var a = document.createElement("a");
        a.className = "btn btn-primary btn-block"; a.textContent = label;
        if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("data-track", track_); }
        else { a.className = "btn btn-ghost btn-block"; a.textContent = label + " (link coming by email)"; }
        pb.appendChild(a);
      };
      var n = addons.length ? 1 : 0;
      addBtn((n ? "Step 1: " : "") + "Pay " + money(planToday) + " for plan + setup", links && links.plan_url, "pay_" + inv.chosen_plan + "_" + per);
      addons.forEach(function (k, i) {
        var l = links && (links.addons || []).filter(function (x) { return x.key === k; })[0];
        addBtn("Step " + (i + 2) + ": Pay " + money(ADDONS[k].price) + " for " + ADDONS[k].name.toLowerCase(), l && l.url, "pay_" + k);
      });
      var em = $("[data-email]", box); if (C.email) { em.href = "mailto:" + C.email; em.textContent = C.email; }
    };
    var showForm = function (inv) {
      var sel = { plan: inv.recommended_plan || "business", period: "monthly", addons: {} };
      box.innerHTML =
        '<div class="checkout-grid"><div class="stack">' +
        '<div class="card"><span class="step-label">Step 1</span><h3>Choose your plan</h3>' +
        '<div class="toggle" role="group" aria-label="Billing period" style="margin:14px 0 16px"><button type="button" class="on" data-period="monthly">Monthly</button><button type="button" data-period="yearly">Yearly <small>2 months free</small></button></div>' +
        '<div class="plan-pick" role="radiogroup"></div></div>' +
        '<div class="card"><span class="step-label">Step 2</span><h3>Add-ons <span class="muted-inline">(optional)</span></h3><div class="addon-pick"></div></div>' +
        '<div class="card"><span class="step-label">Step 3</span><h3>Review &amp; sign the agreement</h3>' +
        '<ul class="key-terms">' +
        "<li>3-month minimum, then month-to-month. Cancel anytime after that.</li>" +
        "<li>The $180 setup fee is fully refundable until your first draft is delivered.</li>" +
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
      var pick = $(".plan-pick", box);
      Object.keys(PRICES).forEach(function (k) {
        var lab = document.createElement("label"); lab.className = "pick";
        lab.innerHTML = '<input type="radio" name="plan"><span class="pick-name"></span><span class="pick-price"></span>' + (k === inv.recommended_plan ? '<span class="rec">Recommended for you</span>' : "");
        $("input", lab).value = k; $("input", lab).checked = k === sel.plan;
        $(".pick-name", lab).textContent = PRICES[k].name;
        pick.appendChild(lab);
      });
      var ap = $(".addon-pick", box);
      Object.keys(ADDONS).forEach(function (k) {
        var lab = document.createElement("label"); lab.className = "pick";
        lab.innerHTML = '<input type="checkbox"><span class="pick-name"></span><span class="pick-price"></span>';
        $("input", lab).value = k;
        $(".pick-name", lab).textContent = ADDONS[k].name;
        $(".pick-price", lab).textContent = money(ADDONS[k].price) + " one-time";
        ap.appendChild(lab);
      });
      var update = function () {
        $$(".plan-pick .pick", box).forEach(function (lab) {
          var k = $("input", lab).value;
          $(".pick-price", lab).textContent = money(PRICES[k][sel.period]) + (sel.period === "yearly" ? "/year" : "/month");
          lab.classList.toggle("on", $("input", lab).checked);
        });
        $$(".addon-pick .pick", box).forEach(function (lab) { lab.classList.toggle("on", $("input", lab).checked); });
        var p = PRICES[sel.plan], today = SETUP_FEE + p[sel.period];
        var rows = '<div><span></span><b></b></div><div><span>One-time setup</span><b>' + money(SETUP_FEE) + "</b></div>";
        var extra = Object.keys(sel.addons).filter(function (k) { return sel.addons[k]; });
        extra.forEach(function () { rows += "<div><span></span><b></b></div>"; });
        rows += '<div class="total"><span>Due today</span><b></b></div>';
        var sum = $("#sum"); sum.innerHTML = rows;
        var lines = $$("div", sum);
        $("span", lines[0]).textContent = p.name + " plan (" + sel.period + ")";
        $("b", lines[0]).textContent = money(p[sel.period]);
        extra.forEach(function (k, i) {
          $("span", lines[2 + i]).textContent = ADDONS[k].name;
          $("b", lines[2 + i]).textContent = money(ADDONS[k].price);
          today += ADDONS[k].price;
        });
        $("b", lines[lines.length - 1]).textContent = money(today);
        var after = $(".after", sum) || document.createElement("p");
        after.className = "fine after";
        after.textContent = "Then " + money(p[sel.period]) + (sel.period === "yearly" ? " per year." : " per month.");
        sum.appendChild(after);
      };
      $$('input[name="plan"]', box).forEach(function (r) { r.addEventListener("change", function () { sel.plan = r.value; update(); }); });
      $$(".addon-pick input", box).forEach(function (c) { c.addEventListener("change", function () { sel.addons[c.value] = c.checked; update(); }); });
      bindToggle(function (per) { sel.period = per; update(); });
      update();
      $("#sign-btn").addEventListener("click", function () {
        var msg = $("#sign-msg"), name = $("#sig").value.trim();
        msg.className = "msg";
        if (name.length < 2) { msg.className = "msg err"; msg.textContent = "Please type your full name to sign."; $("#sig").focus(); return; }
        if (!$("#agree").checked) { msg.className = "msg err"; msg.textContent = "Please check the box to agree to the terms."; return; }
        var btn = this; btn.disabled = true; btn.textContent = "Signing…";
        var addons = Object.keys(sel.addons).filter(function (k) { return sel.addons[k]; });
        sb.rpc("sign_and_get_links", { p_code: code, p_name: name, p_plan: sel.plan, p_period: sel.period, p_addons: addons }).then(function (res) {
          if (res.error || !res.data) {
            btn.disabled = false; btn.textContent = "Sign & continue to payment";
            msg.className = "msg err"; msg.textContent = "This link may have expired. Please email me and I’ll send a new one.";
            return;
          }
          track("contract_signed", sel.plan + "_" + sel.period);
          window.scrollTo(0, 0);
          showPay({ signed_name: name, chosen_plan: sel.plan, chosen_period: sel.period, chosen_addons: addons }, res.data);
        });
      });
    };
    if (!sb) showLocked("Checkout isn’t available yet", "Please book a Zoom call first. After the call, you’ll get a private checkout link.");
    else if (!code) showLocked("Checkout opens after your Zoom call", "To keep things personal, payment is only available through a private link I send after we meet. Book your free call to get started.");
    else {
      sb.rpc("get_invite", { p_code: code }).then(function (res) {
        var inv = res.data;
        if (res.error || !inv) { showLocked("This checkout link isn’t valid", "It may have expired (links last 14 days). Email me and I’ll send a fresh one, or book a new call."); return; }
        var hi = $("#hello");
        if (hi) hi.textContent = "Hi " + inv.client_name.split(" ")[0] + ", thanks for meeting with me!";
        if (inv.signed) showPay(inv, inv.links);
        else showForm(inv);
      });
    }
  }
})();
