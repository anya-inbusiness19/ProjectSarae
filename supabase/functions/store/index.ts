// =========================================================
// PROJECT SARAE — CLIENT STORES (Supabase Edge Function, free)
// Runs checkout for every client shop you build. Each client uses
// THEIR OWN Stripe account (their key is saved in client_store_keys,
// which the browser can never read). Money goes straight to them.
//
// IMPORTANT: deploy with "Verify JWT" turned OFF (shoppers aren't logged in).
// The actions that need a login check it themselves.
//
// Actions:
//   checkout  (public)  cart → Stripe Checkout page
//   confirm   (public)  thank-you page records the paid order
//   sync      (owner)   pulls the last 30 days of paid orders from Stripe
//   set_key   (owner)   saves / removes the client's Stripe key
//   key_status(owner)   is a key saved? live or test?
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const env = (k: string, d = "") => (Deno.env.get(k) || d).trim();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

// ---------- Stripe ----------
function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}
async function stripe(key: string, method: "GET" | "POST", path: string, params: Record<string, unknown> = {}) {
  const body = form(params);
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && [...body].length ? "?" + body : ""}`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: method === "POST" ? body : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe error ${r.status}`);
  return data;
}

async function loadSite(slug: string) {
  const { data } = await db().from("client_sites").select("slug,business,data,live_url").eq("slug", slug).maybeSingle();
  return data;
}
async function loadKey(slug: string) {
  const { data } = await db().from("client_store_keys").select("stripe_secret").eq("site_slug", slug).maybeSingle();
  return data?.stripe_secret || "";
}

// Only the admin or a client who manages this site.
async function canManage(req: Request, slug: string) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return false;
  const a = await sb.rpc("is_admin");
  if (a.data === true) return true;
  const m = await sb.rpc("is_site_member", { p_slug: slug });
  return m.data === true;
}

