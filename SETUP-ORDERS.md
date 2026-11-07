# Website orders: Choose a plan → 6 questions → checkout (no Zoom call)

**Already live once this is pushed:** the "Choose Starter / Business / Pro" buttons on pricing.html now open `start.html` (the questions) instead of the Zoom booking page. Plan names and prices come from admin → Pricing, same as the pricing page.

**What still needs you (about 25 min, all in Supabase + Stripe):**

## 1. Database (3 min)
Supabase → SQL Editor → New query → paste all of `supabase-orders-setup.sql` → Run.

## 2. Let customers sign up (1 min)
Supabase → Authentication → Sign In / Providers → Email:
- Make sure **Allow new users to sign up** is ON
- Turn **Confirm email** OFF (so customers go straight from the questions to checkout)

## 3. Checkout links (5 min)
Admin → Clients & checkout → make sure your Stripe links for **starterMonthly, starterYearly, businessMonthly, businessYearly, proMonthly, proYearly** are saved. The questions page uses those same links.
In Stripe, edit each of those Payment Links → **After payment** → redirect to `https://projectsarae.site/my-website.html?paid=1`.
Turn on Stripe → Settings → **Customer emails → Successful payments** (customer receipts), and your own **Successful payments** notifications (plus the Stripe app for phone alerts).

## 4. Email notifications (10 min)
Supabase → Edge Functions → Deploy a new function → Via editor:
1. `order-notify` → paste `supabase/functions/order-notify/index.ts`
2. `stripe-webhook` → paste `supabase/functions/stripe-webhook/index.ts`
3. For both: turn **Verify JWT OFF**.

Edge Functions → Secrets → add:
| Name | Value |
|---|---|
| BREVO_API_KEY | Brevo → SMTP & API → API keys |
| FROM_EMAIL | a sender verified in Brevo |
| ADMIN_EMAIL | where sale alerts go (e.g. anya.sarae@yahoo.com) |
| WEBHOOK_SECRET | make up a long random password |
| STRIPE_SECRET_KEY | Stripe → Developers → API keys → Secret key |
| STRIPE_WEBHOOK_SECRET | from step 6 |

## 5. Database webhook (2 min)
Supabase → Database → Webhooks → Create: table `orders`, events **Insert + Update**, type Supabase Edge Function → `order-notify`, add HTTP header `x-webhook-secret` = your WEBHOOK_SECRET.

## 6. Stripe webhook (2 min)
Stripe → Developers → Webhooks → Add endpoint
URL `https://skxwnhlnzylworsfxluw.supabase.co/functions/v1/stripe-webhook`, event `checkout.session.completed`. Copy the signing secret into STRIPE_WEBHOOK_SECRET.

## 7. Test
Go through projectsarae.site/pricing.html → Choose a plan with a second email of yours. Check:
- You get "New sign-up (not paid yet)"
- After paying: you get "💸 You made a sale!", the customer gets "Payment received"
- Admin → **Website orders** shows it as PAID. Set status to **Live** + paste a link → customer gets "Your website is LIVE 🎉"

## Pages
- `start.html` — the questions
- `my-website.html` — customers sign in to see progress
- `admin-orders.html` — your orders (button at the top of your admin dashboard)
