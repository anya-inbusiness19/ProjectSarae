// =========================================================
// PROJECT SARAE — ADMIN API (Supabase Edge Function, free)
// Holds your secret keys so they never appear in your site's code.
// Only your admin login can use it.
//
// Secrets (Supabase → Edge Functions → Secrets). Leave out any you
// don't have yet; that part of the admin just says "not connected".
//   STRIPE_SECRET_KEY   restricted, READ-ONLY Stripe key (rk_live_...)
//   GEMINI_API_KEY      free key from Google AI Studio
//   GEMINI_MODEL        optional, defaults to gemini-2.5-flash
//   IG_USER_ID          your Instagram professional account ID
//   IG_ACCESS_TOKEN     long-lived Instagram/Meta access token
//   META_GRAPH_HOST     optional: graph.facebook.com (default) or graph.instagram.com
//   META_API_VERSION    optional, defaults to v23.0
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
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max);

// ---------- Stripe (read only) ----------
async function stripeGet(path: string, params: Record<string, string | string[]> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) (Array.isArray(v) ? v : [v]).forEach((x) => q.append(k, x));
  const r = await fetch(`https://api.stripe.com/v1/${path}?${q}`, {
    headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}` },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Stripe error ${r.status}`);
  return data;
}
async function stripeAll(path: string, params: Record<string, string | string[]>, cap = 1000) {
  const out: any[] = [];
  let after = "";
  while (out.length < cap) {
    const page = await stripeGet(path, { ...params, limit: "100", ...(after ? { starting_after: after } : {}) });
    out.push(...page.data);
    if (!page.has_more || !page.data.length) break;
    after = page.data[page.data.length - 1].id;
  }
  return out;
}
async function sales(days: number) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const [charges, subs, balance] = await Promise.all([
    stripeAll("charges", { "created[gte]": String(since), "expand[]": ["data.balance_transaction"] }),
    stripeAll("subscriptions", { status: "active" }, 500),
    stripeGet("balance"),
  ]);
  const paid = charges.filter((c) => c.paid && c.status === "succeeded");
  const cents = (a: number) => Math.round(a) / 100;
  let gross = 0, fees = 0, refunded = 0;
  const daily: Record<string, number> = {};
  const recent = paid.map((c) => {
    gross += c.amount; refunded += c.amount_refunded || 0;
    fees += c.balance_transaction?.fee || 0;
    const day = new Date(c.created * 1000).toISOString().slice(0, 10);
    daily[day] = (daily[day] || 0) + c.amount - (c.amount_refunded || 0);
    return {
      date: c.created, amount: cents(c.amount), refunded: cents(c.amount_refunded || 0),
      currency: c.currency, name: c.billing_details?.name || "", email: c.billing_details?.email || c.receipt_email || "",
      description: c.description || "",
    };
  });
  let mrr = 0;
  const plans: Record<string, number> = {};
  for (const s of subs) {
    for (const it of s.items?.data || []) {
      const p = it.price || {}, qty = it.quantity || 1, rec = p.recurring || {};
      const per = rec.interval === "year" ? 1 / 12 : rec.interval === "week" ? 52 / 12 : rec.interval === "day" ? 30 : 1;
      mrr += (p.unit_amount || 0) * qty * per / (rec.interval_count || 1);
      const label = p.nickname || `$${cents(p.unit_amount || 0)}/${rec.interval || "mo"}`;
      plans[label] = (plans[label] || 0) + 1;
    }
  }
  const sum = (arr: any[]) => arr.reduce((t, b) => t + b.amount, 0);
  return {
    days, gross: cents(gross), refunded: cents(refunded), fees: cents(fees), net: cents(gross - refunded - fees),
    payments: paid.length, activeSubscriptions: subs.length, mrr: cents(mrr), plans,
    balanceAvailable: cents(sum(balance.available || [])), balancePending: cents(sum(balance.pending || [])),
    daily, recent: recent.slice(0, 25), livemode: balance.livemode,
  };
}

