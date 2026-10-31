# Site Builder setup (all free)

Your admin page has a new **Site Builder** tab. You fill in a client's details, pick their plan and add-ons, choose 1–35 pages plus policy pages, let Gemini write the pages, preview, and publish to GitHub Pages in one click.

Do these once. Steps 1–2 take about 10 minutes.

---

## 1. Add the database tables (2 minutes)
1. Supabase → **SQL Editor → New query**.
2. Paste everything from `supabase-builder-setup.sql` and click **Run**.

## 2. Update the admin API (3 minutes)
The `admin-api` function now writes pages and publishes to GitHub.
1. Supabase → **Edge Functions → admin-api → Code**.
2. Replace all the code with everything from `supabase/functions/admin-api/index.ts`, then **Deploy**.

(Your Gemini key from SETUP-TOOLS.md step 4 is reused. Nothing new to add for AI writing.)

## 3. Connect GitHub publishing (5 minutes)
1. GitHub → your profile photo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `Project Sarae admin`. Expiration: 90 days (you'll make a new one when it runs out).
3. **Repository access: All repositories.**
4. **Repository permissions**, set these to **Read and write**: Administration, Contents, Pages. (Metadata turns on as Read automatically.)
5. Generate and copy the token (starts with `github_pat_`).
6. Supabase → **Edge Functions → Secrets → Add new secret**: `GITHUB_TOKEN` = that token.

Each client site becomes its own public repo on your GitHub, live at `https://anya-inbusiness19.github.io/<site-id>/`.

## 4. Turn on the AI chat assistant for client sites (3 minutes)
1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `site-assistant`.
3. Paste everything from `supabase/functions/site-assistant/index.ts` and **Deploy**. Leave **Verify JWT** on.

It uses your same `GEMINI_API_KEY`. Each client site is capped at 150 chat messages a day, and all sites together at 900, so a spam bot can't burn your free quota. To change the caps, add secrets `ASSISTANT_DAILY_CAP` and `ASSISTANT_TOTAL_CAP`.

## 5. Client's own domain (only for plans that include it)
1. Type the domain (like `www.theirsalon.com`) in the builder's **Client's domain** box and publish.
2. At the domain company (GoDaddy, etc.), add a **CNAME** record: name `www`, value `anya-inbusiness19.github.io`.
3. Wait up to an hour, then in that repo on GitHub → **Settings → Pages**, tick **Enforce HTTPS**.

---

## How to use it
1. **Client details:** the AI only uses facts you type, so the more real detail, the better the pages. It never invents prices, awards, or reviews.
2. **Plan & add-ons:** pulled live from your Pricing tab. Picking a plan turns on its features (Starter: contact form + map; Business: + domain, booking, payments, AI chat; Pro: + member area). Add-ons turn on store, Google reviews, and the email sign-up form. You can switch on extras too.
3. **Pages:** up to 35, plus 5 policy pages. Turning on booking, store, reviews, or members adds that page for you.
4. **Write with AI:** pages are written one at a time to stay inside Gemini's free limits. If Google says "slow down", the builder waits and keeps going.
5. **Preview**, then **Publish to GitHub**. Publishing again later updates the same site. No GitHub yet? **Download ZIP** and upload it to a repo yourself.

## What each feature uses (all free)
| Feature | How it works |
|---|---|
| Contact form | FormSubmit (formsubmit.co). The first message sends the client a one-time confirm email. |
| Google Map | Google's free map embed. |
| Booking | Their Cal.com, Calendly, GoHighLevel, or Square link, shown on the page. |
| Payments & store | Stripe Payment Links (made in the client's Stripe). |
| Google reviews | "Read reviews" + "Leave a review" buttons from the Place ID, featured reviews you copy in, and an optional free widget (Trustindex/Elfsight free plan) for automatic updates. |
| AI chat assistant | Your `site-assistant` function + Gemini free tier. Answers only from that client's saved info. |
| Email sign-up | Their Brevo form. Feeds reminders, follow-ups, and win-back emails you run in Brevo / GoHighLevel. |
| Member area | A page that sends clients to their booking app's or GoHighLevel's client login. |

**Good to know**
- Gemini's free tier lets Google use what's sent to improve its products, so the chat note and Privacy Policy mention it. Don't put private client data in the builder.
- Policy pages are solid templates, not legal advice. Have each client read theirs before launch.
