(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var sb = null;
  if (C.supabaseUrl && C.supabaseAnonKey && window.supabase) {
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Anonymous analytics ---------- */
  function sessionId() {
    try {
      var id = sessionStorage.getItem("ps_sid");
      if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("ps_sid", id); }
      return id;
    } catch (e) { return "nosession"; }
  }
  function device() {
    var w = window.innerWidth;
    return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  }
  function track(event, label) {
    if (!sb) return;
    var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : "";
    sb.from("page_views").insert({
      event: event, label: label ? String(label).slice(0, 80) : null,
      path: location.pathname.slice(0, 200), referrer: ref.slice(0, 300),
      device: device(), session_id: sessionId()
    }).then(function () {}, function () {});
  }
  window.psTrack = track;
  track("view");
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (el) track("click", el.getAttribute("data-track"));
  });

  /* ---------- Contact info ---------- */
  $("#year").textContent = new Date().getFullYear();
  if (C.email) { var em = $("#c-email"); em.href = "mailto:" + C.email; em.querySelector("span").textContent = C.email; em.setAttribute("data-track", "email"); }
  else $("#c-email").remove();
  if (C.instagram) { var ig = $("#c-ig"); ig.href = "https://instagram.com/" + C.instagram; ig.querySelector("span").textContent = "@" + C.instagram; ig.setAttribute("data-track", "instagram"); }
  else $("#c-ig").remove();

  /* ---------- Pricing toggle + Stripe links ---------- */
  var period = "monthly";
  var stripe = C.stripe || {};
  function updatePlans() {
    $$(".toggle button").forEach(function (b) { b.classList.toggle("on", b.dataset.period === period); });
    $$("[data-monthly]").forEach(function (el) {
      var v = el.getAttribute("data-" + period);
      var target = el.classList.contains("price") ? el.querySelector("span") : el;
      if (el.tagName === "SMALL") el.textContent = v; else target.textContent = v;
    });
    $$("[data-plan]").forEach(function (a) {
      var key = a.dataset.plan;
      var linkKey = key.indexOf("addon") === 0 ? key : key + (period === "yearly" ? "Yearly" : "Monthly");
      var url = stripe[linkKey];
      if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
      else { a.href = "#book"; a.removeAttribute("target"); }
      a.setAttribute("data-track", "plan_" + linkKey);
    });
  }
  $$(".toggle button").forEach(function (b) {
    b.addEventListener("click", function () { period = b.dataset.period; updatePlans(); track("click", "toggle_" + period); });
  });
  updatePlans();

  /* ---------- Zoom booking ---------- */
  var booking = $("#booking");
  if (C.bookingLink) {
    var f = document.createElement("iframe");
    f.className = "booking-frame card";
    f.style.padding = "0";
    f.src = C.bookingLink;
    f.title = "Book a Zoom call with Project Sarae";
    f.loading = "lazy";
    booking.appendChild(f);
    var p = document.createElement("p");
    p.className = "fine"; p.style.textAlign = "center";
    p.innerHTML = 'Calendar not loading? <a target="_blank" rel="noopener" data-track="booking_open">Open the booking page</a>.';
    p.querySelector("a").href = C.bookingLink;
    booking.appendChild(p);
  } else {
    booking.innerHTML =
      '<div class="card booking-empty"><div class="icon" style="margin:0 auto 16px"><svg width="20" height="20"><use href="#i-video"/></svg></div>' +
      '<h3>Online booking is coming soon</h3><p>Email me with two or three times that work for you, and I’ll send a Zoom link.</p>' +
      '<a class="btn btn-primary" data-track="booking_email">Email to book a call</a></div>';
    var b = booking.querySelector("a");
    b.href = "mailto:" + (C.email || "") + "?subject=" + encodeURIComponent("Zoom call: website for my business");
  }

  /* ---------- Your photo, About text, portfolio (from admin) ---------- */
  function applySettings(map) {
    if (map.about_photo) {
      var por = $("#portrait");
      por.innerHTML = "";
      var img = document.createElement("img");
      img.src = map.about_photo; img.alt = C.ownerName || "Owner photo";
      por.appendChild(img);
    }
    if (map.about_text) $("#about-text").textContent = map.about_text;
    $$("[data-setting]").forEach(function (el) { var v = map[el.dataset.setting]; if (v) el.src = v; });
    $$("[data-setting-text]").forEach(function (el) { var v = map[el.dataset.settingText]; if (v) el.textContent = v; });
  }
  if (sb) {
    sb.from("site_settings").select("key,value").then(function (res) {
      if (res.error || !res.data) return;
      var map = {};
      res.data.forEach(function (r) { map[r.key] = r.value; });
      applySettings(map);
    });
  }

  /* ---------- Reviews ---------- */
  function stars(n) { return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n); }
  function renderReviews(rows) {
    var list = $("#review-list"), sum = $("#rating-summary");
    list.innerHTML = ""; sum.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = '<div class="empty">No reviews yet. Be the first to share your experience.</div>';
      return;
    }
    var avg = rows.reduce(function (a, r) { return a + r.rating; }, 0) / rows.length;
    sum.className = "rating-summary";
    sum.innerHTML = "<b></b><div><div class='stars' style='color:#E0A93B;letter-spacing:2px'></div><div></div></div>";
    sum.querySelector("b").textContent = avg.toFixed(1);
    sum.querySelector(".stars").textContent = stars(Math.round(avg));
    sum.querySelector("div div:last-child").textContent = rows.length + (rows.length === 1 ? " review" : " reviews");
    rows.forEach(function (r) {
      var card = document.createElement("article");
      card.className = "card review";
      card.innerHTML = '<div class="stars"></div><blockquote></blockquote><div class="who"></div>';
      card.querySelector(".stars").textContent = stars(r.rating);
      card.querySelector(".stars").setAttribute("aria-label", r.rating + " out of 5 stars");
      card.querySelector("blockquote").textContent = r.body;
      var who = card.querySelector(".who");
      who.textContent = r.name;
      if (r.business) { var s = document.createElement("span"); s.textContent = " · " + r.business; who.appendChild(s); }
      list.appendChild(card);
    });
  }
  if (sb) {
    sb.from("reviews").select("name,business,rating,body,created_at").eq("approved", true)
      .order("created_at", { ascending: false }).limit(50)
      .then(function (res) { renderReviews(res.error ? [] : res.data || []); });
  } else {
    renderReviews([]);
  }

  var rating = 0;
  $$("#star-input button").forEach(function (b) {
    b.addEventListener("click", function () {
      rating = +b.dataset.v;
      $$("#star-input button").forEach(function (x) { x.classList.toggle("on", +x.dataset.v <= rating); });
    });
  });
  $("#review-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("#review-msg");
    var name = $("#r-name").value.trim(), business = $("#r-business").value.trim(), body = $("#r-body").value.trim();
    msg.className = "msg";
    if (!name || !body || !rating) { msg.className = "msg err"; msg.textContent = "Please add your name, a star rating, and your review."; return; }
    if (!sb) { msg.className = "msg err"; msg.textContent = "Reviews aren’t connected yet. Please check back soon."; return; }
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Sending…";
    sb.from("reviews").insert({ name: name, business: business || null, rating: rating, body: body }).then(function (res) {
      btn.disabled = false; btn.textContent = "Submit review";
      if (res.error) { msg.className = "msg err"; msg.textContent = "Something went wrong. Please try again."; return; }
      e.target.reset(); rating = 0;
      $$("#star-input button").forEach(function (x) { x.classList.remove("on"); });
      msg.className = "msg ok"; msg.textContent = "Thank you! Your review will appear once it’s approved.";
      track("review_submitted");
    });
  });
})();