// ---------- Gemini (scripts, hooks, captions) ----------
async function generate(body: any) {
  const topic = clean(body.topic, 400), style = clean(body.style, 300), goal = clean(body.goal, 200);
  if (!topic) throw new Error("Add a topic first.");
  const prompt = `You write short-form, faceless Instagram Reels for "Project Sarae", a one-woman web design studio run by A'Nya.
She builds websites with online booking for local businesses (salons, med spas). Tone: professional-casual, warm, confident. No fake income claims, no lifestyle flexing, no fake testimonials.
The video uses an ORIGINAL 3D-cartoon character (not any existing studio or brand character), made in an AI image-to-video tool. Each scene is a 3-5 second clip.
Topic: ${topic}
Character / visual style: ${style || "friendly original 3D cartoon character, cinematic lighting, vertical 9:16"}
Goal of the post: ${goal || "get local business owners to book a free website call"}
Return JSON only, with this shape:
{"hooks":[3 strings, under 10 words, scroll-stopping],
 "character_prompt": string (reusable description to keep the character consistent),
 "scenes":[4 to 6 objects {"visual_prompt": string for the AI video tool, "on_screen_text": string under 6 words, "voiceover": string}],
 "caption": string (under 300 characters, ends with a soft call to action),
 "hashtags":[8 strings without #]}`;
  const model = env("GEMINI_MODEL", "gemini-2.5-flash");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Gemini error ${r.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  try { return JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()); }
  catch { throw new Error("The AI reply wasn't in the right format. Try again."); }
}

// ---------- Instagram publishing ----------
function graph(path: string) {
  return `https://${env("META_GRAPH_HOST", "graph.facebook.com")}/${env("META_API_VERSION", "v23.0")}/${path}`;
}
async function ig(method: "GET" | "POST", path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...params, access_token: env("IG_ACCESS_TOKEN") });
  const r = method === "GET" ? await fetch(`${graph(path)}?${q}`) : await fetch(graph(path), { method: "POST", body: q });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data?.error?.message || `Instagram error ${r.status}`);
  return data;
}

// ---------- Router ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Only the admin account (same check as the rest of your admin page).
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const chk = await sb.rpc("is_admin");
  if (chk.error || chk.data !== true) return json(403, { error: "Admin only." });

  let body: any = {};
  try { body = await req.json(); } catch { return json(400, { error: "Bad request" }); }

  try {
    switch (body.action) {
      case "status":
        return json(200, {
          stripe: !!env("STRIPE_SECRET_KEY"), gemini: !!env("GEMINI_API_KEY"),
          instagram: !!(env("IG_USER_ID") && env("IG_ACCESS_TOKEN")),
        });
      case "sales": {
        if (!env("STRIPE_SECRET_KEY")) return json(200, { notConnected: true });
        const days = [7, 30, 90, 365].includes(+body.days) ? +body.days : 30;
        return json(200, await sales(days));
      }
      case "generate":
        if (!env("GEMINI_API_KEY")) return json(200, { notConnected: true });
        return json(200, await generate(body));
      case "ig_account":
        if (!env("IG_ACCESS_TOKEN")) return json(200, { notConnected: true });
        return json(200, await ig("GET", env("IG_USER_ID"), { fields: "username,followers_count,media_count" }));
      case "ig_create": {
        const url = clean(body.mediaUrl, 1000), caption = clean(body.caption, 2200);
        if (!/^https:\/\//.test(url)) throw new Error("Upload a video or image first.");
        const isVideo = body.kind === "video";
        const p: Record<string, string> = isVideo
          ? { media_type: "REELS", video_url: url, caption, share_to_feed: "true" }
          : { image_url: url, caption };
        return json(200, await ig("POST", `${env("IG_USER_ID")}/media`, p));
      }
      case "ig_check":
        return json(200, await ig("GET", clean(body.id, 60), { fields: "status_code,status" }));
      case "ig_publish": {
        const out = await ig("POST", `${env("IG_USER_ID")}/media_publish`, { creation_id: clean(body.id, 60) });
        let permalink = "";
        try { permalink = (await ig("GET", out.id, { fields: "permalink" })).permalink || ""; } catch { /* optional */ }
        return json(200, { id: out.id, permalink });
      }
      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (e) {
    return json(200, { error: (e as Error).message || "Something went wrong" });
  }
});
