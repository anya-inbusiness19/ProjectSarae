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
    loadAnalytics(); loadReviews(); loadInvites(); loadSettings().then(loadLinks);
    window.PS_ADMIN = { sb: sb };
    document.dispatchEvent(new Event("ps-admin-ready"));
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
      $$(".tabs button").forEach(function (x) { show($("#tab-" + x.dataset.tab), x === b); });
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
    announce_book: "Book (announcement bar)", demo_book: "Book call (demo section)", demo_try: "Tried the live demo", demo_open: "Opened demo full screen", pay_setup: "Clicked pay: setup fee", toggle_yearly: "Viewed yearly prices", toggle_monthly: "Viewed monthly prices"
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

  /* ---------- Site content + pricing (saved in site_settings) ---------- */
  var D = window.SITE_CONTENT || { fields: [], groups: {}, ticker: [], benefits: [], demos: [], plans: [], addons: [] };
  async function saveSetting(key, value) {
    var r = await sb.from("site_settings").upsert({ key: key, value: value, updated_at: new Date().toISOString() });
    if (r.error) throw r.error;
    return r;
  }
  async function clearSetting(key) {
    var r = await sb.from("site_settings").delete().eq("key", key);
    if (r.error) throw r.error;
  }
  async function uploadImage(file, name) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Please use an image under 5 MB.");
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    var path = name + "-" + Date.now() + "." + ext;
    var up = await sb.storage.from("site-images").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) throw up.error;
    return sb.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  }
  function setThumb(el, url) { if (url) { el.style.backgroundImage = "url('" + String(url).replace(/'/g, "%27") + "')"; el.textContent = ""; } }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function savedList(key) {
    try { var v = JSON.parse(settings[key] || "null"); if (Array.isArray(v) && v.length) return v; } catch (e) {}
    return JSON.parse(JSON.stringify(D[key] || []));
  }
  function card(title, intro) {
    var c = el("div", "card");
    c.appendChild(el("h3")).textContent = title;
    if (intro) c.appendChild(el("p")).textContent = intro;
    return c;
  }
  function actions(c, label, onSave) {
    var row = el("div", "card-actions");
    var btn = el("button", "btn btn-primary"); btn.type = "button"; btn.textContent = label || "Save";
    var msg = el("div", "msg"); msg.setAttribute("role", "status");
    row.appendChild(btn); row.appendChild(msg); c.appendChild(row);
    btn.addEventListener("click", async function () {
      msg.className = "msg"; msg.textContent = "Saving…"; btn.disabled = true;
      try { await onSave(); msg.className = "msg ok"; msg.textContent = "Saved. It’s live on your site."; }
      catch (e) { msg.className = "msg err"; msg.textContent = (e && e.message) || "Couldn’t save. Try again."; }
      btn.disabled = false;
    });
    return row;
  }
  function inputFor(f, value) {
    var wrap = el("div", f.full ? "full" : "");
    var lab = el("label"); lab.textContent = f.label; wrap.appendChild(lab);
    var inp;
    if (f.type === "textarea") { inp = el("textarea"); inp.style.minHeight = (f.rows || 90) + "px"; }
    else if (f.type === "select") {
      inp = el("select"); inp.style.width = "100%";
      f.options.forEach(function (o) { var op = el("option"); op.value = o[0]; op.textContent = o[1]; inp.appendChild(op); });
    } else { inp = el("input"); inp.type = f.type === "number" ? "number" : f.type === "url" ? "url" : "text"; if (f.type === "number") { inp.min = "0"; inp.step = "1"; } }
    if (f.placeholder) inp.placeholder = f.placeholder;
    inp.value = value == null ? "" : value;
    inp.dataset.k = f.k;
    wrap.appendChild(inp);
    if (f.hint) wrap.appendChild(el("div", "hint")).textContent = f.hint;
    return wrap;
  }

  /* Repeatable rows (benefits, demos, add-ons): add, remove, reorder */
  function rowEditor(container, items, schema, opts) {
    opts = opts || {};
    var box = el("div"); container.appendChild(box);
    function addRow(item) {
      var r = el("div", "ed-row"); r._item = item || {};
      var g = el("div", "ed-grid");
      schema.forEach(function (f) { g.appendChild(inputFor(f, r._item[f.k] != null ? r._item[f.k] : (f.def != null ? f.def : ""))); });
      r.appendChild(g);
      var tools = el("div", "ed-tools");
      [["↑", "Move up", function () { if (r.previousElementSibling) box.insertBefore(r, r.previousElementSibling); }],
       ["↓", "Move down", function () { if (r.nextElementSibling) box.insertBefore(r.nextElementSibling, r); }],
       ["Remove", "Remove", function () { if (confirm("Remove this " + (opts.noun || "item") + "?")) r.remove(); }]
      ].forEach(function (t) {
        var b = el("button", "btn " + (t[0] === "Remove" ? "btn-danger" : "btn-ghost")); b.type = "button";
        b.textContent = t[0]; b.setAttribute("aria-label", t[1]); b.onclick = t[2]; tools.appendChild(b);
      });
      r.appendChild(tools);
      box.appendChild(r);
      return r;
    }
    items.forEach(addRow);
    var add = el("button", "btn btn-ghost ed-add"); add.type = "button"; add.textContent = "+ Add " + (opts.noun || "item");
    add.style.marginTop = "12px";
    add.onclick = function () { var r = addRow({}); var i = r.querySelector("input,textarea"); if (i) i.focus(); };
    container.appendChild(add);
    return function read() {
      return Array.prototype.map.call(box.children, function (r) {
        var o = JSON.parse(JSON.stringify(r._item));
        r.querySelectorAll("[data-k]").forEach(function (i) {
          var f = schema.filter(function (s) { return s.k === i.dataset.k; })[0];
          o[i.dataset.k] = f.type === "number" ? Math.max(0, Math.round(+i.value || 0)) : i.value.trim();
        });
        return o;
      });
    };
  }
  async function saveList(key, rows) {
    if (JSON.stringify(rows) === JSON.stringify(D[key])) { await clearSetting(key); delete settings[key]; return; }
    var v = JSON.stringify(rows); await saveSetting(key, v); settings[key] = v;
  }

  function buildContent() {
    var host = $("#content-cards"); host.innerHTML = "";
    Object.keys(D.groups).forEach(function (g) {
      var fields = D.fields.filter(function (f) { return f.group === g; });
      var c = card(D.groups[g]);
      var pending = {};
      fields.forEach(function (f) {
        if (f.type === "image") {
          var w = el("div");
          w.appendChild(el("label")).textContent = f.label;
          var row = el("div", "img-field");
          var th = el("div", "thumb wide"); setThumb(th, settings[f.key] || f.def);
          var right = el("div");
          var fi = el("input"); fi.type = "file"; fi.accept = "image/*";
          fi.onchange = function () { var file = fi.files[0]; if (file) { pending[f.key] = file; setThumb(th, URL.createObjectURL(file)); } };
          right.appendChild(fi);
          right.appendChild(el("div", "hint")).textContent = "Wide photos work best (at least 1600px across). Under 5 MB.";
          var reset = el("button", "btn btn-ghost"); reset.type = "button"; reset.textContent = "Use the original photo"; reset.style.marginTop = "10px";
          reset.onclick = function () { pending[f.key] = "reset"; fi.value = ""; setThumb(th, f.def); };
          right.appendChild(reset);
          row.appendChild(th); row.appendChild(right); w.appendChild(row); c.appendChild(w);
        } else {
          var wrap = inputFor({ k: f.key, label: f.label, type: f.type, placeholder: f.def }, settings[f.key] || "");
          c.appendChild(wrap);
        }
      });
      if (g === "home_top") {
        var tk = inputFor({ k: "__ticker", label: "Sliding services bar (one service per line)", type: "textarea", rows: 200 }, savedList("ticker").join("\n"));
        c.appendChild(tk);
      }
      var readBenefits = null, readDemos = null;
      if (g === "home_demo") {
        c.appendChild(el("label")).textContent = "Benefits beside the laptop";
        readBenefits = rowEditor(c, savedList("benefits"), [
          { k: "title", label: "Title", type: "text", full: true },
          { k: "text", label: "Text", type: "textarea", full: true, rows: 70 }
        ], { noun: "benefit" });
        var dl = el("label"); dl.textContent = "Live demos in the laptop"; dl.style.marginTop = "26px"; c.appendChild(dl);
        c.appendChild(el("div", "hint")).textContent = "Add the web address of any live site you’ve built. With two or more, visitors get buttons to switch between them.";
        readDemos = rowEditor(c, savedList("demos"), [
          { k: "name", label: "Site name", type: "text" },
          { k: "label", label: "Small label (type of business · plan)", type: "text" },
          { k: "url", label: "Live site address (https://…)", type: "url", full: true, placeholder: "https://" },
          { k: "text", label: "Short description", type: "textarea", full: true, rows: 70 }
        ], { noun: "demo" });
      }
      actions(c, "Save " + D.groups[g].replace(/^[^:]*: /, "").toLowerCase(), async function () {
        for (var i = 0; i < fields.length; i++) {
          var f = fields[i];
          if (f.type === "image") {
            var p = pending[f.key];
            if (p === "reset") { await clearSetting(f.key); delete settings[f.key]; }
            else if (p) { var url = await uploadImage(p, f.key.replace(/_/g, "-")); await saveSetting(f.key, url); settings[f.key] = url; }
            delete pending[f.key];
            continue;
          }
          var inp = c.querySelector('[data-k="' + f.key + '"]'), v = inp.value.trim();
          if (!v || v === f.def) { if (settings[f.key] != null) { await clearSetting(f.key); delete settings[f.key]; } }
          else if (v !== settings[f.key]) { await saveSetting(f.key, v); settings[f.key] = v; }
        }
        var tki = c.querySelector('[data-k="__ticker"]');
        if (tki) await saveList("ticker", tki.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean));
        if (readBenefits) await saveList("benefits", readBenefits().filter(function (b) { return b.title || b.text; }));
        if (readDemos) {
          var demos = readDemos().filter(function (d) { return d.url; });
          if (demos.some(function (d) { return d.url.indexOf("https://") !== 0; })) throw new Error("Each demo address should start with https://");
          await saveList("demos", demos);
        }
      });
      host.appendChild(c);
    });
  }

  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 28) || "item"; }
  function buildPricing() {
    var host = $("#pricing-cards"); host.innerHTML = "";

    // Setup fee
    var sc = card("Setup fee", "A one-time fee added at checkout. Set it to 0 to show “No setup fee” everywhere.");
    var g = el("div", "ed-grid");
    g.appendChild(inputFor({ k: "setup_fee", label: "Setup fee amount ($)", type: "number" }, settings.setup_fee != null ? settings.setup_fee : D.setup_fee));
    g.appendChild(inputFor({ k: "setup_fee_text", label: "What it covers (shown on the Pricing page)", type: "textarea", full: true, placeholder: D.setup_fee_text }, settings.setup_fee_text || ""));
    sc.appendChild(g);
    actions(sc, "Save setup fee", async function () {
      var amt = Math.max(0, Math.round(+sc.querySelector('[data-k="setup_fee"]').value || 0));
      if (amt === D.setup_fee) { await clearSetting("setup_fee"); delete settings.setup_fee; } else { await saveSetting("setup_fee", String(amt)); settings.setup_fee = String(amt); }
      var t = sc.querySelector('[data-k="setup_fee_text"]').value.trim();
      if (!t || t === D.setup_fee_text) { await clearSetting("setup_fee_text"); delete settings.setup_fee_text; } else { await saveSetting("setup_fee_text", t); settings.setup_fee_text = t; }
      loadLinks();
    });
    host.appendChild(sc);

    // Plans
    var pc = card("Plans", "Names, prices, and the checklist on each plan card. A plan with a badge (like “Most popular”) gets the glowing blue card.");
    var saved = savedList("plans"), byKey = {};
    saved.forEach(function (p) { byKey[p.key] = p; });
    D.plans.forEach(function (base) {
      var p = byKey[base.key] || base;
      var r = el("div", "ed-row"); r.dataset.plan = base.key;
      var gg = el("div", "ed-grid");
      gg.appendChild(inputFor({ k: "name", label: "Plan name", type: "text" }, p.name));
      gg.appendChild(inputFor({ k: "badge", label: "Badge (optional)", type: "text", placeholder: "e.g. Most popular" }, p.badge || ""));
      gg.appendChild(inputFor({ k: "monthly", label: "Monthly price ($)", type: "number" }, p.monthly));
      gg.appendChild(inputFor({ k: "yearly", label: "Yearly price ($)", type: "number" }, p.yearly));
      gg.appendChild(inputFor({ k: "features", label: "What’s included (one per line)", type: "textarea", full: true, rows: 120 }, (p.features || []).join("\n")));
      r.appendChild(gg); pc.appendChild(r);
    });
    actions(pc, "Save plans", async function () {
      var rows = Array.prototype.map.call(pc.querySelectorAll(".ed-row"), function (r) {
        var q = function (k) { return r.querySelector('[data-k="' + k + '"]').value.trim(); };
        return { key: r.dataset.plan, name: q("name") || r.dataset.plan, monthly: Math.max(0, Math.round(+q("monthly") || 0)), yearly: Math.max(0, Math.round(+q("yearly") || 0)), badge: q("badge"),
          features: q("features").split("\n").map(function (s) { return s.trim(); }).filter(Boolean) };
      });
      await saveList("plans", rows);
    });
    host.appendChild(pc);

    // Add-ons
    var ac = card("Add-on services", "Everything listed here shows on the Pricing page and can be picked at checkout. Use the arrows to change the order.");
    var readAddons = rowEditor(ac, savedList("addons"), [
      { k: "name", label: "Service name", type: "text" },
      { k: "price", label: "Price ($)", type: "number" },
      { k: "unit", label: "Billed", type: "select", options: [["one-time", "One-time"], ["setup", "One-time setup"], ["month", "Monthly"]], def: "one-time" },
      { k: "text", label: "Short description", type: "textarea", full: true, rows: 70 }
    ], { noun: "add-on" });
    actions(ac, "Save add-ons", async function () {
      var used = {};
      var rows = readAddons().filter(function (x) { return x.name; }).map(function (x) {
        if (!x.key) { var k = "addon_" + slug(x.name), n = 2, base = k; while (used[k] || D.addons.some(function (d) { return d.key === k && d.name !== x.name; })) k = base + "_" + (n++); x.key = k; }
        used[x.key] = 1;
        x.unit = ["one-time", "setup", "month"].indexOf(x.unit) >= 0 ? x.unit : "one-time";
        return x;
      });
      await saveList("addons", rows);
      buildPricing(); loadLinks();
    });
    host.appendChild(ac);
  }

  async function loadSettings() {
    var r = await sb.from("site_settings").select("key,value");
    settings = {}; (r.data || []).forEach(function (x) { settings[x.key] = x.value; });
    buildContent(); buildPricing();
  }

  /* ---------- Clients & private checkout ---------- */
  var PLAN_NAMES = { starter: "Starter", business: "Business", pro: "Pro" };
  try { savedList("plans").forEach(function (p) { PLAN_NAMES[p.key] = p.name; }); } catch (e) {}
  function linkKeys() {
    var plans = savedList("plans"), out = [];
    plans.forEach(function (p) { out.push([p.key + "Monthly", p.name + " monthly"]); out.push([p.key + "Yearly", p.name + " yearly"]); });
    var fee = settings.setup_fee != null ? +settings.setup_fee : D.setup_fee;
    if (fee) out.push(["setupFee", "Setup fee ($" + fee + " one-time)"]);
    savedList("addons").forEach(function (x) { out.push([x.key, x.name + " ($" + x.price + (x.unit === "month" ? "/month" : " one-time") + ")"]); });
    return out;
  }
  function makeCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", out = "";
    var arr = new Uint32Array(16); crypto.getRandomValues(arr);
    for (var i = 0; i < arr.length; i++) out += chars[arr[i] % chars.length];
    return out;
  }
  function checkoutUrl(code) { return new URL("checkout.html?code=" + code, location.href).href; }
  function emailHref(inv) {
    var first = (inv.client_name || "").split(" ")[0];
    var body = "Hi " + first + ",\n\nThank you for meeting with me today! Here is your private checkout link. You can choose your plan and add-on services, review and sign the service agreement, and pay securely with Stripe:\n\n" +
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
    linkKeys().forEach(function (k) {
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
    if (!$$("#links-form input").length) { msg.textContent = ""; return; }
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
