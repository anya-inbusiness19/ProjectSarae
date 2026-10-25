/* =========================================================
   PROJECT SARAE — BREVO LEAD CAPTURE
   Runs on Cloudflare Pages at /api/lead.
   Adds people who fill out the "Not ready to book?" form on
   book.html to your Brevo contact list.

   Needs two settings in Cloudflare (Pages project → Settings →
   Variables and Secrets), NOT in this file:
     BREVO_API_KEY  — your Brevo API key (type: Secret)
     BREVO_LIST_ID  — the Brevo list number to add leads to (e.g. 2)
   ========================================================= */

const JSON_HEADERS = { "content-type": "application/json" };

function reply(status, body) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

async function addToBrevo(env, payload) {
  return fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.BREVO_API_KEY) return reply(503, { ok: false, error: "not_configured" });

  let data;
  try { data = await request.json(); } catch (e) { return reply(400, { ok: false, error: "bad_request" }); }

  // Hidden "website" field: real people leave it empty, spam bots fill it in.
  if (clean(data.website, 200)) return reply(200, { ok: true });

  const email = clean(data.email, 200).toLowerCase();
  const name = clean(data.name, 80);
  const company = clean(data.business, 100);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    return reply(400, { ok: false, error: "missing_fields" });
  }

  const parts = name.split(/\s+/);
  const attributes = { FIRSTNAME: parts[0], LASTNAME: parts.slice(1).join(" ") };
  if (company) attributes.COMPANY = company;

  const listId = parseInt(env.BREVO_LIST_ID || "", 10);
  const payload = { email, attributes, updateEnabled: true };
  if (listId > 0) payload.listIds = [listId];

  let res = await addToBrevo(env, payload);

  // If the COMPANY attribute hasn't been created in Brevo yet, save the contact without it.
  if (res.status === 400 && attributes.COMPANY) {
    delete attributes.COMPANY;
    res = await addToBrevo(env, payload);
  }

  if (res.ok) return reply(200, { ok: true });
  return reply(502, { ok: false, error: "brevo_error" });
}

export function onRequest() {
  return reply(405, { ok: false, error: "method_not_allowed" });
}