// ---------- Orders ----------
async function recordSession(slug: string, key: string, sessionId: string) {
  const s = await stripe(key, "GET", `checkout/sessions/${encodeURIComponent(sessionId)}`, { expand: { 0: "line_items" } } as any);
  if (s?.metadata?.site !== slug) return { ok: false, error: "Order not found." };
  if (s.payment_status !== "paid") return { ok: false, error: "Payment not finished yet." };
  const ship = s.collected_information?.shipping_details || s.shipping_details || null;
  const row = {
    site_slug: slug, stripe_session: s.id,
    email: s.customer_details?.email || null, name: s.customer_details?.name || ship?.name || null, phone: s.customer_details?.phone || null,
    total_cents: s.amount_total || 0, currency: s.currency || "usd",
    items: (s.line_items?.data || []).map((li: any) => ({ name: li.description, qty: li.quantity, total_cents: li.amount_total })),
    shipping: ship ? { name: ship.name, address: ship.address } : null,
    created_at: new Date((s.created || Date.now() / 1000) * 1000).toISOString(),
  };
  const ins = await db().from("client_orders").upsert(row, { onConflict: "stripe_session", ignoreDuplicates: true }).select("id");
  const isNew = !ins.error && (ins.data || []).length > 0;
  if (isNew) {
    // Take what was sold out of inventory.
    const pairs = String(s.metadata?.items || "").split(",").map((x) => x.split(":").map(Number)).filter((p) => p[0] && p[1]);
    for (const [id, qty] of pairs) {
      const { data: p } = await db().from("client_products").select("inventory").eq("id", id).eq("site_slug", slug).maybeSingle();
      if (p && p.inventory !== null) await db().from("client_products").update({ inventory: Math.max(0, p.inventory - qty) }).eq("id", id);
    }
  }
  return { ok: true, email: row.email, isNew };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  let body: any = {};
  try { body = await req.json(); } catch { return json(400, { error: "Bad request" }); }
  const slug = clean(body.site, 100).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) return json(400, { error: "Unknown shop." });

  try {
    switch (body.action) {
      case "checkout": {
        const site = await loadSite(slug);
        if (!site || !site.data?.features?.store) return json(200, { error: "This shop isn’t open yet." });
        const key = await loadKey(slug);
        if (!key) return json(200, { error: "Checkout isn’t set up yet. Please contact the business." });
        const want = (Array.isArray(body.items) ? body.items : []).slice(0, 50)
          .map((i: any) => ({ id: Math.floor(+i.id), qty: Math.max(1, Math.min(99, Math.floor(+i.qty) || 1)) })).filter((i: any) => i.id > 0);
        if (!want.length) return json(200, { error: "Your cart is empty." });
        const { data: prods } = await db().from("client_products").select("id,name,price_cents,image_url,inventory,active")
          .eq("site_slug", slug).in("id", want.map((i: any) => i.id));
        const byId: Record<number, any> = {}; (prods || []).forEach((p: any) => byId[p.id] = p);
        const lines: any[] = []; let subtotal = 0;
        for (const i of want) {
          const p = byId[i.id];
          if (!p || !p.active) return json(200, { error: "Something in your cart isn’t available anymore. Please refresh." });
          if (p.inventory !== null && i.qty > p.inventory) return json(200, { error: `Only ${p.inventory} left of ${p.name}.` });
          subtotal += p.price_cents * i.qty;
          lines.push({ quantity: i.qty, price_data: { currency: "usd", unit_amount: p.price_cents,
            product_data: { name: p.name, ...(/^https:\/\//.test(p.image_url || "") ? { images: { 0: p.image_url } } : {}) } } });
        }
        // Only send shoppers back to this client's own site.
        const okHost = (u: string) => {
          try {
            const h = new URL(u).host, allowed = [site.live_url, site.data?.domain ? "https://" + site.data.domain : ""].filter(Boolean).map((x: string) => new URL(x).host);
            return new URL(u).protocol === "https:" && (!allowed.length || allowed.includes(h) || h.endsWith(".github.io"));
          } catch { return false; }
        };
        const success = clean(body.successUrl, 400), cancel = clean(body.cancelUrl, 400);
        if (!okHost(success) || !okHost(cancel)) return json(200, { error: "Checkout link is invalid." });
        const cfg = site.data?.store || {};
        const params: Record<string, unknown> = {
          mode: "payment", success_url: success + "?session_id={CHECKOUT_SESSION_ID}", cancel_url: cancel,
          line_items: Object.fromEntries(lines.map((l, i) => [i, l])),
          metadata: { site: slug, items: want.map((i: any) => `${i.id}:${i.qty}`).join(",").slice(0, 500) },
          phone_number_collection: { enabled: "true" },
        };
        if (cfg.shipping) {
          const free = +cfg.freeOverCents > 0 && subtotal >= +cfg.freeOverCents;
          params.shipping_address_collection = { allowed_countries: { 0: "US" } };
          params.shipping_options = { 0: { shipping_rate_data: { type: "fixed_amount", display_name: free ? "Free shipping" : "Shipping",
            fixed_amount: { amount: free ? 0 : Math.max(0, Math.floor(+cfg.shippingCents || 0)), currency: "usd" } } } };
        }
        const s = await stripe(key, "POST", "checkout/sessions", params);
        return json(200, { url: s.url });
      }
      case "confirm": {
        const key = await loadKey(slug); if (!key) return json(200, { ok: false });
        const sid = clean(body.session, 200);
        if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return json(200, { ok: false });
        const r = await recordSession(slug, key, sid);
        return json(200, { ok: r.ok, email: r.ok ? r.email : undefined });
      }
      case "sync": {
        if (!(await canManage(req, slug))) return json(403, { error: "Not allowed." });
        const key = await loadKey(slug); if (!key) return json(200, { error: "Connect Stripe first." });
        const since = Math.floor(Date.now() / 1000) - 30 * 86400;
        const list = await stripe(key, "GET", "checkout/sessions", { limit: 100, status: "complete", created: { gte: since } });
        let added = 0;
        for (const s of list.data || []) {
          if (s.metadata?.site !== slug || s.payment_status !== "paid") continue;
          const r = await recordSession(slug, key, s.id);
          if (r.ok && (r as any).isNew) added++;
        }
        return json(200, { ok: true, added });
      }
      case "set_key": {
        if (!(await canManage(req, slug))) return json(403, { error: "Not allowed." });
        const key = clean(body.key, 300);
        if (!key) { await db().from("client_store_keys").delete().eq("site_slug", slug); return json(200, { ok: true, removed: true }); }
        if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(key)) return json(200, { error: "That doesn’t look like a Stripe secret or restricted key." });
        try { await stripe(key, "GET", "checkout/sessions", { limit: 1 }); }
        catch (e) { return json(200, { error: "Stripe didn’t accept that key: " + (e as Error).message }); }
        await db().from("client_store_keys").upsert({ site_slug: slug, stripe_secret: key, updated_at: new Date().toISOString() });
        return json(200, { ok: true, mode: key.includes("_live_") ? "live" : "test" });
      }
      case "key_status": {
        if (!(await canManage(req, slug))) return json(403, { error: "Not allowed." });
        const key = await loadKey(slug);
        return json(200, { connected: !!key, mode: key ? (key.includes("_live_") ? "live" : "test") : "" });
      }
      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (e) {
    return json(200, { error: (e as Error).message || "Something went wrong" });
  }
});
