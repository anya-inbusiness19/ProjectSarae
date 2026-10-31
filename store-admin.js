/* =========================================================
   PROJECT SARAE — STORE DASHBOARD
   Products (photos, prices, inventory), orders, Stripe + shipping
   settings for one client site. Used by the Site Builder (admin)
   and the client dashboard.
   ========================================================= */
(function () {
  "use strict";
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(c) { return "$" + ((c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function toCents(v) { var n = parseFloat(String(v || "").replace(/[$,\s]/g, "")); return isNaN(n) ? null : Math.round(n * 100); }

  var CSS = ".sa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0}@media(max-width:800px){.sa-grid{grid-template-columns:repeat(2,1fr)}}" +
    ".sa-kpi{background:var(--canvas,#fff);border:1px solid var(--line,#e5e5e5);border-radius:14px;padding:14px}.sa-kpi b{display:block;font-size:1.5rem}.sa-kpi span{font-size:.78rem;color:var(--muted-2,#777);font-weight:700}" +
    ".sa-prod{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line,#eee)}.sa-prod img,.sa-prod .ph{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f1f1f4}" +
    ".sa-prod .actions,.sa-ord .actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;align-items:center}.sa-prod .btn,.sa-ord .btn{padding:6px 11px;font-size:.8rem}.sa-prod small,.sa-ord small{display:block;color:var(--muted-2,#777)}" +
    ".sa-ord{display:grid;grid-template-columns:1fr auto;gap:12px;padding:12px 0;border-bottom:1px solid var(--line,#eee)}.sa-ord ul{margin:4px 0 0;padding-left:18px;font-size:.88rem}.sa-off{opacity:.55}" +
    ".sa-form{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.sa-form .full{grid-column:1/-1}@media(max-width:640px){.sa-form{grid-template-columns:1fr}}";

  /* opts: { sb, slug, site() -> site data object, saveStore(cfg) -> Promise, upload(file) -> url, intro? } */
  function mount(host, opts) {
    if (!q("#sa-style")) { var s = document.createElement("style"); s.id = "sa-style"; s.textContent = CSS; document.head.appendChild(s); }
    var sb = opts.sb, slug = opts.slug, products = [], orders = [], editing = null;
    host.innerHTML =
      '<div class="sa-grid"><div class="sa-kpi"><b data-k="rev">$0</b><span>Sales (30 days)</span></div><div class="sa-kpi"><b data-k="ord">0</b><span>Orders (30 days)</span></div>' +
      '<div class="sa-kpi"><b data-k="todo">0</b><span>To ship / fill</span></div><div class="sa-kpi"><b data-k="prods">0</b><span>Products live</span></div></div>' +

      '<div class="card"><h3>Payments &amp; shipping</h3><p class="muted" data-k="stripe">Checking Stripe…</p>' +
      '<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:700">Connect or change Stripe</summary>' +
      '<p class="hint" style="margin-top:8px">Money goes straight to the business’s own Stripe account. In <b>their</b> Stripe: Developers → API keys → <b>Create restricted key</b> → set <b>Checkout Sessions</b> to <b>Write</b> (everything else None) → copy the key (rk_live_…). Use an rk_test_ key to try it first.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><input data-k="key" placeholder="rk_live_…" autocomplete="off" style="flex:1;min-width:220px"><button class="btn btn-primary" type="button" data-k="savekey">Save key</button><button class="btn btn-ghost" type="button" data-k="rmkey">Remove</button></div>' +
      '<div class="msg" data-k="keymsg"></div></details>' +
      '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:end;margin-top:14px"><label style="display:flex;gap:8px;align-items:center;margin:0;font-weight:700"><input type="checkbox" data-k="ship" style="width:auto"> Ship orders (ask for an address)</label>' +
      '<div><label style="margin:0 0 4px">Flat shipping</label><input data-k="shipamt" placeholder="$6.95" style="width:120px"></div>' +
      '<div><label style="margin:0 0 4px">Free shipping over</label><input data-k="freeover" placeholder="$75 (blank = never)" style="width:170px"></div>' +
      '<button class="btn btn-ghost" type="button" data-k="saveship">Save shipping</button><div class="msg" data-k="shipmsg" style="margin:0"></div></div></div>' +

      '<div class="card" style="margin-top:18px"><div class="top"><h3 style="margin:0">Products</h3><button class="btn btn-primary" type="button" data-k="new">+ Add product</button></div>' +
      '<form data-k="form" class="hidden" style="margin-top:12px;border:1px solid var(--line,#e5e5e5);border-radius:14px;padding:14px"><div class="sa-form">' +
      '<div><label>Name</label><input data-f="name" maxlength="120" required></div><div><label>Price</label><input data-f="price" placeholder="24.00" required></div>' +
      '<div class="full"><label>Description (optional)</label><textarea data-f="description" rows="2" maxlength="600"></textarea></div>' +
      '<div><label>In stock (blank = unlimited)</label><input data-f="inventory" type="number" min="0"></div>' +
      '<div><label>Photo</label><div style="display:flex;gap:6px"><input data-f="image_url" placeholder="https://…"><input type="file" accept="image/*" data-f="file" style="max-width:120px"></div></div>' +
      '<div class="full" style="display:flex;gap:8px;align-items:center;margin-top:12px"><label style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" data-f="active" style="width:auto" checked> Show on the website</label><span style="flex:1"></span>' +
      '<button class="btn btn-ghost" type="button" data-k="cancel">Cancel</button><button class="btn btn-primary" type="submit">Save product</button></div></div><div class="msg" data-k="pmsg"></div></form>' +
      '<div data-k="plist" style="margin-top:8px"></div></div>' +

      '<div class="card" style="margin-top:18px"><div class="top"><h3 style="margin:0">Orders</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<select data-k="ofilter"><option value="">All orders</option><option value="paid">To ship / fill</option><option value="fulfilled">Fulfilled</option><option value="refunded">Refunded</option><option value="canceled">Canceled</option></select>' +
      '<button class="btn btn-ghost" type="button" data-k="sync">Sync from Stripe</button><button class="btn btn-ghost" type="button" data-k="csv">Download CSV</button></div></div>' +
      '<div class="msg" data-k="omsg"></div><div data-k="olist" style="margin-top:8px"></div></div>';
    var $ = function (k) { return q('[data-k="' + k + '"]', host); };
    var F = function (k) { return q('[data-f="' + k + '"]', host); };
    function say(k, t, kind) { var m = $(k); m.className = "msg" + (kind ? " " + kind : ""); m.textContent = t || ""; }

    async function storeApi(action, extra) {
      var r = await sb.functions.invoke("store", { body: Object.assign({ action: action, site: slug }, extra || {}) });
      if (r.error) return { error: "The store function isn’t set up yet (SETUP-BUILDER.md)." };
      return r.data || {};
    }

    /* ---------- Stripe + shipping ---------- */
    async function keyStatus() {
      var r = await storeApi("key_status");
      $("stripe").innerHTML = r.error ? esc(r.error) : r.connected
        ? '<span class="status a">Stripe connected</span> ' + (r.mode === "test" ? '<span class="status p">test mode: no real charges</span>' : "Live payments are on.")
        : '<span class="status p">Stripe not connected</span> Shoppers can browse, but checkout stays off until a key is saved.';
    }
    $("savekey").onclick = async function () {
      var k = $("key").value.trim(); if (!k) return say("keymsg", "Paste a key first.", "err");
      say("keymsg", "Checking with Stripe…"); var r = await storeApi("set_key", { key: k });
      if (r.error) return say("keymsg", r.error, "err");
      $("key").value = ""; say("keymsg", "Saved. " + (r.mode === "test" ? "Test mode: use card 4242 4242 4242 4242." : "Live checkout is on."), "ok"); keyStatus();
    };
    $("rmkey").onclick = async function () { if (!confirm("Remove the Stripe key? Checkout turns off until a new one is saved.")) return; await storeApi("set_key", { key: "" }); say("keymsg", "Removed.", "ok"); keyStatus(); };
    function fillShip() {
      var c = (opts.site().store) || {};
      $("ship").checked = !!c.shipping; $("shipamt").value = c.shippingCents ? (c.shippingCents / 100).toFixed(2) : ""; $("freeover").value = c.freeOverCents ? (c.freeOverCents / 100).toFixed(2) : "";
    }
    $("saveship").onclick = async function () {
      var cfg = { shipping: $("ship").checked, shippingCents: toCents($("shipamt").value) || 0, freeOverCents: toCents($("freeover").value) || 0 };
      say("shipmsg", "Saving…"); var ok = await opts.saveStore(cfg); say("shipmsg", ok ? "Saved." : "Couldn’t save.", ok ? "ok" : "err");
    };

    /* ---------- Products ---------- */
    async function loadProducts() {
      var r = await sb.from("client_products").select("*").eq("site_slug", slug).order("sort", { ascending: true }).order("id", { ascending: true });
      if (r.error) { $("plist").innerHTML = '<p class="muted">Run supabase-builder-setup.sql first (SETUP-BUILDER.md, step 1).</p>'; return; }
      products = r.data || []; renderProducts(); kpis(); opts.onProducts && opts.onProducts(products);
    }
    function renderProducts() {
      var box = $("plist");
      if (!products.length) { box.innerHTML = '<p class="muted">No products yet. Click “Add product”.</p>'; return; }
      box.innerHTML = products.map(function (p, i) {
        var stock = p.inventory == null ? "Unlimited" : p.inventory === 0 ? '<b style="color:#b3261e">Sold out</b>' : p.inventory + " in stock";
        return '<div class="sa-prod' + (p.active ? "" : " sa-off") + '" data-id="' + p.id + '">' + (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="">' : '<div class="ph"></div>') +
          "<div><b>" + esc(p.name) + "</b> · " + money(p.price_cents) + "<small>" + stock + (p.active ? "" : " · hidden") + "</small></div>" +
          '<div class="actions">' + (i ? '<button class="btn btn-ghost" type="button" data-a="up">↑</button>' : "") +
          '<button class="btn btn-ghost" type="button" data-a="stock">Stock</button><button class="btn btn-ghost" type="button" data-a="edit">Edit</button>' +
          '<button class="btn btn-ghost" type="button" data-a="toggle">' + (p.active ? "Hide" : "Show") + '</button><button class="btn btn-danger" type="button" data-a="del">Delete</button></div></div>';
      }).join("");
      qa(".sa-prod", box).forEach(function (row) {
        var p = products.filter(function (x) { return x.id === +row.dataset.id; })[0];
        qa("[data-a]", row).forEach(function (b) {
          b.onclick = async function () {
            var a = b.dataset.a;
            if (a === "edit") return openForm(p);
            if (a === "toggle") await sb.from("client_products").update({ active: !p.active }).eq("id", p.id);
            if (a === "stock") { var v = prompt("How many in stock? (leave blank for unlimited)", p.inventory == null ? "" : p.inventory); if (v === null) return; v = v.trim(); await sb.from("client_products").update({ inventory: v === "" ? null : Math.max(0, parseInt(v, 10) || 0) }).eq("id", p.id); }
            if (a === "del") { if (!confirm("Delete “" + p.name + "”?")) return; await sb.from("client_products").delete().eq("id", p.id); }
            if (a === "up") {
              var i = products.indexOf(p); products.splice(i - 1, 0, products.splice(i, 1)[0]);
              await Promise.all(products.map(function (x, n) { return sb.from("client_products").update({ sort: n }).eq("id", x.id); }));
            }
            loadProducts();
          };
        });
      });
    }
    function openForm(p) {
      editing = p || null; $("form").classList.remove("hidden"); say("pmsg", "");
      F("name").value = p ? p.name : ""; F("price").value = p ? (p.price_cents / 100).toFixed(2) : ""; F("description").value = p ? p.description || "" : "";
      F("inventory").value = p && p.inventory != null ? p.inventory : ""; F("image_url").value = p ? p.image_url || "" : ""; F("active").checked = p ? p.active : true; F("file").value = "";
      F("name").focus();
    }
    $("new").onclick = function () { openForm(null); };
    $("cancel").onclick = function () { $("form").classList.add("hidden"); };
    F("file").onchange = async function () { if (!this.files[0]) return; say("pmsg", "Uploading photo…"); var u = await opts.upload(this.files[0]); if (u) { F("image_url").value = u; say("pmsg", "Photo added.", "ok"); } else say("pmsg", "Upload failed.", "err"); };
    $("form").onsubmit = async function (e) {
      e.preventDefault();
      var cents = toCents(F("price").value);
      if (!cents || cents < 50) return say("pmsg", "Price must be at least $0.50.", "err");
      var inv = F("inventory").value.trim();
      var row = { site_slug: slug, name: F("name").value.trim(), price_cents: cents, description: F("description").value.trim() || null,
        inventory: inv === "" ? null : Math.max(0, parseInt(inv, 10) || 0), image_url: F("image_url").value.trim() || null, active: F("active").checked };
      var r = editing ? await sb.from("client_products").update(row).eq("id", editing.id) : await sb.from("client_products").insert(Object.assign(row, { sort: products.length }));
      if (r.error) return say("pmsg", r.error.message, "err");
      $("form").classList.add("hidden"); loadProducts();
    };

    /* ---------- Orders ---------- */
    async function loadOrders() {
      var r = await sb.from("client_orders").select("*").eq("site_slug", slug).order("created_at", { ascending: false }).limit(500);
      if (r.error) return;
      orders = r.data || []; renderOrders(); kpis();
    }
    function renderOrders() {
      var f = $("ofilter").value, list = orders.filter(function (o) { return !f || o.status === f; }), box = $("olist");
      if (!list.length) { box.innerHTML = '<p class="muted">' + (orders.length ? "No orders here." : "No orders yet. Paid orders show up here automatically.") + "</p>"; return; }
      box.innerHTML = list.map(function (o) {
        var a = o.shipping && o.shipping.address, addr = a ? [o.shipping.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
        return '<div class="sa-ord" data-id="' + o.id + '"><div><b>' + esc(o.name || o.email || "Customer") + "</b> · " + money(o.total_cents) +
          "<small>" + new Date(o.created_at).toLocaleString() + (o.email ? " · " + esc(o.email) : "") + (o.phone ? " · " + esc(o.phone) : "") + "</small>" +
          "<ul>" + (o.items || []).map(function (it) { return "<li>" + esc(it.qty) + " × " + esc(it.name) + "</li>"; }).join("") + "</ul>" +
          (addr ? '<small style="margin-top:4px">Ship to: ' + esc(addr) + "</small>" : "") + "</div>" +
          '<div class="actions"><select data-s>' + ["paid", "fulfilled", "refunded", "canceled"].map(function (s) { return '<option value="' + s + '"' + (o.status === s ? " selected" : "") + ">" + ({ paid: "To fill", fulfilled: "Fulfilled", refunded: "Refunded", canceled: "Canceled" })[s] + "</option>"; }).join("") + "</select></div></div>";
      }).join("");
      qa(".sa-ord", box).forEach(function (row) {
        q("[data-s]", row).onchange = async function () {
          await sb.from("client_orders").update({ status: this.value }).eq("id", +row.dataset.id);
          var o = orders.filter(function (x) { return x.id === +row.dataset.id; })[0]; if (o) o.status = this.value; kpis();
        };
      });
    }
    $("ofilter").onchange = renderOrders;
    $("sync").onclick = async function () {
      say("omsg", "Checking Stripe for paid orders…"); var r = await storeApi("sync");
      if (r.error) return say("omsg", r.error, "err");
      say("omsg", r.added ? r.added + " order(s) added." : "Everything is up to date.", "ok"); loadOrders(); loadProducts();
    };
    $("csv").onclick = function () {
      var rows = [["Date", "Name", "Email", "Phone", "Items", "Total", "Status", "Ship to"]].concat(orders.map(function (o) {
        var a = o.shipping && o.shipping.address;
        return [new Date(o.created_at).toLocaleString(), o.name || "", o.email || "", o.phone || "", (o.items || []).map(function (i) { return i.qty + " x " + i.name; }).join("; "),
          (o.total_cents / 100).toFixed(2), o.status, a ? [a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(" ") : ""];
      }));
      var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
      var link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = slug + "-orders.csv"; link.click();
    };
    function kpis() {
      var since = Date.now() - 30 * 864e5, recent = orders.filter(function (o) { return new Date(o.created_at) >= since && (o.status === "paid" || o.status === "fulfilled"); });
      $("rev").textContent = money(recent.reduce(function (t, o) { return t + o.total_cents; }, 0));
      $("ord").textContent = recent.length;
      $("todo").textContent = orders.filter(function (o) { return o.status === "paid"; }).length;
      $("prods").textContent = products.filter(function (p) { return p.active; }).length;
    }

    fillShip(); keyStatus(); loadProducts(); loadOrders();
    return { reload: function () { fillShip(); keyStatus(); loadProducts(); loadOrders(); } };
  }

  window.PSStore = { mount: mount };
})();
