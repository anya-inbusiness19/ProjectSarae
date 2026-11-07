// Supabase Edge Function: order-notify
// Called by a Database Webhook on the "orders" table (INSERT + UPDATE).
// Sends emails through Brevo:
//   • New sign-up (not paid yet)  → you
//   • Payment comes in            → you ("You made a sale") + customer ("I'm starting")
//   • You change the status       → customer (with the site link when it's live)

const BREVO_KEY = Deno.env.get("BREVO_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")!;            // a sender verified in Brevo
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;
const SECRET = Deno.env.get("WEBHOOK_SECRET")!;
const DASHBOARD_URL = Deno.env.get("DASHBOARD_URL") ?? "https://projectsarae.site/my-website.html";
const ADMIN_URL = Deno.env.get("ADMIN_URL") ?? "https://projectsarae.site/admin-orders.html";
const PRICES: Record<string, number> = { starter: 50, business: 180, pro: 250 };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const wrap = (title: string, body: string, btn?: [string, string]) => `
<div style="background:#fdfbf7;padding:28px 12px;font-family:Arial,sans-serif;color:#1b1b2b">
 <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:28px">
  <div style="font-family:Georgia,serif;font-size:20px;color:#16187e;font-weight:bold;margin-bottom:16px">Project Sarae</div>
  <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px">${title}</h1>
  <div style="font-size:15px;line-height:1.6">${body}</div>
  ${btn ? `<a href="${btn[1]}" style="display:inline-block;margin-top:20px;background:#16187e;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px">${btn[0]}</a>` : ""}
  <p style="font-size:13px;color:#6b6b7b;margin-top:24px">— A'Nya, Project Sarae</p>
 </div></div>`;

const details = (r: any) => `
<table style="font-size:14px;border-collapse:collapse;margin-top:10px">
${[
  ["Plan", `${r.plan} (${r.billing})`], ["Contact", `${r.contact_name} · ${r.phone} · ${r.email}`],
  ["Reach by", `${r.contact_method}, ${r.best_time}`], ["Business", `${r.business_name} — ${r.business_type}`],
  ["Vibe", r.vibe], ["Colors", (r.colors ?? []).join(", ")], ["Logo", r.logo_choice], ["Font", r.font],
  ["Features", (r.features ?? []).join(", ")], ["Inspiration", r.inspiration], ["Notes", r.notes],
].filter(([, v]) => v).map(([k, v]) =>
  `<tr><td style="color:#6b6b7b;padding:4px 12px 4px 0;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join("")}
</table>`;

const STATUS_EMAIL: Record<string, (r: any) => [string, string, [string, string]?]> = {
  designing: (r) => [`I'm designing your site ✏️`, `Hi ${esc(r.contact_name)}! I've started designing the website for <b>${esc(r.business_name)}</b>. I'll let you know when it's ready to look at.`, ["See progress", DASHBOARD_URL]],
  review: (r) => [`Your site is ready to look at 👀`, `Hi ${esc(r.contact_name)}! Your website for <b>${esc(r.business_name)}</b> is ready for you to check out. Look it over and reply with any changes.`, r.site_url ? ["Preview your site", r.site_url] : ["See progress", DASHBOARD_URL]],
  live: (r) => [`Your website is LIVE 🎉`, `Hi ${esc(r.contact_name)}! <b>${esc(r.business_name)}</b> is officially online. Share the link everywhere — Google, Instagram, your business cards.`, ["Visit your website", r.site_url ?? DASHBOARD_URL]],
};

async function send(to: string, subject: string, html: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: FROM_EMAIL, name: "Project Sarae" }, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!res.ok) console.error("Brevo error", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== SECRET) return new Response("unauthorized", { status: 401 });
  const { type, record: r, old_record: o } = await req.json();
  const jobs: Promise<void>[] = [];

  if (type === "INSERT") {
    jobs.push(send(ADMIN_EMAIL, `New sign-up (not paid yet): ${r.business_name}`,
      wrap("Someone filled out your questions", `They haven't finished checkout yet — follow up if they don't pay soon.${details(r)}`, ["Open admin", ADMIN_URL])));
  }

  if (type === "UPDATE") {
    if (r.paid && !o.paid) {
      jobs.push(send(ADMIN_EMAIL, `💸 You made a sale! ${r.business_name} — ${r.plan}`,
        wrap(`You made a sale! 💸`, `<b>${esc(r.business_name)}</b> just paid for the <b>${esc(r.plan)}</b> plan ($${PRICES[r.plan] ?? "?"}/mo). Here's everything they told you:${details(r)}`, ["Open admin", ADMIN_URL])));
      jobs.push(send(r.email, `You're all set, ${r.contact_name}! 🎉`,
        wrap(`Payment received — I'm on it!`, `Thank you for choosing Project Sarae. I have everything I need to start the website for <b>${esc(r.business_name)}</b>. You'll get an email at every step, and you can check progress anytime.`, ["Check progress", DASHBOARD_URL])));
    }
    if (r.status !== o.status && STATUS_EMAIL[r.status]) {
      const [subject, body, btn] = STATUS_EMAIL[r.status](r);
      jobs.push(send(r.email, subject, wrap(subject, body, btn)));
    }
  }

  await Promise.all(jobs);
  return new Response("ok");
});
