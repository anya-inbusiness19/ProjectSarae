// =========================================================
// PROJECT SARAE — ADMIN API (Supabase Edge Function, free)
// Holds your secret keys so they never appear in your site's code.
// Only your admin login can use it.
//
// Secrets (Supabase → Edge Functions → Secrets). Leave out any you
// don't have yet; that part of the admin just says "not connected".
//   STRIPE_SECRET_KEY   restricted, READ-ONLY Stripe key (rk_live_...)
//   GEMINI_API_KEY      free key from Google AI Studio
//   GEMINI_MODEL        optional, defaults to gemini-3.8-flash
//   IG_USER_ID          your Instagram professional account ID
//   IG_ACCESS_TOKEN     long-lived Instagram/Meta access token
//   META_GRAPH_HOST     optional: graph.facebook.com (default) or graph.instagram.com
//   META_API_VERSION    optional, defaults to v23.0
//   GITHUB_TOKEN        GitHub token (Site Builder publishing)
//   CF_ACCOUNT_ID       Cloudflare account ID (free AI photos in Content Studio)
//   CF_AI_TOKEN         Cloudflare API token with "Workers AI" permission
//   CF_IMAGE_MODEL      optional, defaults to @cf/black-forest-labs/flux-1-schnell
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

// ---------- Gemini (photo posts: carousel slides, hooks, captions) ----------
const FORMATS: Record<string, string> = {
  tips: "Tips carousel. Cover promises a specific number of tips. Each point slide is one tip.",
  mistakes: "Mistakes to avoid. Cover calls out a costly mistake. Each point slide names one mistake (headline) and the fix (body).",
  myth: "Myth vs. fact. Each point slide: kicker 'MYTH' or 'FACT', headline the statement, body the short explanation. Alternate myth then fact.",
  beforeafter: "Before / after comparison. Point slides alternate kicker 'BEFORE' and 'AFTER' showing the same moment both ways.",
  signs: "Checklist of signs. Cover: 'Signs your business needs...'. Each point slide is one sign the reader can check against themselves.",
  pov: "POV / relatable moment. Cover starts with 'POV:'. Point slides tell a tiny story a business owner instantly recognizes, beat by beat.",
  quote: "Single bold statement. Return exactly ONE slide of kind 'cover' with a short, punchy, quotable headline and a one-line body. No other slides.",
};
async function generate(body: any) {
  const topic = clean(body.topic, 400), goal = clean(body.goal, 200);
  const format = FORMATS[clean(body.format, 20)] ? clean(body.format, 20) : "tips";
  const tiktok = body.platform === "tiktok", photos = !!body.photos, look = clean(body.look, 120);
  if (!topic) throw new Error("Add a topic first.");
  const where = tiktok ? "TikTok photo-mode carousels (vertical 9:16 slides people swipe through)" : "Instagram photo posts (carousels of text slides)";
  const prompt = `You create ${where} for "Project Sarae", a one-woman web design studio run by A'Nya.
She builds websites with online booking for local businesses (salons, med spas, barbers, beauty pros). Audience: local business owners scrolling ${tiktok ? "TikTok" : "Instagram"}.
Tone: professional-casual, warm, confident, plain-spoken. No fake income claims, no invented statistics or percentages, no fake testimonials, no lifestyle flexing.

Write it to spread: the cover must stop the scroll in under 1 second (pattern interrupt, specific, curiosity gap, speaks to one person).
Every slide must earn the next swipe. Be specific and useful enough that people SAVE it and SEND it to a business-owner friend.
Short words. Headlines under 9 words. Body under 26 words. No emojis on slides. No hashtags on slides.

Format: ${FORMATS[format]}
Topic: ${topic}
Goal of the post: ${goal || "get local business owners to book a free website call"}

${tiktok ? "TikTok style: the cover hook reads like a spoken thought or bold claim; keep every slide skimmable in 2 seconds; headlines under 7 words, body under 18 words.\n" : ""}Slides: ${format === "quote" ? "exactly 1" : "6 to 8"} total. Slide 1 is kind "cover" (kicker = 2-4 word label, headline = the hook, body = optional short subline).
${format === "quote" ? "" : `Middle slides are kind "point". Last slide is kind "cta": headline invites them to save/share or DM, body mentions a free website call with Project Sarae.`}
Return JSON only:
{"hooks":[3 alternative cover headlines, under 9 words each],
 "slides":[{"kind":"cover"|"point"|"cta","kicker":string,"headline":string,"body":string${photos ? ',"image_prompt":string' : ""}}],
 "caption": string (${tiktok ? "under 150 characters, casual, ends with a question to get comments" : "under 400 characters; opens with a hook line, adds value, ends by asking a question or telling them to save/share"}),
 "hashtags":[${tiktok ? "5" : "10"} strings without #, mix of broad and niche/local small-business tags],
 "alt_text": string (one sentence describing the post for screen readers)}${photos ? `
For image_prompt: describe a realistic, eye-catching background PHOTO for that slide (scene, subject, lighting, camera angle) that matches its message, e.g. a stylist finishing a client's hair, a phone showing a booking screen in a cozy salon.
Style: ${look || "bright, candid lifestyle photography, shallow depth of field"}. Vertical composition with the subject in the center and empty space at the top.
No text, letters, logos, watermarks, or brand names in the image. No famous or real named people. Under 60 words.` : ""}`;
  const model = env("GEMINI_MODEL", "gemini-3.8-flash");
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

// ---------- Free AI photos (Cloudflare Workers AI) ----------
async function makeImage(body: any) {
  const prompt = clean(body.prompt, 900);
  if (!prompt) throw new Error("Describe the photo first.");
  const model = env("CF_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell");
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env("CF_ACCOUNT_ID")}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("CF_AI_TOKEN")}`, "content-type": "application/json" },
    body: JSON.stringify({ prompt: prompt + ". No text, no letters, no logos, no watermark.", steps: 4 }),
  });
  const type = r.headers.get("content-type") || "";
  if (type.startsWith("image/")) {
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { image: `data:${type};base64,${btoa(bin)}` };
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 429 || /neuron|limit|quota/i.test(JSON.stringify(data?.errors || ""))) throw new Error("You’ve used today’s free Cloudflare images. It resets at 5pm Pacific (midnight UTC).");
  if (!r.ok || !data?.success) throw new Error("Cloudflare: " + (data?.errors?.[0]?.message || `error ${r.status}`));
  const img = data?.result?.image;
  if (!img) throw new Error("Cloudflare didn’t send an image back. Try again.");
  return { image: `data:image/jpeg;base64,${img}` };
}

// ---------- Site Builder: Gemini writes one page at a time ----------
async function gemini(prompt: string, temperature = 0.7) {
  const model = env("GEMINI_MODEL", "gemini-3.8-flash");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature },
    }),
  });
  const data = await r.json();
  if (r.status === 429) throw new Error("RATE_LIMIT");
  if (!r.ok) throw new Error(data?.error?.message || `Gemini error ${r.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  try { return JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()); }
  catch { throw new Error("The AI reply wasn't in the right format. Try again."); }
}

