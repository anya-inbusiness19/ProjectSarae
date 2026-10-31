/* =========================================================
   PROJECT SARAE — CLIENT DASHBOARD (client.html)
   Your clients sign in here to edit their website, manage
   products, and see orders. They can only touch their own site.
   ========================================================= */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, B = window.PSBuilder;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function show(el, on) { el.classList.toggle("hidden", !on); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function say(id, t, kind) { var m = $(id); m.className = "msg" + (kind ? " " + kind : ""); m.textContent = t || ""; }
  if (!(C.supabaseUrl && C.supabaseAnonKey && window.supabase)) { document.body.insertAdjacentHTML("beforeend", "<p style='padding:30px'>Not configured.</p>"); return; }

  var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  var SUPA = C.supabaseUrl.replace(/\/$/, "");
  var needsPassword = /type=(invite|recovery|signup)/.test(location.hash) || /type=(invite|recovery)/.test(location.search);
  var sites = [], row = null, st = null, page = null, editor = null, store = null, products = [], saveTimer = null, dirty = false, unpublished = false;

  /* ---------------- Auth ---------------- */
  sb.auth.onAuthStateChange(function (ev) { if (ev === "PASSWORD_RECOVERY") { needsPassword = true; enter(); } });
  async function enter() {
    var s = await sb.auth.getSession();
    show($("#login"), false); show($("#setpw"), false); show($("#nosite"), false); show($("#dash"), false);
    if (!s.data.session) { show($("#login"), true); show($("#logout"), false); return; }
    show($("#logout"), true);
    if (needsPassword) { show($("#setpw"), true); return; }
    var m = await sb.from("site_members").select("site_slug");
    var slugs = (m.data || []).map(function (x) { return x.site_slug; });
    if (!slugs.length) { show($("#nosite"), true); return; }
    var r = await sb.from("client_sites").select("slug,business,data,live_url,assistant_on").in("slug", slugs).order("business");
    sites = r.data || [];
    if (!sites.length) { show($("#nosite"), true); return; }
    $("#site-pick").innerHTML = sites.map(function (x) { return '<option value="' + esc(x.slug) + '">' + esc(x.business) + "</option>"; }).join("");
    show($("#site-pick"), sites.length > 1);
    open(sites[0].slug);
  }
  $("#login").addEventListener("submit", async function (e) {
    e.preventDefault(); say("#login-msg", "Signing in…");
    var r = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    if (r.error) return say("#login-msg", "Wrong email or password.", "err");
    say("#login-msg", ""); enter();
  });
  $("#forgot").addEventListener("click", async function (e) {
    e.preventDefault(); var em = $("#email").value.trim();
    if (!em) return say("#login-msg", "Type your email above first.", "err");
    await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
    say("#login-msg", "If that email has an account, a reset link is on its way.", "ok");
  });
  $("#setpw").addEventListener("submit", async function (e) {
    e.preventDefault();
    if ($("#pw1").value !== $("#pw2").value) return say("#pw-msg", "The passwords don’t match.", "err");
    var r = await sb.auth.updateUser({ password: $("#pw1").value });
    if (r.error) return say("#pw-msg", r.error.message, "err");
    needsPassword = false; history.replaceState(null, "", location.pathname); enter();
  });
  $("#logout").addEventListener("click", async function () { if (dirty) await saveNow(); await sb.auth.signOut(); location.reload(); });
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------------- Tabs ---------------- */
  $$(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); show($("#tab-" + x.dataset.tab), x === b); });
      if (b.dataset.tab === "edit" && editor) editor.render();
    });
  });
  $("#site-pick").onchange = async function () { if (dirty) await saveNow(); open(this.value); };

  /* ---------------- Open a site ---------------- */
  function open(slug) {
    row = sites.filter(function (x) { return x.slug === slug; })[0];
    st = JSON.parse(JSON.stringify(row.data || {}));
    st.pages = (st.pages || []).map(function (p) {
      if (!Array.isArray(p.sections) || !p.sections.length) { var d = B.defaultSections(st, p, null); p.sections = d.sections; p.meta = p.meta || d.meta; }
      return p;
    });
    $("#site-name").textContent = st.business || row.business;
    $("#site-pick").value = slug;
    var live = row.live_url || st.liveUrl;
    $("#view-live").href = live || "#"; show($("#view-live"), !!live);
    show($("#store-tab"), !!(st.features && st.features.store));
    show($("#dash"), true);
    $("#page-pick").innerHTML = st.pages.map(function (p) { return '<option value="' + p.id + '">' + esc(p.title) + "</option>"; }).join("");
    page = st.pages[0];
    editor = window.PSEditor.mount($("#editor"), {
      site: function () { return st; }, page: function () { return page; }, onChange: markDirty, upload: upload,
      previewOpts: function () { return { products: products }; },
      onNavigate: function (file) {
        var out = B.generate(st, null, { editor: true, inline: true });
        var hit = out.pages.filter(function (p) { return p.file === file; })[0];
        if (hit) { page = st.pages.filter(function (p) { return p.id === hit.id; })[0]; $("#page-pick").value = page.id; editor.refresh(); }
      }
    });
    editor.refresh();
    buildInfo();
    if (st.features && st.features.store) {
      store = window.PSStore.mount($("#store"), {
        sb: sb, slug: slug, site: function () { return st; }, upload: upload,
        saveStore: async function (cfg) { st.store = cfg; markDirty(); return await saveNow(); },
        onProducts: function (list) { products = list; }
      });
    }
    setState();
  }
  $("#page-pick").onchange = function () { var id = this.value; page = st.pages.filter(function (p) { return p.id === id; })[0]; editor.refresh(); };

  /* ---------------- Business info + look ---------------- */
  function field(key, label, kind, hint) {
    var v = st[key] == null ? "" : st[key];
    var inp = kind === "area" ? '<textarea rows="4" data-key="' + key + '">' + esc(v) + "</textarea>" : '<input data-key="' + key + '" value="' + esc(v) + '">';
    return '<div class="' + (kind === "area" ? "full" : "") + '"><label>' + label + "</label>" + inp + (hint ? '<div class="hint">' + hint + "</div>" : "") + "</div>";
  }
  function buildInfo() {
    var F = st.features || {};
    $("#info-form").innerHTML = field("business", "Business name") + field("tagline", "Tagline") + field("phone", "Phone") + field("email", "Email") +
      field("address", "Address") + (F.booking ? field("bookingUrl", "Booking link") : "<div></div>") +
      field("hoursText", "Hours (one per line)", "area") + field("servicesText", "Services (one per line: Name | Price | Short description)", "area") +
      field("about", "About the business", "area") + field("instagram", "Instagram") + field("facebook", "Facebook") + field("tiktok", "TikTok") +
      (F.reviews ? field("reviewsText", "Featured Google reviews (Name | Stars | Review)", "area") : "") +
      (F.assistant ? field("assistantGreeting", "Chat assistant: first message") + "<div></div>" + field("assistantExtra", "Chat assistant: extra answers (one per line)", "area", "Example: Do you take walk-ins? Only on Saturdays.") : "");
    var S = B.STYLES, c = st.colors || {};
    $("#look-form").innerHTML = '<div><label>Style</label><select data-key="style" style="width:100%">' + Object.keys(S).map(function (k) { return '<option value="' + k + '"' + (st.style === k ? " selected" : "") + ">" + S[k].label + "</option>"; }).join("") + "</select></div>" +
      '<div><label>Colors</label><div style="display:flex;gap:10px;flex-wrap:wrap">' + [["primary", "Buttons"], ["accent", "Accent"], ["bg", "Background"], ["ink", "Text"]].map(function (x) {
        return '<label style="display:flex;gap:6px;align-items:center;margin:0;font-size:.85rem"><input type="color" data-color="' + x[0] + '" value="' + esc(c[x[0]] || "#000000") + '" style="width:42px;height:34px;padding:2px"> ' + x[1] + "</label>";
      }).join("") + "</div></div>" +
      '<div><label>Logo</label><div style="display:flex;gap:6px"><input data-key="logoUrl" value="' + esc(st.logoUrl || "") + '"><button class="btn btn-ghost" type="button" data-upload="logoUrl" style="padding:6px 12px">Upload</button></div></div>' +
      '<div><label>Homepage photo</label><div style="display:flex;gap:6px"><input data-key="heroUrl" value="' + esc(st.heroUrl || "") + '"><button class="btn btn-ghost" type="button" data-upload="heroUrl" style="padding:6px 12px">Upload</button></div></div>' +
      '<div class="full"><label>Gallery photos (one link per line)</label><textarea rows="4" data-key="galleryText">' + esc(st.galleryText || "") + '</textarea><button class="btn btn-ghost" type="button" data-upload="galleryText" style="padding:6px 12px;margin-top:6px">Upload photos</button></div>';
    $$("[data-key]").forEach(function (inp) { inp.addEventListener("input", function () { st[inp.dataset.key] = inp.value; if (inp.dataset.key === "business") $("#site-name").textContent = inp.value; markDirty(); }); inp.addEventListener("change", function () { st[inp.dataset.key] = inp.value; markDirty(); }); });
    $$("[data-color]").forEach(function (inp) { inp.addEventListener("input", function () { st.colors = st.colors || {}; st.colors[inp.dataset.color] = inp.value; markDirty(); }); });
    $$("[data-upload]").forEach(function (b) {
      b.onclick = function () {
        var key = b.dataset.upload, f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.multiple = key === "galleryText";
        f.onchange = async function () {
          var urls = [];
          for (var i = 0; i < f.files.length; i++) { var u = await upload(f.files[i]); if (u) urls.push(u); }
          if (!urls.length) return;
          st[key] = key === "galleryText" ? ((st.galleryText || "").trim() ? st.galleryText.trim() + "\n" : "") + urls.join("\n") : urls[0];
          q('[data-key="' + key + '"]').value = st[key]; markDirty();
        };
        f.click();
      };
    });
  }
  function q(s) { return document.querySelector(s); }

  /* ---------------- Save / publish ---------------- */
  async function upload(file) {
    var path = "builder/" + row.slug + "/" + Date.now() + "-" + file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    var up = await sb.storage.from("site-images").upload(path, file, { contentType: file.type });
    if (up.error) { alert("Upload failed: " + up.error.message); return ""; }
    return sb.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  }
  function setState(text) {
    $("#save-state").innerHTML = '<span class="dot' + (dirty || unpublished ? " dirty" : "") + '"></span>' + esc(text || (dirty ? "Saving…" : unpublished ? "Saved · not published yet" : "All changes saved"));
  }
  function markDirty() { dirty = true; unpublished = true; setState(); clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 1500); }
  async function api(action, payload) {
    var r = await sb.functions.invoke("client-api", { body: Object.assign({ action: action, site: row.slug }, payload || {}) });
    if (r.error) return { error: "Couldn’t reach the server. Check your connection and try again." };
    return r.data || {};
  }
  async function saveNow() {
    clearTimeout(saveTimer); if (!dirty) return true;
    var r = await api("save", { data: st, assistantInfo: B.assistantInfo(st) });
    if (r.error) { setState("Not saved: " + r.error); return false; }
    dirty = false; row.data = JSON.parse(JSON.stringify(st)); setState(); return true;
  }
  $("#publish").onclick = async function () {
    var btn = this; btn.disabled = true; say("#pub-msg", "Publishing…");
    if (!(await saveNow())) { btn.disabled = false; return say("#pub-msg", "Couldn’t save your changes first.", "err"); }
    var domain = st.domain ? "https://" + String(st.domain).replace(/^https?:\/\//, "").replace(/\/.*$/, "") + "/" : "";
    var out = B.generate(st, null, {
      baseUrl: domain || row.live_url || "",
      assistant: row.assistant_on ? { endpoint: SUPA + "/functions/v1/site-assistant", key: C.supabaseAnonKey } : null,
      store: { api: SUPA + "/functions/v1/store", rest: SUPA + "/rest/v1", key: C.supabaseAnonKey }
    });
    var r = await api("publish", { files: out.files });
    btn.disabled = false;
    if (r.error) return say("#pub-msg", r.error, "err");
    unpublished = false; setState();
    say("#pub-msg", "Published! Your changes go live in about a minute.", "ok");
    if (r.liveUrl) { $("#view-live").href = r.liveUrl; show($("#view-live"), true); }
  };

  enter();
})();
