# Site Builder setup (your mini Shopify, all free)

Your admin page has a **Site Builder** tab with five steps:

1. **Setup:** pick a theme, fill in the client's details, plan and add-ons, choose 1–35 pages + policy pages, and let Gemini write them.
2. **Edit pages:** a visual editor. Click any text on the page to type, drag sections to reorder, add / duplicate / delete sections, swap photos, undo.
3. **Store:** products (photos, prices, stock), orders, shipping, and the client's own Stripe checkout.
4. **Client login:** invite the business owner. They sign in at `projectsarae.site/client.html` to edit their site, products, and orders.
5. **Publish:** one click to GitHub Pages (or download a ZIP).

Do the steps below once, in order. Total: about 30 minutes.

---

## 1. Database tables (2 minutes)
Supabase → **SQL Editor → New query** → paste everything from `supabase-builder-setup.sql` → **Run**.

## 2. Update the admin API (2 minutes)
Supabase → **Edge Functions → admin-api → Code** → replace all the code with `supabase/functions/admin-api/index.ts` → **Deploy**.

## 3. Connect GitHub publishing (5 minutes)
1. GitHub → profile photo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `Project Sarae admin`. Expiration: 90 days (make a new one when it runs out).
3. **Repository access: All repositories.**
4. **Repository permissions** → **Read and write** for: Administration, Contents, Pages.
5. Generate and copy the token (`github_pat_…`).
6. Supabase → **Edge Functions → Secrets → Add new secret**: `GITHUB_TOKEN` = the token.

## 4. Deploy the three new functions (6 minutes)
Supabase → **Edge Functions → Deploy a new function → Via Editor**. For each one: use the exact name, paste the file, Deploy.

| Name | File | Verify JWT |
|---|---|---|
| `site-assistant` | `supabase/functions/site-assistant/index.ts` | **On** |
| `client-api` | `supabase/functions/client-api/index.ts` | **On** |
| `store` | `supabase/functions/store/index.ts` | **OFF** (shoppers aren't logged in; it checks logins itself where needed) |

To turn Verify JWT off: open the `store` function → **Details** (or Settings) → switch off **Enforce JWT verification** → Save.

## 5. Client login emails (5 minutes)
1. Supabase → **Authentication → URL Configuration → Redirect URLs → Add URL**: `https://projectsarae.site/client.html`
2. Supabase's built-in email only sends a few emails an hour. Send invites through your free **Brevo** account instead:
   Brevo → **SMTP & API → SMTP** (copy the login and generate an SMTP key) → Supabase → **Authentication → Emails → SMTP Settings** → turn on Custom SMTP:
   host `smtp-relay.brevo.com`, port `587`, your Brevo SMTP login and key, sender = an email you verified in Brevo.
3. Optional: **Authentication → Emails → Templates → Invite user** → change the wording, e.g. "Your new website is ready. Click below to set your password."

## 6. Upload the files to your ProjectSarae repo
Add or replace: `admin.html`, `admin-builder.js`, `builder-generator.js`, `site-editor.js`, `store-admin.js`, `client.html`, `client.js`.

---

## The store (per client)
Each client gets paid **directly into their own Stripe account**. You never touch their money.
1. In the builder, turn on **Online store** (from the add-on or as an extra) and save.
2. **3 · Store** tab → have the client make a key in *their* Stripe: **Developers → API keys → Create restricted key** → set **Checkout Sessions** to **Write**, everything else None → paste it → **Save key**. Start with a `rk_test_…` key and buy something with card `4242 4242 4242 4242` to test.
3. Add products (photo, price, stock). They show on the live Shop page right away, no republish needed.
4. Paid orders appear under **Orders** when the shopper lands on the thank-you page. If someone closes the tab early, **Sync from Stripe** pulls in anything missing. Stock goes down automatically.
5. Shipping: tick **Ship orders** for a flat rate (and optional free-shipping minimum). Stripe collects the address.

## Client logins
- **4 · Client login** → type the owner's email → **Send invite**. They get an email, set a password, and land on their dashboard.
- They can edit text, sections, photos, colors, business info, products, orders, and publish. They **can't** change the plan, features, domain, or repo, so upsells stay yours.
- **Remove access** any time.

## Client's own domain (plans that include it)
1. Type it in **Setup → Client's domain** (like `www.theirsalon.com`) and publish.
2. At their domain company, add a **CNAME** record: name `www`, value `anya-inbusiness19.github.io`.
3. Wait up to an hour, then in that repo on GitHub → **Settings → Pages** → tick **Enforce HTTPS**.

## What runs where (all free tiers)
| Piece | Runs on |
|---|---|
| Client websites | GitHub Pages (one public repo per client) |
| Logins, products, orders, editor saves | Your Supabase project |
| Checkout | The client's Stripe (2.9% + 30¢ per sale, paid by them) |
| AI page writing + chat assistant | Your free Gemini key (chat capped at 150 messages per site per day) |
| Contact form | FormSubmit (first message sends a one-time confirm email) |

**Good to know**
- Gemini's free tier lets Google use what's sent to improve its products, so the chat note and Privacy Policy say so. Keep private data out of the builder.
- Policy pages are templates, not legal advice. Have each client read theirs.
- Supabase's free plan pauses a project after about a week with no activity. Any use (your admin, shop visits, chat) keeps it awake. If it ever pauses, restore it in the Supabase dashboard. Client sites stay up either way, but shops, chat, and logins need it running.
