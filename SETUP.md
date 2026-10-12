# Project Sarae website — free setup guide

Everything here uses free plans. Stripe only takes its normal fee (about 2.9% + 30¢) when a client actually pays you.

## 1. Put the site online (Cloudflare Pages, free)
1. Create a new GitHub repo called `project-sarae-site` and upload every file in this folder (keep the `images` folder).
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git**, pick the repo, leave the build settings blank, and click **Deploy**.
3. Your site is now live at `project-sarae-site.pages.dev`. To use ProjectSarae.com, buy it in Cloudflare (about $10–12/year), then go to **Custom domains → Set up a custom domain**.

## 2. Supabase: reviews, admin login, analytics, photos (free)
1. Create a new Supabase project.
2. Open **SQL Editor → New query**, paste everything from `supabase-setup.sql`, and click **Run**.
   (The admin email in that file is anya.sarae@yahoo.com. Change it first if you'll log in with a different email.)
3. Go to **Authentication → Users → Add user → Create new user**, enter that same email and a strong password, and check **Auto Confirm User**.
4. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up," so nobody else can make an account.
5. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `config.js`.

## 3. Zoom booking with Cal.com (free)
1. Sign up at cal.com, then go to **Apps** and install **Zoom**.
2. Create an event type, for example "Free Website Consultation, 30 min," and set the location to **Zoom**.
3. Copy the event link (like `https://cal.com/your-name/consultation`) into `bookingLink` in `config.js`.
   Each booking creates a Zoom link automatically and emails it to you and the client.

## 4. Stripe payments (free to set up)
1. Create a Stripe account and finish verification.
2. Go to **Product catalog** and add products:
   - Starter $50/month and $500/year (recurring)
   - Business $80/month and $800/year (recurring)
   - Pro $120/month and $1,200/year (recurring)
   - Setup fee $180 (one-time)
   - Member Area add-on $100 (one-time) and Online Store add-on $150 (one-time)
3. Go to **Payment Links → New**. For each plan link, add the plan price **plus** the $180 setup fee, so the first payment includes setup.
4. Paste each link into the matching spot in `config.js`.

Any button without a link sends visitors to the booking section instead, so the site works even before Stripe is ready.

## 5. Using your admin page
Go to `yoursite.com/admin.html` and sign in.
- **Analytics:** visitors per day, where visitors came from, devices, and which buttons they clicked.
- **Reviews:** approve, hide, or delete reviews. New reviews stay hidden until you approve them.
- **Photos & About:** upload your photo, edit your About text, and swap portfolio screenshots. Changes go live immediately.

After editing `config.js`, upload the new version to GitHub. Cloudflare will update the site automatically within about a minute.
