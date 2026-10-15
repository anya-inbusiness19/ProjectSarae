(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function show(el, on) { el.classList.toggle("hidden", !on); }

  if (!(C.supabaseUrl && C.supabaseAnonKey && window.supabase)) { show($("#not-configured"), true); return; }
  var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  var settings = {};

  /* ---------- Auth ---------- */
  async function enter() {
    var s = await sb.auth.getSession();
    if (!s.data.session) { show($("#login"), true); show($("#dash"), false); show($("#logout"), false); return; }
    var chk = await sb.rpc("is_admin");
    if (chk.error || chk.data !== true) {
      await sb.auth.signOut();
      show($("#login"), true);
      $("#login-msg").className = "msg err";
      $("#login-msg").textContent = "This account doesn’t have admin access.";
      return;
    }
    show($("#login"), false); show($("#dash"), true); show($("#logout"), true);
    loadAnalytics(); loadReviews(); loadSettings(); loadInvites(); loadLinks();
  }
  $("#login").addEventListener("submit", async function (e) {
    e.preventDefault();
    var msg = $("#login-msg"); msg.className = "msg"; msg.textContent = "Signing in…";
    var r = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    if (r.error) { msg.className = "msg err"; msg.textContent = "Wrong email or password."; return; }
    msg.textContent = ""; enter();
  });
  $("#logout").addEventListener("click", async function () { await sb.auth.signOut(); location.reload(); });

  /* ---------- Tabs ---------- */
  $$(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
      ["analytics", "clients", "reviews", "content"].forEach(function (t) { show($("#tab-" + t), t === b.dataset.tab); });
    });
  });

  /* ---------- Analytics ---------- */
  async function fetchEvents(days) {
    var since = new Date(Date.now() - days * 864e5).toISOString();
    var all = [], from = 0, step = 1000;
    while (from < 50000) {
      var r = await sb.from("page_views").select("created_at,event,label,referrer,device,session_id")
        .gte("created_at", since).order("created_at", { ascending: true }).range(from, from + step - 1);
      if (r.error || !r.data) break;
      all = all.concat(r.data);
      if (r.data.length < step) break;
      from += step;
    }
    return all;
  }
  function countBy(arr, fn) {
    var m = {};
    arr.forEach(function (x) { var k = fn(x); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function fillList(id, pairs, empty) {
    var ul = $(id); ul.innerHTML = "";
    if (!pairs.length) { ul.innerHTML = '<li><span class="muted">' + empty + "</span></li>"; return; }
    pairs.slice(0, 8).forEach(function (p) {
      var li = document.createElement("li");
      var a = document.createElement("span"); a.textContent = p[0];
      var b = document.createElement("b"); b.textContent = p[1];
      li.appendChild(a); li.appendChild(b); ul.appendChild(li);
    });
  }
  var clickNames = {
    nav_book: "Book call (menu)", hero_book: "Book call (top)", cta_book: "Book call (bottom)",
    booking_open: "Opened booking page", booking_email: "Email to book", email: "Email link", instagram: "Instagram link",
    about_book: "Book call (about page)", toggle_yearly: "Viewed yearly prices", toggle_monthly: "Viewed monthly prices"
  };
  function niceClick(l) {
    if (clickNames[l]) return clickNames[l];
    var cap = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };
    if (l.indexOf("choose_") === 0) return "Chose plan: " + l.slice(7).split("_").map(cap).join(" ");
    if (l.indexOf("pay_") === 0) return "Clicked pay: " + l.slice(4).replace(/([A-Z])/g, " $1").split("_").map(cap).join(" ");
    return l;
  }
  function drawChart(views, days) {
    var svg = $("#chart"), W = svg.clientWidth || 800, H = 220, pad = { l: 34, r: 8, t: 12, b: 26 };
    var buckets = [], map = {};
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(Date.now() - i * 864e5), key = d.toLocaleDateString("en-CA");
      buckets.push({ key: key, label: (d.getMonth() + 1) + "/" + d.getDate(), set: {} });
      map[key] = buckets[buckets.length - 1];
    }
    views.forEach(function (v) { var b = map[new Date(v.created_at).toLocaleDateString("en-CA")]; if (b) b.set[v.session_id || Math.random()] = 1; });
    var vals = buckets.map(function (b) { return Object.keys(b.set).length; });
    var max = Math.max(4, Math.max.apply(null, vals));
    var cw = (W - pad.l - pad.r) / buckets.length, bw = Math.max(2, cw * 0.62);
    var h = '<g font-size="10" fill="#627588" font-family="inherit">';
    [0, 0.5, 1].forEach(function (f) {
      var y = pad.t + (H - pad.t - pad.b) * (1 - f);
      h += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y + '" y2="' + y + '" stroke="#E5E0D6"/>';
      h += '<text x="' + (pad.l - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + Math.round(max * f) + "</text>";
    });
    var every = Math.ceil(buckets.length / 10);
    buckets.forEach(function (b, i) {
      var v = vals[i], bh = (H - pad.t - pad.b) * v / max, x = pad.l + i * cw + (cw - bw) / 2, y = H - pad.b - bh;
      h += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + Math.max(bh, v ? 2 : 0) + '" rx="3" fill="#3B75A4"><title>' + b.label + ": " + v + " visitors</title></rect>";
      if (i % every === 0) h += '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + b.label + "</text>";
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = h + "</g>";
  }
  async function loadAnalytics() {
    var days = +$("#range").value;
    var ev = await fetchEvents(days);
    var views = ev.filter(function (e) { return e.event === "view"; });
    var clicks = ev.filter(function (e) { return e.event === "click" && e.label; });
    var uniq = {}; views.forEach(function (v) { uniq[v.session_id] = 1; });
    $("#k-views").textContent = views.length;
    $("#k-visitors").textContent = Object.keys(uniq).length;
    $("#k-book").textContent = clicks.filter(function (c) { return /book/.test(c.label); }).length;
    $("#k-plans").textContent = ev.filter(function (e) { return e.event === "contract_signed"; }).length;
    $("#k-pay").textContent = clicks.filter(function (c) { return c.label.indexOf("pay_") === 0; }).length;
    $("#k-reviews").textContent = ev.filter(function (e) { return e.event === "review_submitted"; }).length;
    fillList("#l-ref", countBy(views, function (v) {
      if (!v.referrer) return "Direct / typed in";
      try { return new URL(v.referrer).hostname.replace(/^www\./, ""); } catch (e) { return "Other"; }
    }), "No visits yet");
    fillList("#l-dev", countBy(views, function (v) { return v.device ? v.device[0].toUpperCase() + v.device.slice(1) : "Unknown"; }), "No visits yet");
    fillList("#l-clicks", countBy(clicks, function (c) { return niceClick(c.label); }), "No clicks yet");
    drawChart(views, days);
  }
  $("#range").addEventListener("change", loadAnalytics);
  window.addEventListener("resize", function () { clearTimeout(window.__rz); window.__rz = setTimeout(loadAnalytics, 400); });

  /* ---------- Reviews ---------- */
  async function loadReviews() {
    var r = await sb.from("reviews").select("*").order("created_at", { ascending: false });
    var list = $("#rev-list"); list.innerHTML = "";
    var rows = r.data || [];
    var pending = rows.filter(function (x) { return !x.approved; }).length;
    $("#pending-badge").innerHTML = pending ? '<span class="status p">' + pending + " new</span>" : "";
    if (!rows.length) { list.innerHTML = '<div class="empty">No reviews yet.</div>'; return; }
    rows.forEach(function (x) {
      var card = document.createElement("div"); card.className = "card rev";
      card.innerHTML = '<div><div class="who" style="font-weight:700"></div><div style="color:#E0A93B;letter-spacing:2px;margin-top:4px" class="st"></div><p class="b"></p><div class="muted d"></div></div><div class="actions"></div>';
      var who = card.querySelector(".who");
      who.textContent = x.name + (x.business ? " · " + x.business : "");
      var tag = document.createElement("span"); tag.className = "status " + (x.approved ? "a" : "p"); tag.textContent = x.approved ? "Live" : "Pending";
      who.appendChild(tag);
      card.querySelector(".st").textContent = "★★★★★".slice(0, x.rating) + "☆☆☆☆☆".slice(0, 5 - x.rating);
      card.querySelector(".b").textContent = x.body;
      card.querySelector(".d").textContent = new Date(x.created_at).toLocaleString();
      var act = card.querySelector(".actions");
      var tog = document.createElement("button"); tog.className = "btn " + (x.approved ? "btn-ghost" : "btn-primary");
      tog.textContent = x.approved ? "Hide" : "Approve";
      tog.onclick = async function () { await sb.from("reviews").update({ approved: !x.approved }).eq("id", x.id); loadReviews(); };
      var del = document.createElement("button"); del.className = "btn btn-danger"; del.textContent = "Delete";
      del.onclick = async function () { if (confirm("Delete this review for good?")) { await sb.from("reviews").delete().eq("id", x.id); loadReviews(); } };
      act.appendChild(tog); act.appendChild(del);
      list.appendChild(card);
    });
  }

  /* ---------- Photos & About ---------- */
  async function saveSetting(key, value) {
    var r = await sb.from("site_settings").upsert({ key: key, value: value, updated_at: new Date().toISOString() });
    if (r.error) throw r.error;
    return r;
  }
  async function uploadImage(file, name) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Please use an image under 5 MB.");
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    var path = name + "-" + Date.now() + "." + ext;
    var up = await sb.storage.from("site-images").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) throw up.error;
    return sb.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  }
  function setThumb(el, url) { if (url) { el.style.backgroundImage = "url('" + url.replace(/'/g, "%27") + "')"; el.textContent = ""; } }

  var workDefaults = [
    { img: "images/work-placeholder.svg", title: "College Meet Up" },
    { img: "images/work-placeholder.svg", title: "Profile Webpage" },
    { img: "images/work-placeholder.svg", title: "Clothing Brand" }
  ];
  function buildWorkSlots() {
    var wrap = $("#work-slots"); wrap.innerHTML = "";
    [1, 2, 3].forEach(function (n) {
      var row = document.createElement("div"); row.className = "photo-row";
      row.innerHTML =
        '<div class="thumb wide"></div><div>' +
        '<label>Project ' + n + ' screenshot</label><input type="file" accept="image/*" class="f">' +
        '<label>Title</label><input class="t" maxlength="60">' +
        '<label>Short description</label><input class="d" maxlength="120">' +
        '<button class="btn btn-primary" style="margin-top:12px">Save project ' + n + '</button><div class="msg" role="status"></div></div>';
      var thumb = row.querySelector(".thumb");
      setThumb(thumb, settings["work_" + n] || workDefaults[n - 1].img);
      row.querySelector(".t").value = settings["work_" + n + "_title"] || "";
      row.querySelector(".t").placeholder = workDefaults[n - 1].title;
      row.querySelector(".d").value = settings["work_" + n + "_desc"] || "";
      row.querySelector(".f").onchange = function () { var f = this.files[0]; if (f) setThumb(thumb, URL.createObjectURL(f)); };
      row.querySelector("button").onclick = async function () {
        var msg = row.querySelector(".msg"); msg.className = "msg"; msg.textContent = "Saving…";
        try {
          var f = row.querySelector(".f").files[0];
          if (f) { var url = await uploadImage(f, "work-" + n); await saveSetting("work_" + n, url); settings["work_" + n] = url; }
          var t = row.querySelector(".t").value.trim(), d = row.querySelector(".d").value.trim();
          if (t) await saveSetting("work_" + n + "_title", t);
          if (d) await saveSetting("work_" + n + "_desc", d);
          msg.className = "msg ok"; msg.textContent = "Saved. It’s live on your site.";
        } catch (e) { msg.className = "msg err"; msg.textContent = e.message || "Couldn’t save. Try again."; }
      };
      wrap.appendChild(row);
    });
  }
  async function loadSettings() {
    var r = await sb.from("site_settings").select("key,value");
    settings = {}; (r.data || []).forEach(function (x) { settings[x.key] = x.value; });
    setThumb($("#about-thumb"), settings.about_photo);
    $("#about-text").value = settings.about_text || "";
    buildWorkSlots();
  }
  $("#about-file").addEventListener("change", function () { var f = this.files[0]; if (f) setThumb($("#about-thumb"), URL.createObjectURL(f)); });
  $("#save-about").addEventListener("click", async function () {
    var msg = $("#about-msg"); msg.className = "msg"; msg.textContent = "Saving…";
    try {
      var f = $("#about-file").files[0];
      if (f) { var url = await uploadImage(f, "about"); await saveSetting("about_photo", url); }
      var t = $("#about-text").value.trim();
      if (t) await saveSetting("about_text", t);
      else await sb.from("site_settings").delete().eq("key", "about_text");
      msg.className = "msg ok"; msg.textContent = "Saved. It’s live on your site.";
    } catch (e) { msg.className = "msg err"; msg.textContent = e.message || "Couldn’t save. Try again."; }
  });

  /* ---------- Clients & private checkout ---------- */
  var PLAN_NAMES = { starter: "Starter", business: "Business", pro: "Pro" };
  var LINK_KEYS = [
    ["starterMonthly", "Starter monthly"], ["starterYearly", "Starter yearly"],
    ["businessMonthly", "Business monthly"], ["businessYearly", "Business yearly"],
    ["proMonthly", "Pro monthly"], ["proYearly", "Pro yearly"],
    ["addonAccounts", "Member area add-on"], ["addonStore", "Online store add-on"]
  ];
  function makeCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", out = "";
    var arr = new Uint32Array(16); crypto.getRandomValues(arr);
    for (var i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length];
    return out;
  }
  function checkoutUrl(code) { return new URL("checkout.html?code=" + code, location.href).href; }
  function emailHref(inv) {
    var first = (inv.client_name || "").split(" ")[0];
    var body = "Hi " + first + ",\n\nThank you for meeting with me today! Here is your private checkout link. You can choose your plan, review and sign the service agreement, and pay securely with Stripe:\n\n" +
      checkoutUrl(inv.code) + "\n\nThe link is valid for 14 days. Once you've paid, send me your logo, photos, hours, and services, and I'll get started on your first draft.\n\n" +
      (C.ownerName || "") + "\nProject Sarae";
    return "mailto:" + encodeURIComponent(inv.client_email || "") + "?subject=" + encodeURIComponent("Your Project Sarae checkout link") + "&body=" + encodeURIComponent(body);
  }
  $("#invite-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var msg = $("#invite-msg"); msg.className = "msg";
    var name = $("#i-name").value.trim();
    if (!name) { msg.className = "msg err"; msg.textContent = "Add the client’s name."; return; }
    var row = {
      code: makeCode(), client_name: name, client_email: $("#i-email").value.trim() || null,
      business: $("#i-business").value.trim() || null, recommended_plan: $("#i-plan").value,
      call_date: $("#i-date").value || null
    };
    var r = await sb.from("checkout_invites").insert(row);
    if (r.error) { msg.className = "msg err"; msg.textContent = "Couldn’t create the link: " + r.error.message; return; }
    msg.className = "msg ok"; msg.textContent = "Link created. Send it to " + name.split(" ")[0] + ".";
    show($("#invite-result"), true);
    $("#invite-link").value = checkoutUrl(row.code);
    $("#email-link").href = emailHref(row);
    e.target.querySelectorAll("input:not(#invite-link)").forEach(function (i) { i.value = ""; });
    loadInvites();
  });
  $("#copy-link").addEventListener("click", function () {
    var inp = $("#invite-link"); inp.select();
    (navigator.clipboard ? navigator.clipboard.writeText(inp.value) : Promise.reject()).then(
      function () { $("#copy-link").textContent = "Copied!"; setTimeout(function () { $("#copy-link").textContent = "Copy link"; }, 1500); },
      function () { document.execCommand("copy"); });
  });
  async function loadInvites() {
    var r = await sb.from("checkout_invites").select("*").order("created_at", { ascending: false }).limit(100);
    var list = $("#invite-list"); list.innerHTML = "";
    var rows = r.data || [];
    if (!rows.length) { list.innerHTML = '<div class="empty">No clients yet. Create a link after your first Zoom call.</div>'; return; }
    rows.forEach(function (x) {
      var expired = new Date(x.expires_at) < new Date();
      var el = document.createElement("div"); el.className = "inv";
      el.innerHTML = '<div><div class="who" style="font-weight:700"></div><div class="muted d"></div></div><div class="actions"></div>';
      var who = el.querySelector(".who");
      who.textContent = x.client_name + (x.business ? " · " + x.business : "");
      var st = document.createElement("span");
      if (x.signed_at) { st.className = "status a"; st.textContent = "Signed"; }
      else if (expired) { st.className = "status x"; st.textContent = "Expired"; }
      else { st.className = "status p"; st.textContent = "Link sent"; }
      who.appendChild(st);
      var det = x.signed_at
        ? "Signed by " + x.signed_name + " on " + new Date(x.signed_at).toLocaleDateString() + " · " + PLAN_NAMES[x.chosen_plan] + " (" + x.chosen_period + ")" + (x.chosen_addons && x.chosen_addons.length ? " + " + x.chosen_addons.length + " add-on(s)" : "")
        : "Recommended: " + (PLAN_NAMES[x.recommended_plan] || "–") + " · " + (expired ? "Expired " : "Expires ") + new Date(x.expires_at).toLocaleDateString();
      el.querySelector(".d").textContent = det;
      var act = el.querySelector(".actions");
      if (!x.signed_at && !expired) {
        var cp = document.createElement("button"); cp.className = "btn btn-ghost"; cp.textContent = "Copy link";
        cp.onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(checkoutUrl(x.code)); cp.textContent = "Copied!"; };
        var em = document.createElement("a"); em.className = "btn btn-ghost"; em.textContent = "Email"; em.href = emailHref(x);
        act.appendChild(cp); act.appendChild(em);
      }
      if (!x.signed_at) {
        var ext = document.createElement("button"); ext.className = "btn btn-ghost"; ext.textContent = "+14 days";
        ext.onclick = async function () { await sb.from("checkout_invites").update({ expires_at: new Date(Date.now() + 14 * 864e5).toISOString() }).eq("id", x.id); loadInvites(); };
        act.appendChild(ext);
      }
      var del = document.createElement("button"); del.className = "btn btn-danger"; del.textContent = "Delete";
      del.onclick = async function () { if (confirm("Delete this client record" + (x.signed_at ? " (including their signature record)" : "") + "?")) { await sb.from("checkout_invites").delete().eq("id", x.id); loadInvites(); } };
      act.appendChild(del);
      list.appendChild(el);
    });
  }
  async function loadLinks() {
    var r = await sb.from("payment_links").select("key,url");
    var map = {}; (r.data || []).forEach(function (x) { map[x.key] = x.url; });
    var f = $("#links-form"); f.innerHTML = "";
    LINK_KEYS.forEach(function (k) {
      var row = document.createElement("label"); row.className = "link-row";
      row.innerHTML = "<span></span><input type='url' placeholder='https://buy.stripe.com/...'>";
      row.querySelector("span").textContent = k[1];
      row.querySelector("input").value = map[k[0]] || "";
      row.querySelector("input").dataset.key = k[0];
      f.appendChild(row);
    });
  }
  $("#save-links").addEventListener("click", async function () {
    var msg = $("#links-msg"); msg.className = "msg"; msg.textContent = "Saving…";
    var rows = [], bad = false;
    $$("#links-form input").forEach(function (i) {
      var v = i.value.trim();
      if (v && v.indexOf("https://") !== 0) bad = true;
      rows.push({ key: i.dataset.key, url: v || null, updated_at: new Date().toISOString() });
    });
    if (bad) { msg.className = "msg err"; msg.textContent = "Each link should start with https://"; return; }
    var r = await sb.from("payment_links").upsert(rows);
    if (r.error) { msg.className = "msg err"; msg.textContent = "Couldn’t save: " + r.error.message; return; }
    msg.className = "msg ok"; msg.textContent = "Saved.";
  });

  enter();
})();
