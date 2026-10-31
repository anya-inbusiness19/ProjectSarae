// =========================================================
// PROJECT SARAE — CLIENT API (Supabase Edge Function, free)
// Lets a logged-in client save and publish ONLY their own website.
// They can change content, photos, colors, and pages, but never
// their plan, features, domain, or repo (those stay yours).
//
// Deploy with "Verify JWT" ON. Uses your GITHUB_TOKEN secret to publish.
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
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max);

// What a client may change. Everything else is kept from your saved version.
const CLIENT_KEYS = [
  "business", "tagline", "about", "audience", "tone", "extra", "phone", "email", "address", "hoursText", "servicesText",
  "instagram", "facebook", "tiktok", "logoUrl", "heroUrl", "galleryText", "showNameWithLogo", "style", "colors",
  "pages", "reviewsText", "reviewsEmbed", "placeId", "mapsUrl", "assistantName", "assistantGreeting", "assistantExtra",
  "bookingUrl", "paymentsText", "formEmail", "leadFormUrl", "membersUrl", "cancelHours", "depositText", "refundText",
  "lawState", "policies", "store",
];

// ---------- GitHub publish (same as admin-api) ----------
async function gh(method: string, path: string, payload?: unknown, okStatuses: number[] = []) {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env("GITHUB_TOKEN")}`, Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "project-sarae-client",
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await r.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!r.ok && !okStatuses.includes(r.status)) throw new Error(`GitHub: ${data?.message || r.status}`);
  return { status: r.status, data };
}
async function publishFiles(repo: string, files: Record<string, string>, cname: string) {
  const owner = (await gh("GET", "/user")).data.login;
  const ref = await gh("GET", `/repos/${owner}/${repo}/git/ref/heads/main`, undefined, [404, 409]);
  if (ref.status !== 200) throw new Error("This site hasn’t been published yet. Ask your web designer to publish it first.");
  const parent = (await gh("GET", `/repos/${owner}/${repo}/git/commits/${ref.data.object.sha}`)).data;
  const tree = (await gh("POST", `/repos/${owner}/${repo}/git/trees`, {
    tree: Object.keys(files).map((p) => ({ path: p, mode: "100644", type: "blob", content: String(files[p]) })),
  })).data;
  const commit = (await gh("POST", `/repos/${owner}/${repo}/git/commits`, { message: "Update site from client dashboard", tree: tree.sha, parents: [parent.sha] })).data;
  await gh("PATCH", `/repos/${owner}/${repo}/git/refs/heads/main`, { sha: commit.sha, force: true });
  return { liveUrl: cname ? `https://${cname}/` : `https://${owner}.github.io/${repo}/` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = req.headers.get("Authorization") || "";
  const user = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } } });
  let body: any = {};
  try { body = await req.json(); } catch { return json(400, { error: "Bad request" }); }
  const slug = clean(body.site, 100).toLowerCase();
  const isAdmin = (await user.rpc("is_admin")).data === true;
  const isMember = (await user.rpc("is_site_member", { p_slug: slug })).data === true;
  if (!isAdmin && !isMember) return json(403, { error: "You don’t have access to this website." });

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: row } = await db.from("client_sites").select("*").eq("slug", slug).maybeSingle();
  if (!row) return json(404, { error: "Website not found." });

  try {
    switch (body.action) {
      case "save": {
        const incoming = body.data && typeof body.data === "object" ? body.data : {};
        const next = { ...(row.data || {}) };
        for (const k of CLIENT_KEYS) if (k in incoming) next[k] = incoming[k];
        if (!Array.isArray(next.pages) || !next.pages.length) return json(200, { error: "A site needs at least one page." });
        if (next.pages.length > 35) return json(200, { error: "Sites can have up to 35 pages." });
        const size = JSON.stringify(next).length;
        if (size > 900_000) return json(200, { error: "That’s too much content to save at once." });
        const upd: Record<string, unknown> = { data: next, business: clean(next.business, 120) || row.business, updated_at: new Date().toISOString() };
        if (row.assistant_on) upd.assistant_info = clean(body.assistantInfo, 8000) || row.assistant_info;
        const r = await db.from("client_sites").update(upd).eq("slug", slug);
        if (r.error) throw new Error(r.error.message);
        return json(200, { ok: true });
      }
      case "publish": {
        if (!env("GITHUB_TOKEN")) return json(200, { error: "Publishing isn’t connected yet. Ask your web designer." });
        const files = body.files && typeof body.files === "object" ? body.files : {};
        const paths = Object.keys(files);
        if (!paths.length || paths.length > 120) return json(200, { error: "Nothing to publish." });
        let total = 0;
        for (const p of paths) {
          if (!/^(CNAME|\.nojekyll|[a-z0-9][a-z0-9_\-/]*\.(html|css|js|txt|xml|json|svg))$/.test(p)) return json(200, { error: `Bad file name: ${p}` });
          total += String(files[p]).length;
        }
        if (total > 4_000_000) return json(200, { error: "Site is too big to publish in one go." });
        // The domain always comes from your saved settings, not the browser.
        const cname = clean(row.data?.domain, 120).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (cname) files["CNAME"] = cname + "\n"; else delete files["CNAME"];
        const repo = clean(row.data?.repo || row.slug, 100).toLowerCase();
        const out = await publishFiles(repo, files, cname);
        await db.from("client_sites").update({ published_at: new Date().toISOString() }).eq("slug", slug);
        return json(200, { ok: true, liveUrl: out.liveUrl });
      }
      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (e) {
    return json(200, { error: (e as Error).message || "Something went wrong" });
  }
});