async function buildPage(body: any) {
  const s = body.site || {}, p = body.page || {};
  const facts = {
    business: clean(s.business, 120), niche: clean(s.niche, 80), city: clean(s.city, 80),
    tagline: clean(s.tagline, 200), about: clean(s.about, 1500), audience: clean(s.audience, 300),
    tone: clean(s.tone, 120), services: clean(s.servicesText, 2500), hours: clean(s.hoursText, 400),
    extra: clean(s.extra, 1500),
  };
  const page = { title: clean(p.title, 80), type: clean(p.type, 30), brief: clean(p.brief, 400) };
  const others = (Array.isArray(body.pages) ? body.pages : []).slice(0, 40).map((x: unknown) => clean(x, 60)).join(", ");
  if (!facts.business || !page.title) throw new Error("Business name and page title are required.");
  const prompt = `You are writing website copy for a real local small business. Write ONE page.
BUSINESS FACTS (the only facts you may use):
${JSON.stringify(facts, null, 1)}
PAGE: "${page.title}" (type: ${page.type})${page.brief ? `\nWhat this page should cover: ${page.brief}` : ""}
Other pages on the site: ${others}

Rules:
- Tone: ${facts.tone || "warm, professional, confident"}. Plain, specific language. No clichés like "look no further" or "elevate".
- NEVER invent prices, years in business, awards, certifications, licenses, staff names, statistics, guarantees, or testimonials. If a detail isn't in the facts, write around it.
- Don't write contact details, hours, prices, forms, maps, or booking widgets: the site adds those automatically.
- Write for ${facts.city || "local"} customers. Short paragraphs. 250-600 words total.
Return JSON only:
{"meta_description": string under 155 chars,
 "hero": {"eyebrow": string under 6 words, "title": string under 10 words, "sub": string under 35 words},
 "sections": [2 to 5 objects, each one of:
   {"kind":"text","heading":string,"body":string (paragraphs separated by \\n\\n)}
   {"kind":"cards","heading":string,"intro":string,"items":[3-6 {"title":string,"text":string}]}
   {"kind":"steps","heading":string,"items":[3-5 {"title":string,"text":string}]}
   {"kind":"faq","heading":string,"items":[4-8 {"q":string,"a":string}]}
   {"kind":"split","heading":string,"body":string,"bullets":[3-6 strings]}
 ]}`;
  return await gemini(prompt, 0.7);
}

