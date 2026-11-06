/* =========================================================
   PROJECT SARAE — ADMIN TOOLS
   Sales (Stripe), Outreach pipeline, Content Studio (AI photo posts + Instagram).
   Secret keys live in the Supabase "admin-api" function, never here.
   ========================================================= */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function show(el, on) { el.classList.toggle("hidden", !on); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(id, text, kind) { var m = $(id); m.className = "msg" + (kind ? " " + kind : ""); m.textContent = text || ""; }
  function money(n) { return "$" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function today(addDays) { var d = new Date(Date.now() + (addDays || 0) * 864e5); return d.toLocaleDateString("en-CA"); }
  function copy(text, btn) {
    navigator.clipboard.writeText(text).then(function () { var t = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = t; }, 1200); });
  }

  var started = false;
  document.addEventListener("ps-admin-ready", init);
  if (window.PS_ADMIN) init();
  function init() {
    if (started) return; started = true;
    var sb = window.PS_ADMIN.sb;
    var loaded = {};

    async function api(action, payload) {
      var body = Object.assign({ action: action }, payload || {});
      var r = await sb.functions.invoke("admin-api", { body: body });
      if (r.error) return { error: "The admin API isn’t set up yet. Follow SETUP-TOOLS.md, step 2." };
      return r.data || {};
    }

    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.dataset.tab;
        if (loaded[t]) return;
        loaded[t] = true;
        if (t === "sales") loadSales();
        if (t === "outreach") loadOutreach();
        if (t === "studio") loadStudio();
      });
    });

    /* =================== SALES =================== */
    async function loadSales() {
      say("#s-msg", "Loading your Stripe numbers…");
      var d = await api("sales", { days: +$("#s-range").value });
      if (d.notConnected) { say("#s-msg", ""); show($("#s-off"), true); show($("#s-body"), false); return; }
      if (d.error) { say("#s-msg", d.error, "err"); return; }
      say("#s-msg", ""); show($("#s-off"), false); show($("#s-body"), true);
      $("#s-gross").textContent = money(d.gross);
      $("#s-net").textContent = money(d.net);
      $("#s-count").textContent = d.payments;
      $("#s-mrr").textContent = money(d.mrr);
      $("#s-subs").textContent = d.activeSubscriptions;
      $("#s-bal").textContent = money(d.balanceAvailable + d.balancePending);
      $("#s-mode").textContent = d.livemode ? "Showing live payments." : "Showing Stripe TEST mode data. Use a live key to see real payments.";

      var box = $("#s-recent"); box.innerHTML = "";
      if (!d.recent.length) box.appendChild(el("p", "muted", "No payments in this period yet."));
      d.recent.forEach(function (p) {
        var row = el("div", "pay-row"), left = el("div");
        left.appendChild(el("b", "", p.name || p.email || "Customer"));
        left.appendChild(el("small", "", new Date(p.date * 1000).toLocaleDateString() + (p.description ? " · " + p.description : "") + (p.refunded ? " · refunded " + money(p.refunded) : "")));
        row.appendChild(left); row.appendChild(el("b", "", money(p.amount)));
        box.appendChild(row);
      });

      var ul = $("#s-plans"); ul.innerHTML = "";
      var plans = Object.keys(d.plans);
      if (!plans.length) { var li = el("li"); li.appendChild(el("span", "muted", "No active subscriptions yet")); ul.appendChild(li); }
      plans.forEach(function (k) { var li = el("li"); li.appendChild(el("span", "", k)); li.appendChild(el("b", "", d.plans[k] + (d.plans[k] === 1 ? " client" : " clients"))); ul.appendChild(li); });

      drawMoney(d.daily, d.days);
    }
    function drawMoney(daily, days) {
      var svg = $("#s-chart"), W = svg.clientWidth || 800, H = 220, pad = { l: 46, r: 8, t: 12, b: 26 };
      var weekly = days > 90, buckets = [];
      var n = weekly ? Math.ceil(days / 7) : days;
      for (var i = n - 1; i >= 0; i--) {
        var end = new Date(Date.now() - i * (weekly ? 7 : 1) * 864e5), sum = 0;
        for (var k = 0; k < (weekly ? 7 : 1); k++) sum += (daily[new Date(end - k * 864e5).toISOString().slice(0, 10)] || 0);
        buckets.push({ label: (end.getMonth() + 1) + "/" + end.getDate(), v: sum / 100 });
      }
      var max = Math.max(10, Math.max.apply(null, buckets.map(function (b) { return b.v; })));
      var cw = (W - pad.l - pad.r) / buckets.length, bw = Math.max(2, cw * 0.62);
      var ns = "http://www.w3.org/2000/svg", g = document.createElementNS(ns, "g");
      g.setAttribute("font-size", "10"); g.setAttribute("fill", "#5A5A5A");
      function add(tag, attrs, text) { var e = document.createElementNS(ns, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (text != null) e.textContent = text; g.appendChild(e); return e; }
      [0, 0.5, 1].forEach(function (f) {
        var y = pad.t + (H - pad.t - pad.b) * (1 - f);
        add("line", { x1: pad.l, x2: W - pad.r, y1: y, y2: y, stroke: "#E8DFD0" });
        add("text", { x: pad.l - 6, y: y + 3, "text-anchor": "end" }, money(Math.round(max * f)));
      });
      var every = Math.ceil(buckets.length / 10);
      buckets.forEach(function (b, i) {
        var bh = (H - pad.t - pad.b) * b.v / max, x = pad.l + i * cw + (cw - bw) / 2;
        var r = add("rect", { x: x, y: H - pad.b - bh, width: bw, height: Math.max(bh, b.v ? 2 : 0), rx: 3, fill: "#151581" });
        var t = document.createElementNS(ns, "title"); t.textContent = (weekly ? "Week ending " : "") + b.label + ": " + money(b.v); r.appendChild(t);
        if (i % every === 0) add("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle" }, b.label);
      });
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML = ""; svg.appendChild(g);
    }
    $("#s-range").addEventListener("change", loadSales);
    $("#s-refresh").addEventListener("click", loadSales);

    /* =================== OUTREACH =================== */
    var STAGES = [["new", "To contact"], ["contacted", "Contacted"], ["replied", "Replied"], ["call_booked", "Call booked"], ["won", "Won"], ["lost", "Not now"]];
    var stageName = {}; STAGES.forEach(function (s) { stageName[s[0]] = s[1]; });
    var leads = [], filter = "", tpl = {};
    var DEFAULT_SUBJ = "Quick idea for {business}";
    var DEFAULT_TPL = "Hi {name},\n\nI came across {business} and noticed clients can’t book with you online yet. I build simple websites for {niche}s with online booking, so people can book any time, even at 11pm.\n\nI made a free demo you can try: https://projectsarae.site\n\nWould you be open to a free 15-minute Zoom this week?\n\nA’Nya\nProject Sarae\n[Your mailing address here]\n\nNot interested? Just reply “no thanks” and I won’t email again.";

    STAGES.forEach(function (s) { var o = el("option", "", s[1]); o.value = s[0]; $("#o-status").appendChild(o); });

    async function loadOutreach() {
      var r = await sb.from("outreach_leads").select("*").order("created_at", { ascending: false }).limit(1000);
      if (r.error) { $("#o-list").textContent = "Run supabase-tools-setup.sql in Supabase first (SETUP-TOOLS.md, step 1)."; return; }
      leads = r.data;
      var t = await sb.from("admin_settings").select("key,value").in("key", ["email_subject", "email_template"]);
      (t.data || []).forEach(function (x) { tpl[x.key] = x.value; });
      $("#o-subj").value = tpl.email_subject || DEFAULT_SUBJ;
      $("#o-tpl").value = tpl.email_template || DEFAULT_TPL;
      renderLeads();
    }
    function renderLeads() {
      var pipe = $("#o-pipe"); pipe.innerHTML = "";
      STAGES.forEach(function (s) {
        var n = leads.filter(function (l) { return l.status === s[0]; }).length;
        var b = el("button", filter === s[0] ? "on" : ""); b.type = "button";
        b.appendChild(el("span", "v", n)); b.appendChild(el("span", "l", s[1]));
        b.addEventListener("click", function () { filter = filter === s[0] ? "" : s[0]; renderLeads(); });
        pipe.appendChild(b);
      });
      $("#o-list-title").textContent = filter ? stageName[filter] : "All businesses";
      var q = $("#o-search").value.trim().toLowerCase();
      var list = leads.filter(function (l) {
        if (filter && l.status !== filter) return false;
        if (!q) return true;
        return [l.business, l.contact_name, l.email, l.niche, l.city, l.notes].join(" ").toLowerCase().indexOf(q) >= 0;
      });
      var box = $("#o-list"); box.innerHTML = "";
      if (!list.length) { box.appendChild(el("p", "muted", leads.length ? "Nothing here." : "Add your first business above.")); return; }
      list.forEach(function (l) {
        var due = l.next_follow_up && l.next_follow_up <= today() && ["won", "lost"].indexOf(l.status) < 0;
        var row = el("div", "lead" + (due ? " due" : "")), left = el("div");
        left.appendChild(el("b", "name", l.business));
        left.appendChild(el("span", "status " + (l.status === "won" ? "a" : l.status === "lost" ? "x" : "p"), stageName[l.status]));
        var meta = [l.contact_name, l.niche, l.city, l.value ? money(+l.value) + "/mo" : "", l.next_follow_up ? "follow up " + l.next_follow_up : ""].filter(Boolean).join(" · ");
        if (meta) left.appendChild(el("div", "meta", meta));
        if (l.notes) left.appendChild(el("div", "meta", l.notes));
        var act = el("div", "actions");
        var sel = el("select"); sel.setAttribute("aria-label", "Stage");
        STAGES.forEach(function (s) { var o = el("option", "", s[1]); o.value = s[0]; if (s[0] === l.status) o.selected = true; sel.appendChild(o); });
        sel.addEventListener("change", function () { updateLead(l, { status: sel.value }); });
        act.appendChild(sel);
        if (l.email) { var e = el("a", "btn btn-ghost", "Email"); e.href = mailto(l); e.addEventListener("click", function () { if (l.status === "new") markContacted(l); }); act.appendChild(e); }
        if (l.instagram) { var d = el("a", "btn btn-ghost", "DM"); d.href = "https://instagram.com/" + encodeURIComponent(l.instagram.replace(/^@/, "")); d.target = "_blank"; d.rel = "noopener"; act.appendChild(d); }
        if (l.status === "new") { var c = el("button", "btn btn-ghost", "Mark contacted"); c.type = "button"; c.addEventListener("click", function () { markContacted(l); }); act.appendChild(c); }
        var ed = el("button", "btn btn-ghost", "Edit"); ed.type = "button"; ed.addEventListener("click", function () { editLead(l); }); act.appendChild(ed);
        var del = el("button", "btn btn-danger", "Delete"); del.type = "button";
        del.addEventListener("click", async function () {
          if (!confirm("Delete " + l.business + "?")) return;
          var r = await sb.from("outreach_leads").delete().eq("id", l.id);
          if (!r.error) { leads = leads.filter(function (x) { return x.id !== l.id; }); renderLeads(); }
        });
        act.appendChild(del);
        row.appendChild(left); row.appendChild(act); box.appendChild(row);
      });
    }
    function fill(text, l) {
      var first = (l.contact_name || "").split(/\s+/)[0];
      return text.replace(/\{name\}/g, first || "there").replace(/\{business\}/g, l.business).replace(/\{niche\}/g, l.niche || "local business");
    }
    function mailto(l) {
      return "mailto:" + encodeURIComponent(l.email) + "?subject=" + encodeURIComponent(fill($("#o-subj").value, l)) + "&body=" + encodeURIComponent(fill($("#o-tpl").value, l));
    }
    function markContacted(l) { updateLead(l, { status: "contacted", last_contact: today(), next_follow_up: today(3) }); }
    async function updateLead(l, patch) {
      var r = await sb.from("outreach_leads").update(patch).eq("id", l.id).select().single();
      if (!r.error) { Object.assign(l, r.data); renderLeads(); }
    }
    function editLead(l) {
      $("#o-form-title").textContent = "Edit " + l.business; show($("#o-cancel"), true);
      $("#o-id").value = l.id; $("#o-business").value = l.business || ""; $("#o-contact").value = l.contact_name || "";
      $("#o-niche").value = l.niche || ""; $("#o-email").value = l.email || ""; $("#o-phone").value = l.phone || "";
      $("#o-ig").value = l.instagram || ""; $("#o-city").value = l.city || ""; $("#o-status").value = l.status;
      $("#o-value").value = l.value || ""; $("#o-follow").value = l.next_follow_up || ""; $("#o-notes").value = l.notes || "";
      $("#o-form").scrollIntoView({ behavior: "smooth" });
    }
    function resetForm() { $("#o-form").reset(); $("#o-id").value = ""; $("#o-form-title").textContent = "Add a business"; show($("#o-cancel"), false); }
    $("#o-cancel").addEventListener("click", resetForm);
    $("#o-search").addEventListener("input", renderLeads);
    $("#o-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var v = function (id) { var x = $(id).value.trim(); return x || null; };
      var row = {
        business: $("#o-business").value.trim(), contact_name: v("#o-contact"), niche: v("#o-niche"), email: v("#o-email"),
        phone: v("#o-phone"), instagram: v("#o-ig"), city: v("#o-city"), status: $("#o-status").value,
        value: v("#o-value") ? +$("#o-value").value : null, next_follow_up: v("#o-follow"), notes: v("#o-notes")
      };
      say("#o-msg", "Saving…");
      var id = $("#o-id").value;
      var r = id ? await sb.from("outreach_leads").update(row).eq("id", id).select().single()
                 : await sb.from("outreach_leads").insert(row).select().single();
      if (r.error) { say("#o-msg", "Couldn’t save. " + r.error.message, "err"); return; }
      if (id) leads = leads.map(function (x) { return String(x.id) === id ? r.data : x; }); else leads.unshift(r.data);
      say("#o-msg", "Saved.", "ok"); resetForm(); renderLeads();
    });
    $("#o-tpl-save").addEventListener("click", async function () {
      var now = new Date().toISOString();
      var r = await sb.from("admin_settings").upsert([
        { key: "email_subject", value: $("#o-subj").value, updated_at: now },
        { key: "email_template", value: $("#o-tpl").value, updated_at: now }
      ]);
      say("#o-tpl-msg", r.error ? "Couldn’t save." : "Saved.", r.error ? "err" : "ok");
    });

    /* =================== CONTENT STUDIO (photo posts) =================== */
    var lastPost = null, slideBlobs = [], bgImg = null, imagesOn = false;
    var W = 1080, H = 1350, TT = false; // TT = TikTok 9:16 layout
    var BRAND = { blue: "#151581", blueDark: "#0C0C55", creme: "#FBF7F0", ink: "#111111", slate: "#3D3D3D", gold: "#C2A878", handle: "@official.projectsarae" };
    var DISPLAY = '"Playfair Display", "Times New Roman", serif', TEXT = '"Times New Roman", Times, serif';
    var logos = {};
    ["white", "dark"].forEach(function (k) { var i = new Image(); i.src = "images/logo-" + k + ".png"; logos[k] = i; });

    async function loadStudio() {
      loadHistory();
      var s = await api("status");
      if (s.error) { say("#c-msg", s.error, "err"); return; }
      show($("#c-ai-off"), !s.gemini);
      imagesOn = !!s.images; show($("#c-img-off"), !imagesOn && $("#c-photos").checked);
      show($("#c-ig-off"), !s.instagram);
      if (s.instagram) {
        var a = await api("ig_account");
        $("#c-ig-acct").textContent = a.error ? "Instagram: " + a.error : "Posting to @" + a.username + " · " + (a.followers_count || 0) + " followers · " + (a.media_count || 0) + " posts";
      }
    }
    document.querySelectorAll("[data-idea]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault(); $("#c-topic").value = a.dataset.idea;
        if (a.dataset.format) $("#c-format").value = a.dataset.format;
      });
    });
    $("#c-photos").addEventListener("change", function () { show($("#c-img-off"), !imagesOn && this.checked); });
    $("#c-bg").addEventListener("change", function () {
      var f = $("#c-bg").files[0];
      if (!f) { bgImg = null; if (lastPost) renderPost(lastPost); return; }
      var i = new Image();
      i.onload = function () { bgImg = i; if (lastPost) renderPost(lastPost); };
      i.src = URL.createObjectURL(f);
    });

    function copyBlock(label, text) {
      var wrap = el("div", "copyable"), left = el("div");
      left.appendChild(el("b", "", label)); left.appendChild(el("p", "", text));
      var b = el("button", "btn btn-ghost", "Copy"); b.type = "button"; b.addEventListener("click", function () { copy(text, b); });
      wrap.appendChild(left); wrap.appendChild(b); return wrap;
    }
    function threadsLink(text) { return "https://www.threads.net/intent/post?text=" + encodeURIComponent(String(text || "").slice(0, 500)); }
    function captionOf(p) {
      return ((p.caption || "") + "\n\n" + (p.hashtags || []).map(function (h) { return "#" + String(h).replace(/^#/, "").replace(/\s+/g, ""); }).join(" ")).trim();
    }

    /* ---------- drawing ---------- */
    function wrapLines(ctx, text, maxW) {
      var words = String(text || "").split(/\s+/).filter(Boolean), lines = [], line = "";
      words.forEach(function (w) {
        var t = line ? line + " " + w : w;
        if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
      });
      if (line) lines.push(line);
      return lines;
    }
    // Biggest font size (down to min) that fits the text in maxW × maxH.
    function fit(ctx, text, font, maxW, maxH, start, min, lh) {
      for (var size = start; size >= min; size -= 4) {
        ctx.font = font.replace("{s}", size);
        var lines = wrapLines(ctx, text, maxW);
        if (lines.length * size * lh <= maxH) return { size: size, lines: lines };
      }
      ctx.font = font.replace("{s}", min);
      return { size: min, lines: wrapLines(ctx, text, maxW) };
    }
    function drawLines(ctx, f, x, y, lh) { f.lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * f.size * lh); }); return y + f.lines.length * f.size * lh; }
    function coverImg(ctx, img) {
      var r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    }

    function drawSlide(s, i, total) {
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var photo = s._img || (s.kind === "cover" && bgImg) || null;
      var ctx = c.getContext("2d"), dark = !!photo || s.kind !== "point", M = 96, maxW = W - M * 2 - (TT ? 110 : 0);
      var fg = dark ? "#FFFFFF" : BRAND.ink, accent = dark ? BRAND.gold : BRAND.blue;
      // TikTok covers the top (tabs), right side (buttons) and bottom (caption): keep text inside the safe area.
      var TOP = TT ? 150 : 92, BOT = TT ? 430 : 130;
      ctx.textBaseline = "top";

      // Background
      if (photo) {
        coverImg(ctx, photo);
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(12,12,85,.35)"); g.addColorStop(.45, "rgba(12,12,85,.55)"); g.addColorStop(1, "rgba(12,12,85,.92)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = dark ? BRAND.blue : BRAND.creme; ctx.fillRect(0, 0, W, H);
        if (dark) { // soft corner glow
          var rg = ctx.createRadialGradient(W, 0, 0, W, 0, 900);
          rg.addColorStop(0, "rgba(255,255,255,.12)"); rg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        }
      }
      if (photo) { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 18; }
      // Frame line
      if (!photo) ctx.strokeStyle = dark ? "rgba(255,255,255,.25)" : "rgba(21,21,129,.18)"; ctx.lineWidth = 2;
      if (!photo) ctx.strokeRect(40, 40, W - 80, H - 80);

      // Logo + slide count
      var logo = logos[dark ? "white" : "dark"];
      if (logo && logo.complete && logo.naturalWidth) { var lh0 = 64, lw = logo.naturalWidth * lh0 / logo.naturalHeight; ctx.drawImage(logo, M, TOP, lw, lh0); }
      if (total > 1) {
        ctx.font = "600 28px " + TEXT; ctx.fillStyle = dark ? "rgba(255,255,255,.75)" : BRAND.slate; ctx.textAlign = "right";
        ctx.fillText((i + 1) + " / " + total, W - M, TOP + 18); ctx.textAlign = "left";
      }

      var y;
      if (s.kind === "cover") {
        var head = fit(ctx, s.headline, "700 {s}px " + DISPLAY, maxW, 640, 124, 64, 1.08);
        var body = s.body ? fit(ctx, s.body, "400 {s}px " + TEXT, maxW, 180, 46, 32, 1.3) : null;
        var block = (s.kicker ? 70 : 0) + head.lines.length * head.size * 1.08 + (body ? 40 + body.lines.length * body.size * 1.3 : 0);
        y = photo ? H - BOT - 100 - block : (H - block) / 2;
        if (s.kicker) { ctx.font = "italic 400 40px " + DISPLAY; ctx.fillStyle = accent; ctx.fillText(s.kicker, M, y); y += 70; }
        ctx.fillStyle = fg; ctx.font = "700 " + head.size + "px " + DISPLAY; y = drawLines(ctx, head, M, y, 1.08);
        if (body) { y += 40; ctx.font = "400 " + body.size + "px " + TEXT; ctx.fillStyle = "rgba(255,255,255,.88)"; drawLines(ctx, body, M, y, 1.3); }
        if (total > 1) { ctx.font = "italic 400 36px " + DISPLAY; ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "right"; ctx.fillText("Swipe  →", W - M - (TT ? 110 : 0), H - BOT - 20); ctx.textAlign = "left"; }
      } else if (s.kind === "point") {
        y = TT ? (photo ? H * 0.34 : 460) : 300;
        var label = s.kicker || String(i).padStart(2, "0");
        var big = /^\d+$/.test(label);
        ctx.fillStyle = accent;
        if (big) { ctx.font = "italic 400 150px " + DISPLAY; ctx.fillText(label, M - 6, y - 20); y += 200; }
        else { ctx.font = "700 34px " + TEXT; ctx.fillText(label.toUpperCase().split("").join(String.fromCharCode(8202)), M, y); y += 80; }
        ctx.fillStyle = photo ? BRAND.gold : BRAND.blue; ctx.fillRect(M, y, 90, 6); y += 56;
        var h2 = fit(ctx, s.headline, "700 {s}px " + DISPLAY, maxW, 380, 92, 54, 1.12);
        ctx.fillStyle = fg; ctx.font = "700 " + h2.size + "px " + DISPLAY; y = drawLines(ctx, h2, M, y, 1.12);
        if (s.body) {
          y += 44;
          var b2 = fit(ctx, s.body, "400 {s}px " + TEXT, maxW, H - BOT - 90 - y, 46, 30, 1.38);
          ctx.fillStyle = photo ? "rgba(255,255,255,.92)" : BRAND.slate; ctx.font = "400 " + b2.size + "px " + TEXT; drawLines(ctx, b2, M, y, 1.38);
        }
      } else { // cta
        var h3 = fit(ctx, s.headline, "700 {s}px " + DISPLAY, maxW, 520, 104, 56, 1.1);
        var b3 = s.body ? fit(ctx, s.body, "400 {s}px " + TEXT, maxW, 220, 44, 30, 1.35) : null;
        var blk = h3.lines.length * h3.size * 1.1 + (b3 ? 50 + b3.lines.length * b3.size * 1.35 : 0) + 170;
        y = (H - blk) / 2;
        ctx.fillStyle = fg; ctx.font = "700 " + h3.size + "px " + DISPLAY; y = drawLines(ctx, h3, M, y, 1.1);
        if (b3) { y += 50; ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.font = "400 " + b3.size + "px " + TEXT; y = drawLines(ctx, b3, M, y, 1.35); }
        y += 70; // pill
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
        ctx.font = "700 36px " + TEXT; var pill = "projectsarae.site", pw = ctx.measureText(pill).width + 80;
        ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(M, y, pw, 96, 48); else ctx.rect(M, y, pw, 96); ctx.fill();
        ctx.fillStyle = BRAND.blue; ctx.fillText(pill, M + 40, y + 30);
      }
      // Handle footer
      ctx.font = "400 30px " + TEXT; ctx.fillStyle = dark ? "rgba(255,255,255,.8)" : BRAND.slate;
      ctx.fillText(BRAND.handle, M, H - BOT);
      return c;
    }
    function toBlob(c) { return new Promise(function (r) { c.toBlob(r, "image/jpeg", 0.92); }); }

    // Copy of a post without photo data (for saving drafts).
    function lean(p) { return JSON.parse(JSON.stringify(p, function (k, v) { return k.charAt(0) === "_" ? undefined : v; })); }
    function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
    var photoQueue = Promise.resolve();
    function makePhoto(s, redraw, note) {
      photoQueue = photoQueue.catch(function () {}).then(async function () {
        if (!s.image_prompt) return;
        if (note) note.textContent = "Making photo…";
        var r = await api("image", { prompt: s.image_prompt });
        if (r.notConnected) { show($("#c-img-off"), true); if (note) note.textContent = "AI photos aren’t connected."; return; }
        if (r.error || !r.image) { if (note) note.textContent = r.error || "Photo failed. Try again."; return; }
        try { s._src = r.image; s._img = await loadImg(r.image); if (note) note.textContent = ""; await redraw(); }
        catch (e) { if (note) note.textContent = "Couldn’t draw that photo. Try “New photo”."; }
      });
      return photoQueue;
    }

    async function renderPost(p) {
      lastPost = p;
      TT = p.platform === "tiktok"; H = TT ? 1920 : 1350;
      try { await Promise.all(["700 100px", "italic 400 40px", "400 40px"].map(function (f) { return document.fonts.load(f + ' "Playfair Display"'); })); } catch (e) { /* fall back to Times */ }
      var out = $("#c-out"); out.innerHTML = "";
      var st = el("div", "stack");
      var grid = el("div", "slides"); st.appendChild(grid);
      var slides = p.slides || [];
      slideBlobs = new Array(slides.length);

      slides.forEach(function (s, i) {
        var box = el("div", "slide"), img = el("img"); img.alt = "Slide " + (i + 1);
        async function redraw() {
          var b = await toBlob(drawSlide(s, i, slides.length));
          slideBlobs[i] = b;
          if (img.src) URL.revokeObjectURL(img.src);
          img.src = URL.createObjectURL(b);
        }
        box.appendChild(img);
        if (s.kind !== "cover" || slides.length > 1) {
          var k = el("input"); k.value = s.kicker || ""; k.placeholder = s.kind === "point" ? "Label or number" : "Small label"; k.setAttribute("aria-label", "Slide " + (i + 1) + " label");
          k.addEventListener("input", function () { s.kicker = k.value; redraw(); }); box.appendChild(k);
        }
        var h = el("textarea"); h.rows = 2; h.value = s.headline || ""; h.setAttribute("aria-label", "Slide " + (i + 1) + " headline");
        h.addEventListener("input", function () { s.headline = h.value; redraw(); }); box.appendChild(h);
        var bd = el("textarea"); bd.rows = 3; bd.value = s.body || ""; bd.placeholder = "Smaller text"; bd.setAttribute("aria-label", "Slide " + (i + 1) + " text");
        bd.addEventListener("input", function () { s.body = bd.value; redraw(); }); box.appendChild(bd);
        // Photo controls
        var note = el("small", "muted", ""); note.style.display = "block";
        var prow = el("div", "row");
        if (s.image_prompt != null) {
          var ip = el("textarea"); ip.rows = 2; ip.value = s.image_prompt || ""; ip.placeholder = "Describe the background photo"; ip.setAttribute("aria-label", "Slide " + (i + 1) + " photo description");
          ip.addEventListener("input", function () { s.image_prompt = ip.value; }); box.appendChild(ip);
          var np = el("button", "btn btn-ghost", s._img ? "New photo" : "Make photo"); np.type = "button";
          np.addEventListener("click", function () { np.textContent = "New photo"; makePhoto(s, redraw, note); }); prow.appendChild(np);
        }
        var upl = el("button", "btn btn-ghost", "Use my photo"); upl.type = "button";
        upl.addEventListener("click", function () {
          var f = document.createElement("input"); f.type = "file"; f.accept = "image/*";
          f.onchange = async function () { if (!f.files[0]) return; var u = URL.createObjectURL(f.files[0]); s._img = await loadImg(u); s._src = u; redraw(); };
          f.click();
        });
        prow.appendChild(upl);
        if (s._img || s.kind === "point") {
          var rm = el("button", "btn btn-ghost", "No photo"); rm.type = "button";
          rm.addEventListener("click", function () { s._img = null; s._src = null; redraw(); }); prow.appendChild(rm);
        }
        box.appendChild(prow); box.appendChild(note);
        s._redraw = redraw; s._note = note;
        var row = el("div", "row"); row.appendChild(el("small", "muted", (i + 1) + " · " + s.kind));
        var dl = el("button", "btn btn-ghost", "Save"); dl.type = "button";
        dl.addEventListener("click", function () { download(slideBlobs[i], i); }); row.appendChild(dl);
        box.appendChild(row);
        grid.appendChild(box);
        redraw();
      });

      var all = el("button", "btn btn-ghost", "Download all images"); all.type = "button";
      all.addEventListener("click", function () { slideBlobs.forEach(function (b, i) { setTimeout(function () { download(b, i); }, i * 350); }); });
      st.appendChild(all);
      if (TT) { // older TikTok drafts: offer the 4:5 version
        var sw = el("button", "btn btn-ghost", "Make a 4:5 version (Threads / Instagram)"); sw.type = "button";
        sw.addEventListener("click", function () { p.platform = "threads"; renderPost(p); });
        st.appendChild(sw);
      }
      if (p.platform === "threads") {
        var tText = captionOf(p);
        st.appendChild(copyBlock("Threads post", tText));
        var op = el("a", "btn btn-primary", "Open in Threads"); op.href = threadsLink(tText); op.target = "_blank"; op.rel = "noopener";
        st.appendChild(op);
        st.appendChild(el("p", "hint", "Open in Threads fills in the text. To add the slides: download them, then attach them in the Threads post before you tap Post."));
      }
      var missing = slides.filter(function (s) { return s.image_prompt && !s._img; });
      if (p.photos && imagesOn && missing.length) {
        var mk = el("button", "btn btn-primary", "Make all " + missing.length + " photos"); mk.type = "button";
        mk.addEventListener("click", function () { mk.remove(); makeAllPhotos(p); });
        st.insertBefore(mk, st.firstChild.nextSibling);
      }

      (p.hooks || []).forEach(function (hk, i) {
        var c = copyBlock("Other cover hook " + (i + 1), hk);
        var use = el("button", "btn btn-ghost", "Use"); use.type = "button";
        use.addEventListener("click", function () { if (slides[0]) { slides[0].headline = hk; renderPost(p); } });
        var btns = el("div", "btns"); btns.appendChild(c.lastChild); btns.appendChild(use); c.appendChild(btns); st.appendChild(c);
      });
      var cap = captionOf(p);
      st.appendChild(copyBlock("Caption + hashtags", cap));
      if (p.alt_text) st.appendChild(copyBlock("Alt text", p.alt_text));
      var useCap = el("button", "btn btn-primary", "Use this caption for posting"); useCap.type = "button";
      useCap.addEventListener("click", function () { $("#c-caption").value = cap; $("#c-caption").scrollIntoView({ behavior: "smooth", block: "center" }); });
      st.appendChild(useCap);
      out.appendChild(st);
      $("#c-ready").textContent = slides.length > 1 ? "Ready: your " + slides.length + " slides will post as one carousel." : "Ready: your image will post as a single photo.";
      if (!$("#c-caption").value.trim()) $("#c-caption").value = cap;
    }
    function download(blob, i) {
      if (!blob) return;
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "project-sarae-" + (TT ? "tiktok" : "instagram") + "-slide-" + (i + 1) + ".jpg"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }

    // Older saved items were video scripts; show them simply.
    function renderOldScript(s) {
      lastPost = null; slideBlobs = [];
      var out = $("#c-out"); out.innerHTML = ""; var st = el("div", "stack");
      st.appendChild(el("p", "muted", "This is an older video script."));
      (s.hooks || []).forEach(function (h, i) { st.appendChild(copyBlock("Hook " + (i + 1), h)); });
      (s.scenes || []).forEach(function (sc, i) { st.appendChild(copyBlock("Scene " + (i + 1), [sc.visual_prompt, sc.on_screen_text, sc.voiceover].filter(Boolean).join(" · "))); });
      st.appendChild(copyBlock("Caption + hashtags", captionOf(s)));
      out.appendChild(st);
    }

    $("#c-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = $("#c-go"); btn.disabled = true; say("#c-msg", "Writing your post and drawing the images…");
      var payload = { topic: $("#c-topic").value, format: $("#c-format").value, goal: $("#c-goal").value,
        platform: $("#c-platform").value, photos: $("#c-photos").checked, look: $("#c-look").value };
      // Gemini sometimes shapes its JSON differently (a bare list of slides, or slides nested
      // under another key). Find the slides wherever they are, and retry once before giving up.
      function isSlideList(a) { return Array.isArray(a) && a.length && a.every(function (x) { return x && typeof x === "object" && (x.headline || x.title || x.text); }); }
      function findSlides(o, depth) {
        if (!o || typeof o !== "object" || depth > 4) return null;
        if (isSlideList(o)) return o;
        if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) { var a = findSlides(o[i], depth + 1); if (a) return a; } return null; }
        for (var k in o) { if (/slide/i.test(k) && isSlideList(o[k])) return o[k]; }
        for (var k2 in o) { var b = findSlides(o[k2], depth + 1); if (b) return b; }
        return null;
      }
      function normalize(raw) {
        if (!raw || raw.error || raw.notConnected) return raw || {};
        if (raw.scenes && !raw.slides) return { error: "Your Supabase admin-api is still the old video-script version. Redeploy it: Supabase → Edge Functions → admin-api → Code, paste the latest supabase/functions/admin-api/index.ts from GitHub, click Deploy." };
        var d = Array.isArray(raw) ? (isSlideList(raw) ? { slides: raw } : (raw[0] || {})) : raw;
        if (!isSlideList(d.slides)) {
          var found = findSlides(d, 0);
          var holder = found && !Array.isArray(d) ? (Object.keys(d).map(function (k) { return d[k]; }).filter(function (v) { return v && v.slides === found; })[0]) : null;
          if (holder) d = Object.assign({}, holder, d);
          d.slides = found || [];
        }
        d.slides = d.slides.map(function (s) {
          return { kind: s.kind || "point", kicker: s.kicker || "", headline: s.headline || s.title || s.text || "",
            body: s.body || s.subline || s.description || "", image_prompt: s.image_prompt };
        });
        if (d.slides.length) d.slides[0].kind = "cover";
        if (!Array.isArray(d.hashtags)) d.hashtags = typeof d.hashtags === "string" ? d.hashtags.split(/[\s,]+/).map(function (h) { return h.replace(/^#/, ""); }).filter(Boolean) : [];
        if (!Array.isArray(d.hooks)) d.hooks = [];
        return d;
      }
      var d = normalize(await api("generate", payload));
      if (!d.error && !d.notConnected && !d.slides.length) {
        say("#c-msg", "The AI’s first try came back empty. Trying once more…");
        d = normalize(await api("generate", payload));
      }
      btn.disabled = false;
      if (d.notConnected) { show($("#c-ai-off"), true); say("#c-msg", ""); return; }
      if (d.error) { say("#c-msg", d.error, "err"); return; }
      if (!d.slides || !d.slides.length) { say("#c-msg", "The AI didn’t return any slides after two tries. Try a shorter topic or a different format.", "err"); return; }
      d.slides = d.slides.slice(0, 10);
      d.type = "photo"; d.platform = payload.platform; d.photos = payload.photos;
      if (d.photos) d.slides.forEach(function (sl) { if (sl.image_prompt == null) sl.image_prompt = ""; });
      say("#c-msg", "Done. Saved to your drafts below.", "ok");
      $("#c-caption").value = "";
      await renderPost(d);
      await sb.from("content_posts").insert({ topic: payload.topic, script: lean(d), caption: captionOf(d).slice(0, 2200), status: "draft" });
      loadHistory();
      if (d.photos && imagesOn) makeAllPhotos(d);
    });

    async function makeAllPhotos(p) {
      var list = (p.slides || []).filter(function (s) { return s.image_prompt && !s._img; });
      for (var i = 0; i < list.length; i++) {
        if (lastPost !== p) return; // they opened a different post
        say("#c-msg", "Making free AI photos… " + (i + 1) + " of " + list.length);
        await makePhoto(list[i], list[i]._redraw, list[i]._note);
      }
      if (lastPost === p) say("#c-msg", "Done. Tweak any words, then download or post.", "ok");
    }

    async function loadHistory() {
      var r = await sb.from("content_posts").select("*").order("created_at", { ascending: false }).limit(30);
      var box = $("#c-history"); box.innerHTML = "";
      if (r.error) { box.appendChild(el("p", "muted", "Run supabase-tools-setup.sql in Supabase first (SETUP-TOOLS.md, step 1).")); return; }
      if (!r.data.length) { box.appendChild(el("p", "muted", "Nothing yet.")); return; }
      r.data.forEach(function (p) {
        var row = el("div", "pay-row"), left = el("div");
        left.appendChild(el("b", "", p.topic || (p.caption || "").slice(0, 80) || "Post"));
        left.appendChild(el("small", "", new Date(p.created_at).toLocaleString() + " · " + (p.status === "posted" ? "Posted" : p.status === "failed" ? "Didn’t post" : "Draft")));
        var act = el("div");
        if (p.permalink) { var a = el("a", "btn btn-ghost", "View"); a.href = p.permalink; a.target = "_blank"; a.rel = "noopener"; a.style.padding = "6px 11px"; act.appendChild(a); }
        else if (p.script) {
          var o = el("button", "btn btn-ghost", "Open"); o.type = "button"; o.style.padding = "6px 11px";
          o.addEventListener("click", function () {
            if (p.script.type === "threads_day") { tPlan = { id: p.id, posts: JSON.parse(JSON.stringify(p.script.posts || [])) }; renderThreadsDay(); $("#t-card").scrollIntoView({ behavior: "smooth" }); return; }
            if (p.script.slides) { $("#c-topic").value = p.topic || ""; $("#c-caption").value = ""; renderPost(JSON.parse(JSON.stringify(p.script))); }
            else renderOldScript(p.script);
            $("#c-out-card").scrollIntoView({ behavior: "smooth" });
          });
          act.appendChild(o);
        }
        row.appendChild(left); row.appendChild(act); box.appendChild(row);
      });
    }

    /* =================== THREADS: today's hourly posts =================== */
    var tPlan = null; // { id, posts:[{time,type,text,posted}] }
    function renderThreadsDay() {
      var box = $("#t-list"); box.innerHTML = "";
      show($("#t-save"), !!tPlan);
      if (!tPlan) return;
      function progress() {
        var done = tPlan.posts.filter(function (x) { return x.posted; }).length;
        $("#t-progress").textContent = done + " of " + tPlan.posts.length + " posted";
      }
      tPlan.posts.forEach(function (x) {
        var row = el("div", "copyable"); row.style.alignItems = "flex-start";
        var left = el("div"); left.style.flex = "1";
        left.appendChild(el("b", "", x.time + " · " + x.type));
        var ta = el("textarea"); ta.rows = 4; ta.maxLength = 500; ta.value = x.text; ta.style.width = "100%"; ta.style.marginTop = "6px";
        ta.setAttribute("aria-label", x.time + " Threads post");
        var count = el("small", "muted", x.text.length + "/500");
        var op = el("a", "btn btn-primary", "Open in Threads"); op.href = threadsLink(x.text); op.target = "_blank"; op.rel = "noopener"; op.style.padding = "6px 11px";
        ta.addEventListener("input", function () { x.text = ta.value; count.textContent = ta.value.length + "/500"; op.href = threadsLink(ta.value); });
        left.appendChild(ta); left.appendChild(count);
        var act = el("div", "btns"); act.style.display = "flex"; act.style.flexDirection = "column"; act.style.gap = "6px";
        var cp = el("button", "btn btn-ghost", "Copy"); cp.type = "button"; cp.style.padding = "6px 11px";
        cp.addEventListener("click", function () { copy(x.text, cp); });
        var lab = el("label"); lab.style.display = "flex"; lab.style.gap = "6px"; lab.style.alignItems = "center"; lab.style.fontWeight = "700";
        var ck = el("input"); ck.type = "checkbox"; ck.style.width = "auto"; ck.checked = !!x.posted;
        ck.addEventListener("change", function () { x.posted = ck.checked; row.style.opacity = ck.checked ? ".55" : "1"; progress(); saveThreadsDay(true); });
        lab.appendChild(ck); lab.appendChild(document.createTextNode("Posted"));
        row.style.opacity = x.posted ? ".55" : "1";
        act.appendChild(op); act.appendChild(cp); act.appendChild(lab);
        row.appendChild(left); row.appendChild(act); box.appendChild(row);
      });
      progress();
    }
    async function saveThreadsDay(quiet) {
      if (!tPlan) return;
      var script = { type: "threads_day", posts: tPlan.posts };
      var caption = tPlan.posts.map(function (x) { return x.time + ": " + x.text; }).join("\n\n").slice(0, 2200);
      var allDone = tPlan.posts.every(function (x) { return x.posted; });
      var r = tPlan.id
        ? await sb.from("content_posts").update({ script: script, caption: caption, status: allDone ? "posted" : "draft" }).eq("id", tPlan.id).select().single()
        : await sb.from("content_posts").insert({ topic: "Threads posts · " + new Date().toLocaleDateString(), script: script, caption: caption, status: "draft" }).select().single();
      if (r.error) { say("#t-msg", "Couldn’t save. " + r.error.message, "err"); return; }
      tPlan.id = r.data.id;
      if (!quiet) { say("#t-msg", "Saved.", "ok"); loadHistory(); }
    }
    $("#t-save").addEventListener("click", function () { saveThreadsDay(false); });
    $("#t-go").addEventListener("click", async function () {
      if (tPlan && tPlan.posts.some(function (x) { return !x.posted; }) && !confirm("Replace the posts you have now with 16 new ones? (Your current list stays in Saved drafts.)")) return;
      var btn = $("#t-go"); btn.disabled = true; say("#t-msg", "Writing 16 Threads posts…");
      var r = await api("threads_day", { focus: $("#t-focus").value });
      btn.disabled = false;
      if (r.notConnected) { say("#t-msg", "AI writing isn’t connected yet. Add a free GEMINI_API_KEY (SETUP-TOOLS.md, step 4).", "err"); return; }
      if (r.error) { say("#t-msg", /unknown|bad action|not found/i.test(r.error) ? "Redeploy your Supabase admin-api function with the latest code from GitHub first." : r.error, "err"); return; }
      if (!r.posts || !r.posts.length) { say("#t-msg", "The AI didn’t return any posts. Try again.", "err"); return; }
      tPlan = { id: null, posts: r.posts.map(function (x) { return { time: x.time, type: x.type, text: x.text, posted: false }; }) };
      renderThreadsDay();
      await saveThreadsDay(true);
      say("#t-msg", "Done. Review each post, then post it at its hour.", "ok");
      loadHistory();
    });

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    $("#c-post").addEventListener("click", async function () {
      var picked = Array.prototype.slice.call($("#c-file").files || []);
      var caption = $("#c-caption").value.trim();
      var blobs = picked.length ? picked : slideBlobs.filter(Boolean);
      if (!blobs.length) { say("#c-post-msg", "Make a post above or choose your .jpg photos first.", "err"); return; }
      if (!picked.length && TT) { say("#c-post-msg", "These slides are 9:16, which Instagram feed posts don’t accept. Click “Make a 4:5 version” above first, then post.", "err"); return; }
      if (blobs.length > 10) { say("#c-post-msg", "Instagram allows up to 10 images in one post.", "err"); return; }
      if (blobs.some(function (b) { return b.size > 8 * 1024 * 1024; })) { say("#c-post-msg", "Each photo must be under 8 MB.", "err"); return; }
      var many = blobs.length > 1;
      if (!confirm("Post " + (many ? "this " + blobs.length + "-image carousel" : "this photo") + " to Instagram now?")) return;
      var btn = $("#c-post"), prog = $("#c-prog"); btn.disabled = true; show(prog, true); prog.value = 5;
      var paths = [];
      async function cleanup() { if (paths.length) await sb.storage.from("content-media").remove(paths); }
      async function fail(msg) { say("#c-post-msg", msg, "err"); btn.disabled = false; show(prog, false); await cleanup(); }
      try {
        var urls = [];
        for (var i = 0; i < blobs.length; i++) {
          say("#c-post-msg", "Uploading image " + (i + 1) + " of " + blobs.length + "…");
          var path = Date.now() + "-" + i + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
          var up = await sb.storage.from("content-media").upload(path, blobs[i], { contentType: "image/jpeg" });
          if (up.error) return fail("Upload failed: " + up.error.message);
          paths.push(path);
          urls.push(sb.storage.from("content-media").getPublicUrl(path).data.publicUrl);
          prog.value = 5 + Math.round(35 * (i + 1) / blobs.length);
        }
        say("#c-post-msg", "Sending to Instagram…");
        var id;
        if (many) {
          var kids = [];
          for (var j = 0; j < urls.length; j++) {
            var k = await api("ig_create", { mediaUrl: urls[j], kind: "carousel_item" });
            if (k.notConnected) return fail("Instagram isn’t connected yet. See SETUP-TOOLS.md, step 5.");
            if (k.error) return fail("Instagram (image " + (j + 1) + "): " + k.error);
            kids.push(k.id); prog.value = 40 + Math.round(30 * (j + 1) / urls.length);
          }
          var car = await api("ig_carousel", { children: kids, caption: caption });
          if (car.error) return fail("Instagram: " + car.error);
          id = car.id;
        } else {
          var c = await api("ig_create", { mediaUrl: urls[0], caption: caption, kind: "image" });
          if (c.notConnected) return fail("Instagram isn’t connected yet. See SETUP-TOOLS.md, step 5.");
          if (c.error) return fail("Instagram: " + c.error);
          id = c.id;
        }
        // Wait until Instagram has the post ready.
        for (var t = 0; t < 24; t++) {
          var s = await api("ig_check", { id: id });
          if (!s.status_code || s.status_code === "FINISHED") break;
          if (s.status_code === "ERROR" || s.error) return fail("Instagram couldn’t process these images. " + (s.status || s.error || ""));
          await wait(2500);
        }
        say("#c-post-msg", "Publishing…"); prog.value = 92;
        var p = await api("ig_publish", { id: id });
        if (p.error) return fail("Instagram: " + p.error);
        prog.value = 100;
        await cleanup();
        await sb.from("content_posts").insert({ topic: lastPost && !picked.length ? $("#c-topic").value.slice(0, 400) : null, script: picked.length || !lastPost ? null : lean(lastPost), caption: caption.slice(0, 2200), status: "posted", ig_media_id: p.id, permalink: p.permalink || null });
        say("#c-post-msg", "Posted to Instagram!", "ok");
        $("#c-file").value = ""; btn.disabled = false; setTimeout(function () { show(prog, false); }, 1500);
        loadHistory();
      } catch (err) { fail("Something went wrong. " + (err && err.message ? err.message : "")); }
    });
  }
})();
