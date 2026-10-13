# Project Sarae website: free setup guide

Everything here uses free plans. Stripe only takes its normal fee (about 2.9% + 30¢) when a client actually pays you.

## Pages
Home · Services · Work · Pricing · About · Book a Zoom call · Reviews · Service Agreement · Terms & Refunds · Privacy Policy

Hidden pages: **checkout.html** (opens only with a private link) and **admin.html** (only you can log in).

## How a client pays
1. The client picks a plan on the Pricing page. The button takes them to **Book a Zoom call**, which shows the plan they picked.
2. You have the Zoom call.
3. In your admin page, open **Clients & checkout**. Enter the client's name and email, choose the plan you recommend, and click **Create link**. Then click **Email it to client** (the email is pre-written) or **Copy link**.
4. The client opens the link, confirms the plan, chooses add-ons, signs the agreement by typing their name, and then gets the Stripe pay button.
5. Their signature, plan, and date appear in your admin under **Clients**.

Without a link, checkout.html only says "Checkout opens after your Zoom call." Your Stripe links never appear in the site's code. Each private link expires after 14 days, and you can extend it with **+14 days**.

## 1. Put the site online (Cloudflare Pages, free)
1. Create a new GitHub repo called `project-sarae-site` and upload every file in this folder (keep the `images` folder).
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git**, pick the repo, leave the build settings blank, and click **Deploy**.
3. Your site goes live at `project-sarae-site.pages.dev`. To use ProjectSarae.com, buy it in Cloudflare (about $10–12/year), then go to **Custom domains → Set up a custom domain**.

## 2. Supabase: reviews, admin, analytics, photos, private checkout (free)
1. Create a new Supabase project.
2. Open **SQL Editor → New query**, paste everything from `supabase-setup.sql`, and click **Run**.
   (The admin email in that file is anya.sarae@yahoo.com. Change it first if you'll log in with a different email.)
3. Go to **Authentication → Users → Add user → Create new user**, enter that same email and a strong password, and check **Auto Confirm User**.
4. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up."
5. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `config.js`.

## 3. Zoom booking with Cal.com (free)
1. Sign up at cal.com, then go to **Apps** and install **Zoom**.
2. Create an event type, for example "Free Website Consultation, 30 min," and set the location to **Zoom**.
3. Paste the event link into `bookingLink` in `config.js`.

## 4. Stripe payment links (free to set up)
1. Create a Stripe account and finish verification.
2. Go to **Product catalog** and add:
   - Starter $50/month and $500/year (recurring)
   - Business $80/month and $800/year (recurring)
   - Pro $120/month and $1,200/year (recurring)
   - Setup fee $180 (one-time)
   - Member area add-on $100 (one-time) and Online store add-on $150 (one-time)
3. Go to **Payment Links → New**. For each of the six plan links, add the plan price **plus** the $180 setup fee, so the first payment includes setup. Make one link for each add-on.
4. Paste the links into **Admin → Clients & checkout → Stripe payment links** and click **Save links**. Don't put them in config.js.

## 5. Your admin page
Go to `yoursite.com/admin.html` and sign in.
- **Analytics:** visitors per day, where visitors came from, devices, plan choices, signed agreements, and pay clicks.
- **Clients & checkout:** create private links, see who has signed, and manage your Stripe links.
- **Reviews:** approve, hide, or delete reviews. New reviews stay hidden until you approve them.
- **Photos & About:** upload your photo, edit your About text, and swap portfolio screenshots.

## Before you take clients
- **Contract:** The Service Agreement, Terms, and Privacy Policy are plain-language templates, not legal advice. Have a lawyer review them. Many offer flat-fee contract reviews.
- **Legal name:** The contract names "A'Nya Hill, doing business as Project Sarae." If that's wrong, change `legalName` in `config.js`.
- **Business license / DBA:** Check whether you need to register "Project Sarae" as a trade name in your state and city before taking payments.

After editing `config.js`, upload the new version to GitHub. Cloudflare updates the site within about a minute.