// ---------- Site Builder: publish to GitHub Pages ----------
async function gh(method: string, path: string, payload?: unknown, okStatuses: number[] = []) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env("GITHUB_TOKEN")}`, Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "project-sarae-admin",
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await r.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!r.ok && !okStatuses.includes(r.status)) {
    throw new Error(`GitHub: ${data?.message || r.status}${data?.errors?.[0]?.message ? " (" + data.errors[0].message + ")" : ""}`);
  }
  return { status: r.status, data };
}
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function publish(body: any) {
  const repo = clean(body.repo, 100).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(repo)) throw new Error("Repo name can only use letters, numbers, - and _.");
  const files = body.files && typeof body.files === "object" ? body.files : {};
  const paths = Object.keys(files);
  if (!paths.length || paths.length > 120) throw new Error("Nothing to publish.");
  let total = 0;
  for (const p of paths) {
    if (!/^(CNAME|\.nojekyll|[a-z0-9][a-z0-9_\-/]*\.(html|css|js|txt|xml|json|svg))$/.test(p)) throw new Error(`Bad file name: ${p}`);
    total += String(files[p]).length;
  }
  if (total > 4_000_000) throw new Error("Site is too big to publish in one go.");

  const me = (await gh("GET", "/user")).data;
  const owner = me.login;
  const exists = await gh("GET", `/repos/${owner}/${repo}`, undefined, [404]);
  if (exists.status === 404) {
    await gh("POST", "/user/repos", {
      name: repo, description: clean(body.description, 200), homepage: "",
      private: false, auto_init: true, has_issues: false, has_wiki: false, has_projects: false,
    });
  }
  // Wait for the first commit to exist (brand-new repos take a moment).
  let ref: any = null;
  for (let i = 0; i < 8 && !ref; i++) {
    const r = await gh("GET", `/repos/${owner}/${repo}/git/ref/heads/main`, undefined, [404, 409]);
    if (r.status === 200) ref = r.data; else await wait(1500);
  }
  if (!ref) throw new Error("GitHub didn't finish creating the repo. Wait a minute and publish again.");
  const parentSha = ref.object.sha;
  const parent = (await gh("GET", `/repos/${owner}/${repo}/git/commits/${parentSha}`)).data;

  // Replace the whole site in one commit (old pages you removed are deleted).
  const tree = (await gh("POST", `/repos/${owner}/${repo}/git/trees`, {
    tree: paths.map((p) => ({ path: p, mode: "100644", type: "blob", content: String(files[p]) })),
  })).data;
  const commit = (await gh("POST", `/repos/${owner}/${repo}/git/commits`, {
    message: clean(body.message, 200) || "Publish site from Project Sarae admin", tree: tree.sha, parents: [parent.sha],
  })).data;
  await gh("PATCH", `/repos/${owner}/${repo}/git/refs/heads/main`, { sha: commit.sha, force: true });

  // Turn on GitHub Pages (409 = already on).
  await gh("POST", `/repos/${owner}/${repo}/pages`, { source: { branch: "main", path: "/" } }, [409]);
  const cname = clean(body.cname, 120).toLowerCase();
  if (cname) await gh("PUT", `/repos/${owner}/${repo}/pages`, { cname, source: { branch: "main", path: "/" } }, [400, 422]);

  return {
    owner, repo, repoUrl: `https://github.com/${owner}/${repo}`,
    liveUrl: cname ? `https://${cname}/` : `https://${owner}.github.io/${repo}/`,
    pagesUrl: `https://${owner}.github.io/${repo}/`,
  };
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
          github: !!env("GITHUB_TOKEN"),
          images: !!(env("CF_ACCOUNT_ID") && env("CF_AI_TOKEN")),
        });
      case "image":
        if (!env("CF_ACCOUNT_ID") || !env("CF_AI_TOKEN")) return json(200, { notConnected: true });
        return json(200, await makeImage(body));
      case "build_page":
        if (!env("GEMINI_API_KEY")) return json(200, { notConnected: true });
        try { return json(200, await buildPage(body)); }
        catch (e) { if ((e as Error).message === "RATE_LIMIT") return json(200, { rateLimited: true }); throw e; }
      case "gh_publish":
        if (!env("GITHUB_TOKEN")) return json(200, { notConnected: true });
        return json(200, await publish(body));
      case "invite_client": {
        // Gives a client a login for one site and emails them an invite to set a password.
        const site = clean(body.site, 100).toLowerCase(), email = clean(body.email, 200).toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email.");
        const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
        const { data: row } = await admin.from("client_sites").select("slug").eq("slug", site).maybeSingle();
        if (!row) throw new Error("Save the site first.");
        const redirectTo = clean(body.redirectTo, 300) || "https://projectsarae.site/client.html";
        const inv = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
        let existed = false;
        if (inv.error) {
          if (!/already|registered|exists/i.test(inv.error.message)) throw new Error(inv.error.message);
          existed = true; // They already have a login (maybe for another site). Just link this site.
        }
        const m = await admin.from("site_members").upsert({ site_slug: site, email }, { onConflict: "site_slug,email" });
        if (m.error) throw new Error(m.error.message);
        return json(200, { ok: true, existed });
      }
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
          : body.kind === "carousel_item"
          ? { image_url: url, is_carousel_item: "true" }
          : { image_url: url, caption };
        return json(200, await ig("POST", `${env("IG_USER_ID")}/media`, p));
      }
      case "ig_carousel": {
        const ids = (Array.isArray(body.children) ? body.children : []).map((x: unknown) => clean(x, 60)).filter(Boolean);
        if (ids.length < 2 || ids.length > 10) throw new Error("A carousel needs 2 to 10 images.");
        return json(200, await ig("POST", `${env("IG_USER_ID")}/media`, {
          media_type: "CAROUSEL", children: ids.join(","), caption: clean(body.caption, 2200),
        }));
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
