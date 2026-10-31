/* =========================================================
   PROJECT SARAE — SITE BUILDER (admin tab)
   Fill in a client's details → pick their plan & add-ons →
   choose 1–35 pages + policy pages → AI writes the pages →
   preview → publish to GitHub Pages (or download a ZIP).
   Secret keys stay in the Supabase "admin-api" function.
   ========================================================= */
(function () {
  "use strict";
  var B = window.PSBuilder;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function say(id, text, kind) { var m = $(id); if (!m) return; m.className = "msg" + (kind ? " " + kind : ""); m.textContent = text || ""; }
  function uid() { return "p" + Math.random().toString(36).slice(2, 9); }
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var MAX_PAGES = 35;

  /* Builder features. "plans" = which plan keys include it. "match" = add-on names that turn it on. */
  var FEATURES = [
    { k: "contact", label: "Contact form", plans: ["starter", "business", "pro"] },
    { k: "map", label: "Google Map", plans: ["starter", "business", "pro"] },
    { k: "domain", label: "Custom domain", plans: ["business", "pro"] },
    { k: "booking", label: "Online booking", plans: ["business", "pro"], page: "booking", match: /book|schedul/i },
    { k: "payments", label: "Online payments (Stripe links)", plans: ["business", "pro"], match: /payment/i },
    { k: "assistant", label: "AI chat assistant", plans: ["business", "pro"], match: /assistant|chat|\bai\b/i },
    { k: "members", label: "Member area", plans: ["pro"], page: "members", match: /account|member/i },
    { k: "reviews", label: "Google reviews", plans: [], page: "reviews", match: /review|google business/i },
    { k: "store", label: "Online store", plans: [], page: "store", match: /store|shop|product/i },
    { k: "leads", label: "Email list sign-up (Brevo / GoHighLevel)", plans: [], match: /follow|win back|remind|report|email/i }
  ];

  var started = false;
  document.addEventListener("ps-admin-ready", init);
  if (window.PS_ADMIN) init();

  function init() {
    if (started) return; started = true;
    var sb = window.PS_ADMIN.sb, C = window.SITE_CONFIG || {}, D = window.SITE_CONTENT || {};
    var host = $("#tab-builder"); if (!host) return;
    var st = blank(), content = {}, status = {}, pricing = { plans: D.plans || [], addons: D.addons || [] };
    var loaded = false, busy = false, savedSites = [];

    $$(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () { if (b.dataset.tab === "builder" && !loaded) { loaded = true; start(); } });
    });

    async function api(action, payload) {
      var r = await sb.functions.invoke("admin-api", { body: Object.assign({ action: action }, payload || {}) });
      if (r.error) return { error: "The admin API isn’t set up yet (SETUP-TOOLS.md, step 2)." };
      return r.data || {};
    }

    function blank() {
      return {
        slug: "", business: "", niche: "", city: "", tagline: "", about: "", audience: "", tone: "", extra: "",
        phone: "", email: "", address: "", hoursText: "", servicesText: "", instagram: "", facebook: "", tiktok: "",
        style: "elegant", colors: { primary: "#1f3b73", accent: "#c9a227", bg: "#fbf8f3", ink: "#1d1d1f" },
        logoUrl: "", heroUrl: "", galleryText: "", showNameWithLogo: true, credit: true,
        plan: "business", addons: [], extras: {}, features: {},
        bookingUrl: "", paymentsText: "", productsText: "", formEmail: "", leadFormUrl: "", membersUrl: "", domain: "",
        placeId: "", mapsUrl: "", reviewsText: "", reviewsEmbed: "",
        assistantName: "", assistantGreeting: "", assistantExtra: "",
        policies: { privacy: true, terms: true, refund: true, cookies: true, accessibility: true },
        cancelHours: 24, depositText: "", refundText: "", lawState: "Alabama",
        pages: [
          { id: uid(), title: "Home", type: "home", brief: "", inNav: true },
          { id: uid(), title: "Services", type: "services", brief: "", inNav: true },
          { id: uid(), title: "About", type: "about", brief: "", inNav: true },
          { id: uid(), title: "Contact", type: "contact", brief: "", inNav: true }
        ],
        repo: "", liveUrl: "", repoUrl: ""
      };
    }

    async function start() {
      host.innerHTML = layout();
      bindStatic();
      // Live pricing (what's saved in your Pricing & add-ons tab).
      var r = await sb.from("site_settings").select("key,value").in("key", ["plans", "addons"]);
      (r.data || []).forEach(function (x) {
        try { var v = JSON.parse(x.value); if (Array.isArray(v) && v.length) { if (x.key === "plans") { var by = {}; v.forEach(function (p) { by[p.key] = p; }); pricing.plans = (D.plans || []).map(function (p) { return by[p.key] || p; }); } else pricing.addons = v; } } catch (e) {}
      });
      status = await api("status");
      $("#b-ai-off").classList.toggle("hidden", !!status.gemini);
      $("#b-gh-off").classList.toggle("hidden", !!status.github);
      await loadSaved();
      fill();
    }

    /* ---------------- Layout ---------------- */
    function field(id, label, opts) {
      opts = opts || {};
      var inp = opts.area ? '<textarea id="' + id + '" rows="' + (opts.rows || 3) + '" placeholder="' + esc(opts.ph || "") + '"></textarea>'
        : '<input id="' + id + '" type="' + (opts.type || "text") + '" placeholder="' + esc(opts.ph || "") + '">';
      return '<div class="' + (opts.full ? "full" : "") + '"><label for="' + id + '">' + label + "</label>" + inp + (opts.hint ? '<div class="hint">' + opts.hint + "</div>" : "") + "</div>";
    }
    function layout() {
      return '<div class="card"><div class="top"><div><h3 style="margin:0">Client websites</h3><p class="muted" style="margin:4px 0 0">Open a saved site to edit and republish, or start a new one.</p></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><select id="b-saved"><option value="">New website</option></select><button class="btn btn-ghost" id="b-new" type="button">Start new</button></div></div></div>' +

        '<div class="card" style="margin-top:18px"><h3>1 · Client details</h3><div class="ed-grid">' +
        field("b-business", "Business name") + field("b-slug", "Site ID (used for the repo &amp; chat)", { hint: "Lowercase, no spaces. Filled in for you." }) +
        field("b-niche", "Type of business", { ph: "Hair salon, med spa, barbershop…" }) + field("b-city", "City", { ph: "Huntsville, AL" }) +
        field("b-tagline", "Tagline", { ph: "Healthy hair, modern color", full: true }) +
        field("b-about", "About the business (the AI only uses facts you write here)", { area: true, rows: 4, full: true, ph: "Owner, specialties, what makes them different, years open…" }) +
        field("b-audience", "Who are their customers?", { ph: "Busy professionals, brides, natural hair clients…" }) + field("b-tone", "Tone of voice", { ph: "Warm and upscale" }) +
        field("b-services", "Services (one per line: Name | Price | Short description)", { area: true, rows: 5, full: true, ph: "Silk press | 85 | Includes wash, deep condition, and trim\nKnotless braids | 180+ | Waist length, hair included" }) +
        field("b-hours", "Hours (one per line)", { area: true, rows: 4, ph: "Tue–Fri: 9am–7pm\nSat: 8am–4pm\nSun–Mon: Closed" }) +
        field("b-phone", "Phone") + field("b-email", "Business email", { type: "email" }) +
        field("b-address", "Address (for the map and footer)", { full: true }) +
        field("b-instagram", "Instagram (handle or link)") + field("b-facebook", "Facebook (page name or link)") + field("b-tiktok", "TikTok (handle or link)") +
        field("b-extra", "Anything else the AI should know", { area: true, rows: 2, ph: "Parking info, specials, brands they use…" }) +
        "</div></div>" +

        '<div class="card" style="margin-top:18px"><h3>2 · Look &amp; photos</h3><div class="ed-grid">' +
        '<div><label for="b-style">Style</label><select id="b-style" style="width:100%">' + Object.keys(B.STYLES).map(function (k) { return '<option value="' + k + '">' + B.STYLES[k].label + " (" + B.STYLES[k].head + ")</option>"; }).join("") + "</select></div>" +
        '<div><label>Colors</label><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
        [["primary", "Buttons"], ["accent", "Accent"], ["bg", "Background"], ["ink", "Text"]].map(function (c) { return '<label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:600;font-size:.85rem"><input type="color" id="b-c-' + c[0] + '" style="width:42px;height:34px;padding:2px"> ' + c[1] + "</label>"; }).join("") + "</div></div>" +
        imgField("b-logo", "Logo") + imgField("b-hero", "Homepage photo") +
        field("b-gallery", "Gallery photos (one link per line, or upload)", { area: true, rows: 3, full: true }) +
        '<div class="full"><input id="b-gallery-file" type="file" accept="image/*" multiple><div class="hint">Uploading adds the photos to the list above.</div></div>' +
        '<div class="full" style="display:flex;gap:18px;flex-wrap:wrap"><label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="b-showname" style="width:auto"> Show business name next to logo</label>' +
        '<label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="b-credit" style="width:auto"> “Website by Project Sarae” in footer</label></div>' +
        "</div></div>" +

        '<div class="card" style="margin-top:18px"><h3>3 · Plan, add-ons &amp; features</h3><p class="muted">Pulled from your Pricing &amp; add-ons tab. Picking a plan and add-ons turns on the matching features. You can also switch on extras.</p>' +
        '<div id="b-plans" class="grid g3" style="margin-top:10px"></div>' +
        '<h4 style="margin:20px 0 6px">Add-ons</h4><div id="b-addons"></div>' +
        '<h4 style="margin:20px 0 6px">Features on this site</h4><div id="b-features"></div>' +
        '<div id="b-feature-settings"></div></div>' +

        '<div class="card" style="margin-top:18px"><div class="top"><h3 style="margin:0">4 · Pages <span class="muted" id="b-count"></span></h3>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap" id="b-quick"></div></div>' +
        '<p class="muted">1 to ' + MAX_PAGES + ' pages. “Notes for AI” tells the AI what that page should cover. Tick “Menu” to show it in the top menu (up to 7).</p>' +
        '<div id="b-pages"></div>' +
        '<h4 style="margin:22px 0 6px">Policy pages (free templates, filled in with the client’s details)</h4><div id="b-policies" style="display:flex;gap:16px;flex-wrap:wrap"></div>' +
        '<div class="ed-grid" style="margin-top:8px" id="b-policy-opts">' +
        field("b-cancel", "Cancel at least … hours ahead", { type: "number" }) + field("b-law", "State (for Terms)") +
        field("b-deposit", "Deposit rule (optional)", { ph: "A $25 deposit is required to book and goes toward your service." }) +
        field("b-refund", "Refund rule (optional)", { ph: "Leave blank for a friendly default" }) + "</div>" +
        '<p class="hint">Policy pages are solid starting templates, not legal advice. Have the client read them before launch.</p></div>' +

        '<div class="card" style="margin-top:18px"><h3>5 · Write the pages with AI</h3>' +
        '<div id="b-ai-off" class="tool-off hidden" style="margin:10px 0"><b>AI writing isn’t connected yet.</b> Add a free <code>GEMINI_API_KEY</code> (SETUP-TOOLS.md, step 4). You can still build and publish: pages use the details you typed.</div>' +
        '<p class="muted">Gemini’s free tier allows a limited number of requests per minute, so pages are written one at a time. A 35-page site takes several minutes; keep this tab open.</p>' +
        '<div class="card-actions"><button class="btn btn-primary" type="button" id="b-write">Write missing pages</button><button class="btn btn-ghost" type="button" id="b-rewrite">Rewrite all</button>' +
        '<button class="btn btn-ghost" type="button" id="b-save">Save</button><div class="msg" id="b-msg" role="status"></div></div>' +
        '<progress id="b-prog" class="hidden" max="100" value="0" style="margin-top:12px"></progress></div>' +

        '<div class="card" style="margin-top:18px"><div class="top"><h3 style="margin:0">6 · Preview</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<select id="b-prev-page"></select><select id="b-prev-size"><option value="100%">Desktop</option><option value="390px">Phone</option></select><button class="btn btn-ghost" type="button" id="b-prev-go">Refresh</button></div></div>' +
        '<div style="margin-top:14px;background:var(--canvas);border:1px solid var(--line);border-radius:14px;padding:10px;overflow:auto"><iframe id="b-frame" title="Site preview" style="display:block;margin:0 auto;width:100%;height:720px;border:0;background:#fff;border-radius:8px"></iframe></div></div>' +

        '<div class="card" style="margin-top:18px"><h3>7 · Publish</h3>' +
        '<div id="b-gh-off" class="tool-off hidden" style="margin:10px 0"><b>GitHub publishing isn’t connected yet.</b> Add a <code>GITHUB_TOKEN</code> (SETUP-BUILDER.md, step 3). Until then, use “Download ZIP” and upload it to a repo yourself.</div>' +
        '<div class="ed-grid">' + field("b-repo", "GitHub repo name", { hint: "A new public repo is created on your GitHub account the first time." }) +
        field("b-site-url", "Live address", { hint: "Filled in after publishing. Used for the sitemap and Google." }) + "</div>" +
        '<div class="card-actions"><button class="btn btn-primary" type="button" id="b-publish">Publish to GitHub</button><button class="btn btn-ghost" type="button" id="b-zip">Download ZIP</button><div class="msg" id="b-pub-msg" role="status"></div></div>' +
        '<div id="b-live" class="hint" style="margin-top:10px"></div></div>';
    }
    function imgField(id, label) {
      return '<div><label for="' + id + '">' + label + ' (link or upload)</label><input id="' + id + '" placeholder="https://…"><input id="' + id + '-file" type="file" accept="image/*" style="margin-top:6px"></div>';
    }

    /* ---------------- State <-> form ---------------- */
    var MAP = { "b-business": "business", "b-slug": "slug", "b-niche": "niche", "b-city": "city", "b-tagline": "tagline", "b-about": "about", "b-audience": "audience",
      "b-tone": "tone", "b-services": "servicesText", "b-hours": "hoursText", "b-phone": "phone", "b-email": "email", "b-address": "address", "b-instagram": "instagram",
      "b-facebook": "facebook", "b-tiktok": "tiktok", "b-extra": "extra", "b-logo": "logoUrl", "b-hero": "heroUrl", "b-gallery": "galleryText", "b-cancel": "cancelHours",
      "b-law": "lawState", "b-deposit": "depositText", "b-refund": "refundText", "b-repo": "repo", "b-site-url": "liveUrl" };
    function fill() {
      Object.keys(MAP).forEach(function (id) { var e = $("#" + id); if (e) e.value = st[MAP[id]] == null ? "" : st[MAP[id]]; });
      $("#b-style").value = st.style;
      ["primary", "accent", "bg", "ink"].forEach(function (k) { $("#b-c-" + k).value = st.colors[k]; });
      $("#b-showname").checked = st.showNameWithLogo !== false; $("#b-credit").checked = st.credit !== false;
      $("#b-saved").value = st.slug && savedSites.some(function (s) { return s.slug === st.slug; }) ? st.slug : "";
      renderPlans(); renderPages(); renderPolicies(); refreshPreviewPages(); showLive();
    }
    function read() {
      Object.keys(MAP).forEach(function (id) { var e = $("#" + id); if (e) st[MAP[id]] = e.value.trim(); });
      st.style = $("#b-style").value;
      ["primary", "accent", "bg", "ink"].forEach(function (k) { st.colors[k] = $("#b-c-" + k).value; });
      st.showNameWithLogo = $("#b-showname").checked; st.credit = $("#b-credit").checked;
      $$("[data-fs]").forEach(function (e) { st[e.dataset.fs] = e.value.trim(); });
      st.slug = B.slugify(st.slug || st.business).slice(0, 60);
      if (!st.repo) st.repo = st.slug;
      st.cancelHours = Math.max(1, parseInt(st.cancelHours, 10) || 24);
      $$("#b-pages .pg").forEach(function (row) {
        var p = st.pages.filter(function (x) { return x.id === row.dataset.id; })[0]; if (!p) return;
        p.title = $(".pg-title", row).value.trim() || "Page"; p.type = $(".pg-type", row).value;
        p.brief = $(".pg-brief", row).value.trim(); p.inNav = $(".pg-nav", row).checked;
        p.slug = p.type === "home" ? "index" : B.slugify(p.title);
      });
      return st;
    }

    /* ---------------- Plans, add-ons, features ---------------- */
    function computeFeatures() {
      var f = {}, chosenAddons = pricing.addons.filter(function (a) { return st.addons.indexOf(a.key) > -1; });
      FEATURES.forEach(function (x) {
        var why = "";
        if (x.plans.indexOf(st.plan) > -1) why = "plan";
        else if (chosenAddons.some(function (a) { return x.match && x.match.test(a.name + " " + (a.text || "")); }) || (x.k === "reviews" && st.addons.indexOf("addon_gbp") > -1)) why = "add-on";
        else if (st.extras[x.k]) why = "extra";
        if (why) f[x.k] = why;
      });
      return f;
    }
    function renderPlans() {
      var pb = $("#b-plans");
      pb.innerHTML = pricing.plans.map(function (p) {
        return '<label class="card" style="cursor:pointer;margin:0;padding:16px;' + (st.plan === p.key ? "border-color:var(--blue);box-shadow:0 0 0 2px var(--blue-soft)" : "") + '">' +
          '<input type="radio" name="b-plan" value="' + esc(p.key) + '" ' + (st.plan === p.key ? "checked" : "") + ' style="width:auto;margin-right:6px"><b>' + esc(p.name) + "</b> · $" + esc(p.monthly) + "/mo" +
          '<ul class="muted" style="margin:8px 0 0;padding-left:18px;font-size:.85rem">' + (p.features || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></label>";
      }).join("");
      $$("input[name=b-plan]", pb).forEach(function (r) { r.onchange = function () { read(); st.plan = r.value; renderPlans(); autoPages(); }; });
      $("#b-addons").innerHTML = pricing.addons.length ? pricing.addons.map(function (a) {
        return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-weight:600"><input type="checkbox" value="' + esc(a.key) + '" ' + (st.addons.indexOf(a.key) > -1 ? "checked" : "") + ' style="width:auto"> ' + esc(a.name) + ' <span class="muted" style="font-weight:400">($' + esc(a.price) + (a.unit === "month" ? "/mo" : "") + ")</span></label>";
      }).join("") : '<p class="muted">No add-ons saved yet.</p>';
      $$("#b-addons input").forEach(function (c) { c.onchange = function () { read(); st.addons = $$("#b-addons input:checked").map(function (x) { return x.value; }); renderPlans(); autoPages(); }; });
      var f = computeFeatures(); st.features = {}; Object.keys(f).forEach(function (k) { st.features[k] = true; });
      $("#b-features").innerHTML = FEATURES.map(function (x) {
        var why = f[x.k], locked = why === "plan" || why === "add-on";
        return '<label style="display:inline-flex;gap:8px;align-items:center;margin:4px 16px 4px 0;font-weight:600"><input type="checkbox" data-feat="' + x.k + '" ' + (why ? "checked" : "") + (locked ? " disabled" : "") + ' style="width:auto"> ' + esc(x.label) +
          (why ? ' <span class="status ' + (why === "extra" ? "p" : "a") + '">' + (why === "plan" ? "in plan" : why === "add-on" ? "add-on" : "extra") + "</span>" : "") + "</label>";
      }).join("");
      $$("[data-feat]").forEach(function (c) { c.onchange = function () { read(); st.extras[c.dataset.feat] = c.checked; renderPlans(); autoPages(); }; });
      renderFeatureSettings();
    }
    function fs(key, label, opts) {
      opts = opts || {};
      var v = esc(st[key] || "");
      var inp = opts.area ? '<textarea data-fs="' + key + '" rows="' + (opts.rows || 3) + '" placeholder="' + esc(opts.ph || "") + '">' + v + "</textarea>"
        : '<input data-fs="' + key + '" value="' + v + '" placeholder="' + esc(opts.ph || "") + '">';
      return '<div class="' + (opts.full ? "full" : "") + '"><label>' + label + "</label>" + inp + (opts.hint ? '<div class="hint">' + opts.hint + "</div>" : "") + "</div>";
    }
    function renderFeatureSettings() {
      var F = st.features, h = "";
      if (F.contact) h += fs("formEmail", "Contact form sends to", { ph: st.email || "owner@business.com", hint: "Free via FormSubmit. The first message triggers a one-time “confirm” email to this address." });
      if (F.domain) h += fs("domain", "Client’s domain (optional)", { ph: "www.theirsalon.com", hint: "After publishing, point the domain’s DNS to GitHub Pages (SETUP-BUILDER.md, step 5)." });
      if (F.booking) h += fs("bookingUrl", "Booking link", { ph: "https://cal.com/… or their GoHighLevel / Square / Calendly link", hint: "Cal.com, Calendly, GoHighLevel and Square links show right on the page." , full: true });
      if (F.payments) h += fs("paymentsText", "Pay-online buttons (one per line: Service | Price | Stripe Payment Link)", { area: true, full: true, ph: "Deposit | 25 | https://buy.stripe.com/…", hint: "A name that matches a service gets a “Pay online” button in the service list." });
      if (F.store) h += fs("productsText", "Products (Name | Price | Stripe Payment Link | Photo link | Description)", { area: true, rows: 4, full: true, ph: "Edge control | 14 | https://buy.stripe.com/… | https://… | Strong hold, no flakes" });
      if (F.members) h += fs("membersUrl", "Member sign-in link", { ph: "Their booking app’s client login, GoHighLevel portal…", hint: "The Member page sends clients here to sign in." });
      if (F.leads) h += fs("leadFormUrl", "Email sign-up form link (Brevo form action URL)", { full: true, ph: "https://….sibforms.com/serve/…", hint: "Feeds the follow-up, reminder and win-back emails you run in Brevo / GoHighLevel." });
      if (F.reviews) h += '<div class="full"><h4 style="margin:14px 0 2px">Google reviews</h4><p class="hint" style="margin:0">Free: link to their Google reviews and feature their best ones. Google’s live reviews feed needs a paid API, so for automatic updates paste a free widget’s embed code (Trustindex or Elfsight free plan).</p></div>' +
        fs("placeId", "Google Place ID", { ph: "ChIJ…", hint: 'Find it with Google’s free “Place ID finder”. Powers the “Read reviews” and “Leave a review” buttons.' }) +
        fs("mapsUrl", "…or their Google Maps link", { ph: "https://maps.app.goo.gl/…" }) +
        fs("reviewsText", "Featured reviews (Name | Stars | Review, copied from their Google profile)", { area: true, rows: 3, full: true, ph: "Keisha M. | 5 | Best silk press I’ve ever had!" }) +
        fs("reviewsEmbed", "Review widget embed code (optional)", { area: true, rows: 2, full: true, ph: "<script src=…></script><div class=…></div>" });
      if (F.assistant) h += '<div class="full"><h4 style="margin:14px 0 2px">AI chat assistant</h4><p class="hint" style="margin:0">Free with Gemini. It only answers from this client’s details (services, prices, hours, policies) plus the extra answers below, and each site is capped per day so your free quota is safe.</p></div>' +
        fs("assistantName", "Assistant name", { ph: (st.business || "Business") + " Assistant" }) +
        fs("assistantGreeting", "First message", { ph: "Hi! Ask me about services, prices, or booking." }) +
        fs("assistantExtra", "Extra answers (FAQ for the assistant)", { area: true, rows: 3, full: true, ph: "Do you take walk-ins? Only on Saturdays.\nIs there parking? Free lot behind the building." });
      $("#b-feature-settings").innerHTML = h ? '<div class="ed-grid" style="margin-top:14px">' + h + "</div>" : "";
    }
    function autoPages() {
      // Add a page automatically when a feature that needs one is turned on.
      FEATURES.forEach(function (x) {
        if (x.page && st.features[x.k] && !st.pages.some(function (p) { return p.type === x.page; }) && st.pages.length < MAX_PAGES) {
          st.pages.push({ id: uid(), title: B.PAGE_TYPES[x.page].label.replace("Google reviews", "Reviews"), type: x.page, brief: "", inNav: true });
        }
      });
      renderPages(); refreshPreviewPages();
    }

    /* ---------------- Pages ---------------- */
    function renderPages() {
      var box = $("#b-pages");
      box.innerHTML = st.pages.map(function (p, i) {
        var done = content[p.id] && content[p.id].hero;
        return '<div class="ed-row pg" data-id="' + p.id + '" style="padding:12px 14px"><div style="display:grid;grid-template-columns:1.1fr 1fr 2fr auto;gap:10px;align-items:end">' +
          '<div><label>Title</label><input class="pg-title" value="' + esc(p.title) + '"></div>' +
          '<div><label>Type</label><select class="pg-type" style="width:100%">' + Object.keys(B.PAGE_TYPES).map(function (k) { return '<option value="' + k + '"' + (p.type === k ? " selected" : "") + ">" + B.PAGE_TYPES[k].label + "</option>"; }).join("") + "</select></div>" +
          '<div><label>Notes for AI (optional)</label><input class="pg-brief" value="' + esc(p.brief) + '" placeholder="What should this page cover?"></div>' +
          '<div style="display:flex;gap:6px;align-items:center;padding-bottom:4px"><label style="display:flex;gap:4px;align-items:center;margin:0;font-size:.8rem"><input type="checkbox" class="pg-nav" ' + (p.inNav ? "checked" : "") + ' style="width:auto">Menu</label>' +
          '<span class="status ' + (done ? "a" : "x") + '">' + (done ? "written" : "not written") + "</span></div></div>" +
          '<div class="ed-tools"><button class="btn btn-ghost" type="button" data-act="up"' + (i ? "" : " disabled") + '>↑</button><button class="btn btn-ghost" type="button" data-act="down"' + (i < st.pages.length - 1 ? "" : " disabled") + '>↓</button>' +
          '<button class="btn btn-ghost" type="button" data-act="write">' + (done ? "Rewrite" : "Write") + ' with AI</button><button class="btn btn-ghost" type="button" data-act="view">Preview</button>' +
          (st.pages.length > 1 ? '<button class="btn btn-danger" type="button" data-act="del">Remove</button>' : "") + "</div></div>";
      }).join("");
      $("#b-count").textContent = "(" + st.pages.length + " of " + MAX_PAGES + ")";
      $$("#b-pages .pg").forEach(function (row) {
        $$("[data-act]", row).forEach(function (btn) {
          btn.onclick = async function () {
            read(); var i = st.pages.findIndex(function (p) { return p.id === row.dataset.id; }), act = btn.dataset.act;
            if (act === "up" && i > 0) st.pages.splice(i - 1, 0, st.pages.splice(i, 1)[0]);
            if (act === "down") st.pages.splice(i + 1, 0, st.pages.splice(i, 1)[0]);
            if (act === "del" && confirm("Remove “" + st.pages[i].title + "”?")) { delete content[st.pages[i].id]; st.pages.splice(i, 1); }
            if (act === "write") { await writePages([st.pages[i]]); return; }
            if (act === "view") { renderPages(); refreshPreviewPages(); $("#b-prev-page").value = row.dataset.id; preview(); return; }
            renderPages(); refreshPreviewPages();
          };
        });
        $(".pg-type", row).onchange = function () { read(); renderPages(); refreshPreviewPages(); };
      });
      var quick = [["about", "About"], ["services", "Services"], ["gallery", "Gallery"], ["faq", "FAQ"], ["reviews", "Reviews"], ["booking", "Book"], ["contact", "Contact"], ["custom", "Custom page"]];
      $("#b-quick").innerHTML = quick.map(function (q) { return '<button class="btn btn-ghost ed-add" type="button" data-add="' + q[0] + '">+ ' + q[1] + "</button>"; }).join("");
      $$("[data-add]").forEach(function (b) {
        b.onclick = function () {
          read();
          if (st.pages.length >= MAX_PAGES) { alert("Sites can have up to " + MAX_PAGES + " pages (plus policy pages)."); return; }
          var t = b.dataset.add, title = t === "custom" ? "New page" : B.PAGE_TYPES[t].label.replace("Google reviews", "Reviews");
          st.pages.push({ id: uid(), title: title, type: t, brief: "", inNav: st.pages.filter(function (p) { return p.inNav; }).length < 7 && t !== "custom" });
          renderPages(); refreshPreviewPages();
          var rows = $$("#b-pages .pg"); var last = rows[rows.length - 1]; if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); $(".pg-title", last).select(); }
        };
      });
    }
    function renderPolicies() {
      $("#b-policies").innerHTML = Object.keys(B.POLICIES).map(function (k) {
        return '<label style="display:flex;gap:6px;align-items:center;margin:0;font-weight:600"><input type="checkbox" data-pol="' + k + '" ' + (st.policies[k] ? "checked" : "") + ' style="width:auto"> ' + B.POLICIES[k].title + "</label>";
      }).join("");
      $$("[data-pol]").forEach(function (c) { c.onchange = function () { st.policies[c.dataset.pol] = c.checked; refreshPreviewPages(); }; });
    }

    /* ---------------- AI writing ---------------- */
    async function writePages(list) {
      if (busy) return;
      read();
      if (!st.business) { say("#b-msg", "Add the business name first.", "err"); return; }
      if (!status.gemini) { say("#b-msg", "Connect Gemini first (SETUP-TOOLS.md, step 4).", "err"); return; }
      busy = true; var prog = $("#b-prog"); prog.classList.remove("hidden"); prog.value = 0;
      var titles = st.pages.map(function (p) { return p.title; }), done = 0, failed = 0;
      for (var i = 0; i < list.length; i++) {
        var p = list[i]; say("#b-msg", "Writing “" + p.title + "” (" + (i + 1) + " of " + list.length + ")…");
        var tries = 0, ok = false;
        while (tries < 4 && !ok) {
          tries++;
          var r = await api("build_page", { site: st, page: { title: p.title, type: p.type, brief: p.brief }, pages: titles });
          if (r.rateLimited) { say("#b-msg", "Gemini’s free limit is catching its breath. Waiting 40 seconds, then continuing…"); await sleep(40000); continue; }
          if (r.error || !r.hero) { if (tries >= 2) { failed++; break; } await sleep(4000); continue; }
          content[p.id] = r; ok = true; done++;
        }
        prog.value = Math.round((i + 1) / list.length * 100);
        renderPages();
        if (i < list.length - 1) await sleep(4500); // stay under the free per-minute limit
      }
      busy = false; prog.classList.add("hidden");
      await save(true);
      say("#b-msg", done + " page" + (done === 1 ? "" : "s") + " written" + (failed ? ", " + failed + " couldn’t be written (try “Write” on those again)" : "") + ". Saved.", failed ? "err" : "ok");
      preview();
    }

    /* ---------------- Save / load ---------------- */
    async function loadSaved() {
      var r = await sb.from("client_sites").select("slug,business,updated_at,live_url").order("updated_at", { ascending: false }).limit(200);
      if (r.error) { say("#b-msg", "Run supabase-builder-setup.sql in Supabase first (SETUP-BUILDER.md, step 1).", "err"); return; }
      savedSites = r.data || [];
      $("#b-saved").innerHTML = '<option value="">New website</option>' + savedSites.map(function (s) { return '<option value="' + esc(s.slug) + '">' + esc(s.business) + (s.live_url ? " · live" : "") + "</option>"; }).join("");
    }
    async function save(quiet) {
      read();
      if (!st.business) { if (!quiet) say("#b-msg", "Add the business name first.", "err"); return false; }
      var row = {
        slug: st.slug, business: st.business, plan: st.plan, data: st, pages: content, updated_at: new Date().toISOString(),
        assistant_on: !!st.features.assistant, assistant_name: (st.assistantName || st.business + " Assistant").slice(0, 40),
        assistant_info: B.assistantInfo(st), live_url: st.liveUrl || null, repo_url: st.repoUrl || null
      };
      var r = await sb.from("client_sites").upsert(row, { onConflict: "slug" });
      if (r.error) { say("#b-msg", "Couldn’t save: " + r.error.message, "err"); return false; }
      if (!quiet) say("#b-msg", "Saved.", "ok");
      await loadSaved(); $("#b-saved").value = st.slug;
      return true;
    }
    async function open(slug) {
      if (!slug) { st = blank(); content = {}; fill(); preview(); return; }
      var r = await sb.from("client_sites").select("*").eq("slug", slug).maybeSingle();
      if (r.error || !r.data) { say("#b-msg", "Couldn’t open that site.", "err"); return; }
      st = Object.assign(blank(), r.data.data || {}); content = r.data.pages || {};
      st.colors = Object.assign(blank().colors, st.colors || {}); st.policies = Object.assign({}, st.policies || {});
      fill(); preview(); say("#b-msg", "Opened " + st.business + ".", "ok");
    }

    /* ---------------- Preview ---------------- */
    function assistantOpt() {
      return C.supabaseUrl ? { endpoint: C.supabaseUrl.replace(/\/$/, "") + "/functions/v1/site-assistant", key: C.supabaseAnonKey } : null;
    }
    function refreshPreviewPages() {
      var sel = $("#b-prev-page"), cur = sel.value;
      var out = st.pages.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + "</option>"; });
      Object.keys(B.POLICIES).forEach(function (k) { if (st.policies[k]) out.push('<option value="policy-' + k + '">' + B.POLICIES[k].title + "</option>"); });
      sel.innerHTML = out.join(""); if (cur && $$("option", sel).some(function (o) { return o.value === cur; })) sel.value = cur;
    }
    function preview() {
      read();
      if (!st.business) { $("#b-frame").srcdoc = '<p style="font-family:sans-serif;padding:30px;color:#777">Add a business name to see the preview.</p>'; return; }
      var out = B.generate(st, content, { inline: true, assistant: assistantOpt(), baseUrl: st.liveUrl });
      var id = $("#b-prev-page").value, all = out.pages.concat(out.policies);
      var page = all.filter(function (p) { return p.id === id; })[0] || all[0];
      var frame = $("#b-frame");
      frame.style.width = $("#b-prev-size").value;
      frame.srcdoc = out.files[page.file];
      frame.onload = function () {
        try {
          frame.contentDocument.addEventListener("click", function (e) {
            var a = e.target.closest && e.target.closest("a"); if (!a) return;
            var href = a.getAttribute("href") || "";
            var target = all.filter(function (p) { return p.file === href; })[0];
            if (target) { e.preventDefault(); $("#b-prev-page").value = target.id; preview(); }
            else if (/^https?:/.test(href)) { e.preventDefault(); window.open(href, "_blank", "noopener"); }
          });
        } catch (err) {}
      };
    }

    /* ---------------- Publish / ZIP ---------------- */
    function buildFiles() {
      var base = st.domain ? "https://" + st.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "") + "/" : st.liveUrl;
      return B.generate(st, content, { assistant: assistantOpt(), baseUrl: base });
    }
    async function publish() {
      if (busy) return;
      if (!(await save(true))) { say("#b-pub-msg", "Fix the details above first.", "err"); return; }
      if (!status.github) { say("#b-pub-msg", "Connect GitHub first (SETUP-BUILDER.md, step 3), or download the ZIP.", "err"); return; }
      var missing = st.pages.filter(function (p) { return !(content[p.id] && content[p.id].hero); }).length;
      if (missing && !confirm(missing + " page(s) haven’t been written by AI yet and will use your basic details. Publish anyway?")) return;
      busy = true; say("#b-pub-msg", "Publishing " + st.business + "…");
      var out = buildFiles();
      var r = await api("gh_publish", { repo: st.repo || st.slug, files: out.files, cname: st.domain || "", description: st.business + " website", message: "Update site from Project Sarae admin" });
      busy = false;
      if (r.notConnected) { say("#b-pub-msg", "Connect GitHub first (SETUP-BUILDER.md, step 3).", "err"); return; }
      if (r.error) { say("#b-pub-msg", r.error, "err"); return; }
      var firstTime = !st.liveUrl;
      st.liveUrl = r.liveUrl; st.repoUrl = r.repoUrl; st.repo = r.repo; $("#b-site-url").value = r.liveUrl; $("#b-repo").value = r.repo;
      await save(true);
      if (firstTime) { await api("gh_publish", { repo: st.repo, files: buildFiles().files, cname: st.domain || "", message: "Add sitemap" }); }
      say("#b-pub-msg", "Published! GitHub takes about a minute to put it live.", "ok");
      showLive();
    }
    function showLive() {
      $("#b-live").innerHTML = st.liveUrl ? 'Live: <a href="' + esc(st.liveUrl) + '" target="_blank" rel="noopener">' + esc(st.liveUrl) + "</a>" + (st.repoUrl ? ' · <a href="' + esc(st.repoUrl) + '" target="_blank" rel="noopener">GitHub repo</a>' : "") : "";
    }
    function loadZip() {
      return new Promise(function (res, rej) {
        if (window.JSZip) return res();
        var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    async function zip() {
      read(); if (!st.business) { say("#b-pub-msg", "Add the business name first.", "err"); return; }
      say("#b-pub-msg", "Building ZIP…");
      try { await loadZip(); } catch (e) { say("#b-pub-msg", "Couldn’t load the ZIP tool. Check your connection.", "err"); return; }
      var out = buildFiles(), z = new window.JSZip();
      Object.keys(out.files).forEach(function (f) { z.file(f, out.files[f]); });
      var blob = await z.generateAsync({ type: "blob" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = (st.slug || "website") + ".zip"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      say("#b-pub-msg", "ZIP downloaded (" + Object.keys(out.files).length + " files).", "ok");
    }

    /* ---------------- Uploads ---------------- */
    async function upload(file) {
      read();
      var path = "builder/" + (st.slug || "site") + "/" + Date.now() + "-" + file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      var up = await sb.storage.from("site-images").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) { alert("Upload failed: " + up.error.message); return ""; }
      return sb.storage.from("site-images").getPublicUrl(path).data.publicUrl;
    }

    /* ---------------- Events ---------------- */
    function bindStatic() {
      $("#b-saved").onchange = function () { open(this.value); };
      $("#b-new").onclick = function () { if (confirm("Start a new website? Unsaved changes here will be lost.")) { $("#b-saved").value = ""; open(""); } };
      $("#b-business").addEventListener("input", function () { var s = $("#b-slug"); if (!s.dataset.touched) s.value = B.slugify(this.value); });
      $("#b-slug").addEventListener("input", function () { this.dataset.touched = "1"; });
      [["b-logo", false], ["b-hero", false]].forEach(function (x) {
        $("#" + x[0] + "-file").onchange = async function () { if (!this.files[0]) return; var u = await upload(this.files[0]); if (u) { $("#" + x[0]).value = u; preview(); } this.value = ""; };
      });
      $("#b-gallery-file").onchange = async function () {
        var fs = Array.prototype.slice.call(this.files), urls = [];
        for (var i = 0; i < fs.length; i++) { var u = await upload(fs[i]); if (u) urls.push(u); }
        var g = $("#b-gallery"); g.value = (g.value.trim() ? g.value.trim() + "\n" : "") + urls.join("\n"); this.value = ""; preview();
      };
      $("#b-write").onclick = function () { read(); writePages(st.pages.filter(function (p) { return !(content[p.id] && content[p.id].hero); })); };
      $("#b-rewrite").onclick = function () { read(); if (confirm("Rewrite all " + st.pages.length + " pages? This replaces the current AI text.")) writePages(st.pages.slice()); };
      $("#b-save").onclick = function () { save(false); };
      $("#b-prev-go").onclick = preview; $("#b-prev-page").onchange = preview; $("#b-prev-size").onchange = preview;
      $("#b-publish").onclick = publish; $("#b-zip").onclick = zip;
    }
  }
})();
