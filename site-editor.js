/* =========================================================
   PROJECT SARAE — VISUAL PAGE EDITOR
   Used by the Site Builder (admin) and the client dashboard.
   Click text on the page to edit it, drag sections to reorder,
   add / duplicate / delete sections, swap photos, undo.
   ========================================================= */
(function () {
  "use strict";
  var B = window.PSBuilder;
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var ADMIN_CSS =
    ".pe{display:grid;grid-template-columns:230px minmax(0,1fr) 300px;gap:14px;align-items:start}" +
    "@media(max-width:1100px){.pe{grid-template-columns:200px minmax(0,1fr)}.pe-set{grid-column:1/-1}}@media(max-width:720px){.pe{grid-template-columns:1fr}}" +
    ".pe-box{background:var(--canvas,#fff);border:1px solid var(--line,#e5e5e5);border-radius:14px;padding:12px}" +
    ".pe-box h4{margin:0 0 8px;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted-2,#777)}" +
    ".pe-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}.pe-list li{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line,#e5e5e5);border-radius:10px;background:#fff;cursor:pointer;font-size:.88rem;font-weight:600}" +
    ".pe-list li.on{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.2)}.pe-list li.drag{opacity:.4}.pe-list li.over{border-top:3px solid #3b82f6}.pe-list .grip{cursor:grab;color:#999;user-select:none}.pe-list small{display:block;font-weight:400;color:#888;font-size:.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}" +
    ".pe-add{display:flex;gap:6px;margin-top:10px}.pe-add select{flex:1;min-width:0;width:auto;padding:7px}.pe-add .btn,.pe-tools .btn{padding:7px 12px;font-size:.82rem}" +
    ".pe-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.pe-tools .grow{flex:1}" +
    ".pe-frame-wrap{background:#e9e9ee;border-radius:14px;padding:10px;overflow:hidden}.pe-stage{position:relative;margin:0 auto;height:78vh;min-height:560px}.pe-frame{position:absolute;top:0;left:0;border:0;background:#fff;border-radius:8px;transform-origin:0 0}" +
    ".pe-set label{display:block;font-size:.8rem;font-weight:700;margin:10px 0 4px}.pe-set input,.pe-set textarea{width:100%;font:inherit;font-size:.88rem;padding:8px 10px}.pe-set .row{display:flex;gap:6px;align-items:center}" +
    ".pe-item{border:1px solid var(--line,#e5e5e5);border-radius:10px;padding:8px;margin-top:6px;background:#fff}.pe-item .row{justify-content:flex-end;margin-top:4px}.pe-item button,.pe-mini{background:#fff;border:1px solid #ddd;border-radius:8px;padding:4px 9px;cursor:pointer;font-size:.78rem}" +
    ".pe-hint{font-size:.78rem;color:#888;margin-top:8px}";

  var FRAME_CSS =
    ".reveal{opacity:1!important;transform:none!important}[data-sec]{position:relative;outline:2px dashed transparent;outline-offset:-3px;transition:outline-color .15s}" +
    "[data-sec]:hover{outline-color:rgba(59,130,246,.55)}[data-sec].ed-sel{outline:3px solid #3b82f6}" +
    "[data-edit]{cursor:text;border-radius:4px;min-width:1em}[data-edit]:hover{box-shadow:0 0 0 2px rgba(59,130,246,.35)}[data-edit]:focus{outline:2px solid #3b82f6;outline-offset:2px}" +
    "[data-edit]:empty::before{content:'Click to type…';opacity:.45}[data-multi] p:empty::before{content:'Click to type…';opacity:.45}" +
    ".ed-bar{position:absolute;top:10px;right:10px;z-index:45;display:none;gap:2px;background:#111827;border-radius:10px;padding:4px;box-shadow:0 6px 20px rgba(0,0,0,.3)}" +
    "[data-sec]:hover>.ed-bar,[data-sec].ed-sel>.ed-bar{display:flex}.ed-bar button{background:none;border:0;color:#fff;font:600 12px system-ui,sans-serif;padding:6px 9px;border-radius:7px;cursor:pointer;text-transform:none;letter-spacing:0}.ed-bar button:hover{background:#374151}" +
    ".ed-tag{position:absolute;top:10px;left:10px;z-index:45;background:#3b82f6;color:#fff;font:600 11px system-ui,sans-serif;padding:4px 9px;border-radius:7px;display:none;text-transform:none;letter-spacing:0}[data-sec]:hover>.ed-tag,[data-sec].ed-sel>.ed-tag{display:block}" +
    ".it-img[data-img]{cursor:pointer;position:relative}.it-img[data-img]:hover::after{content:'Change photo';position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45);color:#fff;font:700 14px system-ui;border-radius:12px}" +
    ".hdr a,.ftr a,.btn{cursor:pointer}";

  function getPath(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, val) {
    var ks = path.split("."), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
  }

  /* opts: { site(), page(), onChange(), upload(file)->url, previewOpts(), onNavigate(file), readOnlyTypes? } */
  function mount(host, opts) {
    if (!q("#pe-style")) { var s = document.createElement("style"); s.id = "pe-style"; s.textContent = ADMIN_CSS; document.head.appendChild(s); }
    host.innerHTML =
      '<div class="pe-tools"><b class="grow" data-pe="title"></b>' +
      '<button class="btn btn-ghost" type="button" data-pe="undo" disabled>↶ Undo</button>' +
      '<select data-pe="size" style="width:auto;padding:7px"><option value="100%">🖥 Desktop</option><option value="768px">Tablet</option><option value="390px">📱 Phone</option></select></div>' +
      '<div class="pe"><div class="pe-box"><h4>Sections</h4><ul class="pe-list" data-pe="list"></ul>' +
      '<div class="pe-add"><select data-pe="type"></select><button class="btn btn-primary" type="button" data-pe="add">Add</button></div>' +
      '<p class="pe-hint">Drag ⋮⋮ to reorder. Click text on the page to edit it.</p></div>' +
      '<div class="pe-frame-wrap" data-pe="wrap"><div class="pe-stage" data-pe="stage"><iframe class="pe-frame" data-pe="frame" title="Page editor"></iframe></div></div>' +
      '<div class="pe-box pe-set" data-pe="set"></div></div>';
    var $ = function (k) { return q('[data-pe="' + k + '"]', host); };
    var sel = null, history = [], frameScroll = 0, renderTimer = null;

    $("type").innerHTML = Object.keys(B.SECTIONS).filter(function (k) { return k !== "hero" && k !== "header"; })
      .map(function (k) { return '<option value="' + k + '">' + B.SECTIONS[k].label + "</option>"; }).join("");

    function page() { return opts.page(); }
    function secs() { var p = page(); return p ? p.sections : []; }
    function snapshot() { history.push(JSON.stringify(secs())); if (history.length > 40) history.shift(); $("undo").disabled = false; }
    function changed(structural) { opts.onChange && opts.onChange(); if (structural) { renderList(); renderPreview(); } }
    function find(id) { return secs().filter(function (s) { return s.id === id; })[0]; }
    function idx(id) { return secs().findIndex(function (s) { return s.id === id; }); }
    function summary(s) { return s.title || s.heading || s.eyebrow || (s.items && s.items[0] && (s.items[0].title || s.items[0].q)) || ""; }

    /* ---------- Section list ---------- */
    function renderList() {
      var list = $("list"), dragId = null;
      list.innerHTML = secs().map(function (s) {
        var fixed = s.type === "hero" || s.type === "header";
        return '<li data-id="' + s.id + '"' + (fixed ? "" : ' draggable="true"') + (s.id === sel ? ' class="on"' : "") + '><span class="grip">' + (fixed ? "★" : "⋮⋮") + "</span><span>" +
          esc((B.SECTIONS[s.type] || {}).label || s.type) + "<small>" + esc(summary(s)) + "</small></span></li>";
      }).join("");
      qa("li", list).forEach(function (li) {
        li.onclick = function () { select(li.dataset.id, true); };
        li.addEventListener("dragstart", function (e) { dragId = li.dataset.id; li.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", dragId); } catch (x) {} });
        li.addEventListener("dragend", function () { li.classList.remove("drag"); qa("li", list).forEach(function (x) { x.classList.remove("over"); }); });
        li.addEventListener("dragover", function (e) { if (!dragId || idx(li.dataset.id) === 0) return; e.preventDefault(); qa("li", list).forEach(function (x) { x.classList.toggle("over", x === li); }); });
        li.addEventListener("drop", function (e) {
          e.preventDefault(); if (!dragId || dragId === li.dataset.id) return;
          snapshot(); var a = secs(), from = idx(dragId), item = a.splice(from, 1)[0], to = idx(li.dataset.id);
          a.splice(Math.max(1, to), 0, item); dragId = null; changed(true);
        });
      });
    }

    /* ---------- Settings panel ---------- */
    function renderSettings() {
      var box = $("set"), s = sel && find(sel), p = page();
      if (!s) {
        box.innerHTML = "<h4>Page settings</h4>" + (p ? '<label>Google description (SEO, under 155 characters)</label><textarea rows="3" maxlength="160" data-meta>' + esc(p.meta || "") + "</textarea>" : "") +
          '<p class="pe-hint">Click a section on the page (or in the list) to see its settings here.</p>';
        var m = q("[data-meta]", box); if (m) m.oninput = function () { p.meta = m.value; opts.onChange && opts.onChange(); };
        return;
      }
      var def = B.SECTIONS[s.type] || { fields: [] }, fixed = s.type === "hero" || s.type === "header";
      var h = "<h4>" + esc(def.label) + "</h4>";
      def.fields.forEach(function (f) {
        var key = f[0], label = f[1], kind = f[2] || "text", v = s[key];
        if (kind === "area") h += "<label>" + label + '</label><textarea rows="4" data-f="' + key + '">' + esc(v || "") + "</textarea>";
        else if (kind === "check") h += '<label class="row" style="font-weight:600"><input type="checkbox" style="width:auto" data-f="' + key + '" data-k="check"' + (v ? " checked" : "") + "> " + label + "</label>";
        else if (kind === "number") h += "<label>" + label + '</label><input type="number" min="0" max="99" data-f="' + key + '" data-k="number" value="' + esc(v || 0) + '">';
        else if (kind === "image") h += "<label>" + label + '</label><div class="row"><input data-f="' + key + '" value="' + esc(v || "") + '" placeholder="https://…"><button class="pe-mini" type="button" data-up="' + key + '">Upload</button></div>' +
          (s.type === "hero" ? '<div class="pe-hint">Blank = the homepage photo from Look &amp; photos.</div>' : "");
        else if (kind === "lines") h += "<label>" + label + '</label><textarea rows="5" data-f="' + key + '" data-k="lines">' + esc((v || []).join("\n")) + "</textarea>";
        else if (kind.indexOf("items:") === 0) {
          var keys = kind.slice(6).split(",");
          h += "<label>" + label + "</label>" + (v || []).map(function (it, i) {
            return '<div class="pe-item">' + keys.map(function (k) {
              var big = k === "text" || k === "a";
              return big ? '<textarea rows="2" placeholder="' + (k === "a" ? "Answer" : "Text") + '" data-it="' + key + "." + i + "." + k + '">' + esc(it[k] || "") + "</textarea>"
                : '<input placeholder="' + (k === "q" ? "Question" : "Title") + '" data-it="' + key + "." + i + "." + k + '" value="' + esc(it[k] || "") + '" style="margin-bottom:4px">';
            }).join("") + '<div class="row"><button type="button" data-iu="' + i + '">↑</button><button type="button" data-ix="' + i + '">Remove</button></div></div>';
          }).join("") + '<button class="pe-mini" type="button" data-ia="' + key + '" style="margin-top:8px">+ Add</button>';
        }
        else h += "<label>" + label + '</label><input data-f="' + key + '" value="' + esc(v || "") + '">';
      });
      if (!def.fields.length) h += '<p class="pe-hint">This section fills itself in from the client details and features.</p>';
      if (["services", "reviews", "gallery", "contact", "booking", "lead", "products", "payments", "members"].indexOf(s.type) > -1) h += '<p class="pe-hint">Its content comes from the site details (services, photos, features). Edit those to change it.</p>';
      if (!fixed) h += '<div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="pe-mini" type="button" data-act="up">Move up</button><button class="pe-mini" type="button" data-act="down">Move down</button><button class="pe-mini" type="button" data-act="dup">Duplicate</button><button class="pe-mini" type="button" data-act="del" style="color:#b3261e">Delete</button></div>';
      box.innerHTML = h;

      qa("[data-f]", box).forEach(function (inp) {
        var once = false;
        inp.addEventListener(inp.type === "checkbox" ? "change" : "input", function () {
          if (!once) { snapshot(); once = true; }
          var k = inp.dataset.k, val = k === "check" ? inp.checked : k === "number" ? Math.max(0, parseInt(inp.value, 10) || 0) : k === "lines" ? inp.value.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean) : inp.value;
          s[inp.dataset.f] = val; opts.onChange && opts.onChange(); renderSoon(); if (inp.dataset.f === "heading" || inp.dataset.f === "title") renderList();
        });
      });
      qa("[data-it]", box).forEach(function (inp) {
        var once = false;
        inp.addEventListener("input", function () { if (!once) { snapshot(); once = true; } setPath(s, inp.dataset.it, inp.value); opts.onChange && opts.onChange(); renderSoon(); });
      });
      qa("[data-ia]", box).forEach(function (b) { b.onclick = function () { snapshot(); var arr = s[b.dataset.ia] = s[b.dataset.ia] || []; arr.push(s.type === "faq" ? { q: "New question?", a: "Answer." } : { title: "New item", text: "" }); changed(true); renderSettings(); }; });
      qa("[data-ix]", box).forEach(function (b) { b.onclick = function () { snapshot(); s.items.splice(+b.dataset.ix, 1); changed(true); renderSettings(); }; });
      qa("[data-iu]", box).forEach(function (b) { b.onclick = function () { var i = +b.dataset.iu; if (!i) return; snapshot(); s.items.splice(i - 1, 0, s.items.splice(i, 1)[0]); changed(true); renderSettings(); }; });
      qa("[data-up]", box).forEach(function (b) { b.onclick = function () { pickImage(s, b.dataset.up); }; });
      qa("[data-act]", box).forEach(function (b) { b.onclick = function () { act(b.dataset.act, s.id); }; });
    }

    function act(a, id) {
      var arr = secs(), i = idx(id); if (i < 0) return;
      if ((arr[i].type === "hero" || arr[i].type === "header") && a !== "settings") return;
      if (a === "settings") { select(id, false); return; }
      snapshot();
      if (a === "up" && i > 1) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
      if (a === "down" && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
      if (a === "dup") { var c = B.clone(arr[i]); c.id = "s" + Math.random().toString(36).slice(2, 9); arr.splice(i + 1, 0, c); sel = c.id; }
      if (a === "del") { if (!confirm("Delete this section?")) { history.pop(); return; } arr.splice(i, 1); sel = null; }
      changed(true); renderSettings();
    }
    function pickImage(s, key) {
      var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
      inp.onchange = async function () {
        if (!inp.files[0]) return;
        var url = await opts.upload(inp.files[0]); if (!url) return;
        snapshot(); s[key] = url; changed(true); renderSettings();
      };
      inp.click();
    }
    function select(id, scroll) {
      sel = id; renderList(); renderSettings();
      var d = doc(); if (!d) return;
      qa("[data-sec]", d).forEach(function (x) { x.classList.toggle("ed-sel", x.dataset.sec === id); });
      if (scroll) { var el = q('[data-sec="' + id + '"]', d); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }

    /* ---------- Preview + inline editing ---------- */
    function doc() { try { return $("frame").contentDocument; } catch (e) { return null; } }
    function renderSoon() { clearTimeout(renderTimer); renderTimer = setTimeout(renderPreview, 350); }
    function renderPreview() {
      var p = page(), st = opts.site(); if (!p || !st) return;
      $("title").textContent = "Editing: " + p.title;
      var d = doc(); if (d && d.defaultView) frameScroll = d.defaultView.scrollY;
      var out = B.generate(st, null, Object.assign({ editor: true, inline: true, editorCss: FRAME_CSS }, opts.previewOpts ? opts.previewOpts() : {}));
      var pp = out.pages.filter(function (x) { return x.id === p.id; })[0];
      var html = pp && out.files[pp.file];
      var fr = $("frame");
      fit();
      fr.onload = wire;
      fr.srcdoc = html || "<p style='font-family:sans-serif;padding:30px'>Nothing to show yet.</p>";
    }
    function wire() {
      var d = doc(); if (!d) return;
      if (frameScroll) d.defaultView.scrollTo(0, frameScroll);
      qa("[data-sec]", d).forEach(function (el) {
        var s = find(el.dataset.sec); if (!s) return;
        var fixed = s.type === "hero" || s.type === "header";
        var tag = d.createElement("div"); tag.className = "ed-tag"; tag.textContent = (B.SECTIONS[s.type] || {}).label || s.type; el.appendChild(tag);
        var bar = d.createElement("div"); bar.className = "ed-bar";
        var btns = [["settings", "⚙ Settings"]];
        if (s.type === "hero") btns.push(["photo", "🖼 Photo"]);
        if (!fixed) btns.push(["up", "↑"], ["down", "↓"], ["dup", "⧉"], ["del", "✕"]);
        btns.forEach(function (b) {
          var x = d.createElement("button"); x.type = "button"; x.textContent = b[1]; x.title = { settings: "Settings", photo: "Change photo", up: "Move up", down: "Move down", dup: "Duplicate", del: "Delete" }[b[0]];
          x.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (b[0] === "photo") pickImage(s, "image"); else act(b[0], s.id); };
          bar.appendChild(x);
        });
        el.appendChild(bar);
        if (el.dataset.sec === sel) el.classList.add("ed-sel");
        el.addEventListener("click", function () { if (sel !== s.id) { sel = s.id; qa("[data-sec]", d).forEach(function (x) { x.classList.toggle("ed-sel", x === el); }); renderList(); renderSettings(); } });
      });
      qa(".it-img[data-img]", d).forEach(function (el) {
        el.addEventListener("click", function (e) { var sec = el.closest("[data-sec]"); var s = sec && find(sec.dataset.sec); if (s) { e.stopPropagation(); sel = s.id; pickImage(s, "image"); } });
      });
      qa("[data-edit]", d).forEach(function (el) {
        el.setAttribute("contenteditable", "true"); el.setAttribute("spellcheck", "true");
        var multi = el.dataset.multi === "1", started = false;
        el.addEventListener("click", function (e) { e.preventDefault(); });
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !multi) { e.preventDefault(); el.blur(); }
          if (e.key === " " && el.tagName === "SUMMARY") { e.preventDefault(); d.execCommand("insertText", false, " "); }
        });
        el.addEventListener("paste", function (e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text/plain"); d.execCommand("insertText", false, multi ? t : t.replace(/\s*\n\s*/g, " ")); });
        el.addEventListener("input", function () {
          var secEl = el.closest("[data-sec]"), s = secEl && find(secEl.dataset.sec); if (!s) return;
          if (!started) { snapshot(); started = true; }
          var val = multi ? el.innerText.replace(/\r/g, "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).join("\n\n") : el.textContent.replace(/\s+/g, " ").trim();
          setPath(s, el.dataset.edit, val);
          opts.onChange && opts.onChange();
          if (s.id === sel) { var f = q('[data-f="' + el.dataset.edit + '"],[data-it="' + el.dataset.edit + '"]', $("set")); if (f && f !== document.activeElement) f.value = val; }
        });
        el.addEventListener("blur", function () { started = false; if (/heading|title/.test(el.dataset.edit)) renderList(); });
      });
      // Links: switch page in the editor instead of navigating.
      qa("a", d).forEach(function (a) {
        if (a.closest("[data-edit]")) return;
        a.addEventListener("click", function (e) {
          e.preventDefault(); var href = a.getAttribute("href") || "";
          if (/^[\w-]+\.html$/.test(href) && opts.onNavigate) opts.onNavigate(href);
        });
      });
      qa("form", d).forEach(function (f) { f.addEventListener("submit", function (e) { e.preventDefault(); }); });
    }

    /* Show the page at its real width (desktop 1280px / tablet 768px / phone 390px), scaled to fit. */
    function fit() {
      var want = { "100%": 1280, "768px": 768, "390px": 390 }[$("size").value] || 1280;
      var room = Math.max(300, $("wrap").clientWidth - 20), scale = Math.min(1, room / want), fr = $("frame"), stage = $("stage");
      var h = stage.clientHeight || 640;
      stage.style.width = Math.round(want * scale) + "px";
      fr.style.width = want + "px"; fr.style.height = Math.round(h / scale) + "px"; fr.style.transform = "scale(" + scale + ")";
    }
    window.addEventListener("resize", fit);

    /* ---------- Toolbar ---------- */
    $("size").onchange = fit;
    $("undo").onclick = function () {
      var prev = history.pop(); if (!prev) return;
      var p = page(); p.sections = JSON.parse(prev); $("undo").disabled = !history.length;
      if (sel && !find(sel)) sel = null; changed(true); renderSettings();
    };
    $("add").onclick = function () {
      var type = $("type").value; snapshot();
      var s = B.newSection(type), arr = secs(), i = sel ? idx(sel) : arr.length - 1;
      arr.splice(Math.max(1, i + 1), 0, s); sel = s.id; changed(true); renderSettings();
      setTimeout(function () { select(s.id, true); }, 250);
    };

    function refresh() { sel = null; history = []; $("undo").disabled = true; frameScroll = 0; renderList(); renderSettings(); renderPreview(); }
    return { refresh: refresh, render: renderPreview };
  }

  window.PSEditor = { mount: mount };
})();
