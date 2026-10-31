/* =========================================================
   PROJECT SARAE — ADMIN TOOLS
   Sales (Stripe), Outreach pipeline, Content Studio (AI scripts + Instagram).
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

    /* =================== CONTENT STUDIO =================== */
    var lastScript = null;
    async function loadStudio() {
      loadHistory();
      var s = await api("status");
      if (s.error) { say("#c-msg", s.error, "err"); return; }
      show($("#c-ai-off"), !s.gemini);
      show($("#c-ig-off"), !s.instagram);
      if (s.instagram) {
        var a = await api("ig_account");
        $("#c-ig-acct").textContent = a.error ? "Instagram: " + a.error : "Posting to @" + a.username + " · " + (a.followers_count || 0) + " followers · " + (a.media_count || 0) + " posts";
      }
    }
    document.querySelectorAll("[data-idea]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); $("#c-topic").value = a.dataset.idea; });
    });
    function copyBlock(label, text) {
      var wrap = el("div", "copyable"), left = el("div");
      left.appendChild(el("b", "", label)); left.appendChild(el("p", "", text));
      var b = el("button", "btn btn-ghost", "Copy"); b.type = "button"; b.addEventListener("click", function () { copy(text, b); });
      wrap.appendChild(left); wrap.appendChild(b); return wrap;
    }
    function renderScript(s) {
      var out = $("#c-out"); out.innerHTML = "";
      var st = el("div", "stack");
      (s.hooks || []).forEach(function (h, i) { st.appendChild(copyBlock("Hook " + (i + 1), h)); });
      if (s.character_prompt) st.appendChild(copyBlock("Character (paste into your AI video app every time)", s.character_prompt));
      (s.scenes || []).forEach(function (sc, i) {
        var box = el("div", "scene stack");
        box.appendChild(el("span", "n", "Scene " + (i + 1)));
        box.appendChild(copyBlock("Video prompt", (s.character_prompt ? s.character_prompt + ". " : "") + sc.visual_prompt));
        if (sc.on_screen_text) box.appendChild(copyBlock("On-screen text", sc.on_screen_text));
        if (sc.voiceover) box.appendChild(copyBlock("Voiceover", sc.voiceover));
        st.appendChild(box);
      });
      var cap = (s.caption || "") + "\n\n" + (s.hashtags || []).map(function (h) { return "#" + String(h).replace(/^#/, ""); }).join(" ");
      st.appendChild(copyBlock("Caption + hashtags", cap.trim()));
      var use = el("button", "btn btn-primary", "Use this caption for posting"); use.type = "button";
      use.addEventListener("click", function () { $("#c-caption").value = cap.trim(); $("#c-caption").scrollIntoView({ behavior: "smooth", block: "center" }); });
      st.appendChild(use);
      out.appendChild(st);
    }
    $("#c-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = $("#c-go"); btn.disabled = true; say("#c-msg", "Writing your script…");
      var payload = { topic: $("#c-topic").value, style: $("#c-style").value, goal: $("#c-goal").value };
      var d = await api("generate", payload);
      btn.disabled = false;
      if (d.notConnected) { show($("#c-ai-off"), true); say("#c-msg", ""); return; }
      if (d.error) { say("#c-msg", d.error, "err"); return; }
      say("#c-msg", "Done. Saved to your scripts below.", "ok");
      lastScript = d; renderScript(d);
      var cap = (d.caption || "") + "\n\n" + (d.hashtags || []).map(function (h) { return "#" + String(h).replace(/^#/, ""); }).join(" ");
      await sb.from("content_posts").insert({ topic: payload.topic, script: d, caption: cap.trim().slice(0, 2200), status: "draft" });
      loadHistory();
    });

    async function loadHistory() {
      var r = await sb.from("content_posts").select("*").order("created_at", { ascending: false }).limit(30);
      var box = $("#c-history"); box.innerHTML = "";
      if (r.error) { box.appendChild(el("p", "muted", "Run supabase-tools-setup.sql in Supabase first (SETUP-TOOLS.md, step 1).")); return; }
      if (!r.data.length) { box.appendChild(el("p", "muted", "Nothing yet.")); return; }
      r.data.forEach(function (p) {
        var row = el("div", "pay-row"), left = el("div");
        left.appendChild(el("b", "", p.topic || (p.caption || "").slice(0, 80) || "Post"));
        left.appendChild(el("small", "", new Date(p.created_at).toLocaleString() + " · " + (p.status === "posted" ? "Posted" : p.status === "failed" ? "Didn’t post" : "Script")));
        var act = el("div");
        if (p.permalink) { var a = el("a", "btn btn-ghost", "View"); a.href = p.permalink; a.target = "_blank"; a.rel = "noopener"; a.style.padding = "6px 11px"; act.appendChild(a); }
        else if (p.script) { var o = el("button", "btn btn-ghost", "Open"); o.type = "button"; o.style.padding = "6px 11px"; o.addEventListener("click", function () { lastScript = p.script; renderScript(p.script); $("#c-out-card").scrollIntoView({ behavior: "smooth" }); }); act.appendChild(o); }
        row.appendChild(left); row.appendChild(act); box.appendChild(row);
      });
    }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    $("#c-post").addEventListener("click", async function () {
      var file = $("#c-file").files[0], caption = $("#c-caption").value.trim();
      if (!file) { say("#c-post-msg", "Choose your finished video or photo first.", "err"); return; }
      if (file.size > 50 * 1024 * 1024) { say("#c-post-msg", "That file is over 50 MB. Export it smaller in CapCut (1080p).", "err"); return; }
      var isVideo = /^video\//.test(file.type);
      if (!confirm("Post this " + (isVideo ? "Reel" : "photo") + " to Instagram now?")) return;
      var btn = $("#c-post"), prog = $("#c-prog"); btn.disabled = true; show(prog, true); prog.value = 10;
      var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + (isVideo ? (/quicktime/.test(file.type) ? ".mov" : ".mp4") : ".jpg");
      async function cleanup() { await sb.storage.from("content-media").remove([path]); }
      async function fail(msg) { say("#c-post-msg", msg, "err"); btn.disabled = false; show(prog, false); await cleanup(); }
      try {
        say("#c-post-msg", "Uploading…");
        var up = await sb.storage.from("content-media").upload(path, file, { contentType: file.type });
        if (up.error) return fail("Upload failed: " + up.error.message);
        prog.value = 35;
        var url = sb.storage.from("content-media").getPublicUrl(path).data.publicUrl;
        say("#c-post-msg", "Sending to Instagram…");
        var c = await api("ig_create", { mediaUrl: url, caption: caption, kind: isVideo ? "video" : "image" });
        if (c.notConnected) return fail("Instagram isn’t connected yet. See SETUP-TOOLS.md, step 5.");
        if (c.error) return fail("Instagram: " + c.error);
        if (isVideo) {
          say("#c-post-msg", "Instagram is processing your video. This can take a minute or two…");
          var ready = false;
          for (var i = 0; i < 60; i++) {
            await wait(5000);
            prog.value = Math.min(85, 40 + i * 2);
            var s = await api("ig_check", { id: c.id });
            if (s.status_code === "FINISHED") { ready = true; break; }
            if (s.status_code === "ERROR" || s.error) return fail("Instagram couldn’t process this video. " + (s.status || s.error || "Check it’s an .mp4, 9:16, 3 sec to 15 min."));
          }
          if (!ready) return fail("Instagram is still processing after 5 minutes. Try again in a bit.");
        }
        say("#c-post-msg", "Publishing…"); prog.value = 92;
        var p = await api("ig_publish", { id: c.id });
        if (p.error) return fail("Instagram: " + p.error);
        prog.value = 100;
        await cleanup();
        await sb.from("content_posts").insert({ topic: lastScript ? $("#c-topic").value.slice(0, 400) : null, script: lastScript, caption: caption.slice(0, 2200), status: "posted", ig_media_id: p.id, permalink: p.permalink || null });
        say("#c-post-msg", "Posted to Instagram!", "ok");
        $("#c-file").value = ""; btn.disabled = false; setTimeout(function () { show(prog, false); }, 1500);
        loadHistory();
      } catch (err) { fail("Something went wrong. " + (err && err.message ? err.message : "")); }
    });
  }
})();
