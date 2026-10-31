# Admin tools setup: Sales, Outreach, Content Studio (all free)

Your admin page now has three new tabs. Each one shows a "not connected yet" note until you finish its step below, so you can do these in any order. **Outreach works as soon as you finish step 1.**

Your secret keys go into Supabase (step 2), never into the site's code.

---

## 1. Add the new tables (2 minutes)
1. Supabase → **SQL Editor → New query**.
2. Paste everything from `supabase-tools-setup.sql` and click **Run**.

This adds your outreach tracker, saved post drafts, private settings, and a `content-media` folder for videos you post.

## 2. Turn on the admin API (5 minutes)
This small function holds your keys and only answers your admin login.
1. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it exactly `admin-api`.
3. Delete the sample code, paste everything from `supabase/functions/admin-api/index.ts`, and click **Deploy**.
4. Leave **Verify JWT** turned on.

Keys from the steps below go in **Edge Functions → Secrets → Add new secret**.

## 3. Sales tab: Stripe (5 minutes)
Use a **read-only restricted key**, so the key can't move money even if it ever leaked.
1. Stripe → **Developers → API keys → Create restricted key** (or "+ Create restricted key").
2. Name it `Project Sarae admin`. Set these to **Read**: Charges, Subscriptions, Balance, Balance transactions (sometimes listed under "Balance"). Leave everything else as **None**.
3. Copy the key (starts with `rk_live_`).
4. In Supabase Secrets, add `STRIPE_SECRET_KEY` = that key.

## 4. Content Studio, AI photo posts: Gemini (3 minutes, free)
1. Go to **aistudio.google.com** and sign in with your Google account.
2. Click **Get API key → Create API key**.
3. In Supabase Secrets, add `GEMINI_API_KEY` = that key.

The free tier covers a few posts a day. If Google renames its model, add a secret `GEMINI_MODEL` with the new name.

## 5. Content Studio, posting: Instagram (15–20 minutes)
1. In the Instagram app: **Settings → Account type and tools → Switch to professional account → Creator or Business**, for @official.projectsarae.
2. Go to **developers.facebook.com → My Apps → Create app**. Pick the use case for managing **Instagram** content, using "API setup with Instagram login".
3. In the app's Instagram setup page, **add your Instagram account** and **generate an access token**. Allow the content publish permission.
4. Copy the **Instagram user ID** and the **access token** it shows.
5. In Supabase Secrets, add:
   - `IG_USER_ID` = the Instagram user ID
   - `IG_ACCESS_TOKEN` = the token
   - `META_GRAPH_HOST` = `graph.instagram.com`

You don't need Meta's app review, because you're only posting to your own account.

**The token lasts about 60 days.** When posting says the token expired, generate a new one in the same place and replace `IG_ACCESS_TOKEN`.

(If you connected through Facebook Login with a Facebook Page instead, leave out `META_GRAPH_HOST`.)

---

## 6. Content Studio, free AI photos: Cloudflare (5 minutes, free)
Puts a real-looking AI photo behind every slide. Cloudflare's free plan covers about 150 photos a day (resets at 5pm Pacific).
1. Go to **dash.cloudflare.com** and sign in (the same account you use for your Brevo form is fine).
2. **Account ID:** on the account home page, click the **⋯** next to your account name → **Copy account ID**. (It's also shown on **Workers & Pages** → right side.)
3. **Token:** profile icon (top right) → **My Profile** → **API Tokens** → **Create Token** → find the **Workers AI** template → **Use template** → **Continue to summary** → **Create Token** → copy it.
4. In Supabase Secrets, add:
   - `CF_ACCOUNT_ID` = the account ID
   - `CF_AI_TOKEN` = the token
5. Redeploy `admin-api` with the latest `supabase/functions/admin-api/index.ts`.

**TikTok:** pick "TikTok photo mode (9:16)", make the post, then **Download all images**, send them to your phone, and in TikTok tap **+ → Photo** and pick them in order. TikTok only lets apps it has reviewed post photo carousels for you, so this last step is by hand. "Make an Instagram (4:5) version" redraws the same post for Instagram, and that one can post straight from here.

## How to use it

**Sales:** revenue, money after fees, monthly recurring, active clients, Stripe balance, and recent payments.

**Outreach:**
- Add each business you find.
- Click **Email** to open a pre-filled message in your own email. Sending one at a time from your real inbox is what gets replies.
- After you email someone, the business moves to **Contacted** with a follow-up date 3 days later.
- Edit the template once and replace `[Your mailing address here]` with a real mailing address. A PO box is fine. US law (CAN-SPAM) requires it in cold emails, plus the opt-out line.
- If someone says no thanks, set them to **Not now** and don't email them again.

**Content Studio (viral photo posts):**
1. Type a topic, pick a format (tips, mistakes, myth vs. fact, before/after, signs, POV, or one bold statement), and click **Make my post**.
2. The AI writes 6–8 slides plus 3 extra cover hooks, a caption, hashtags, and alt text. Your admin page draws each slide as a branded 1080×1350 image (royal blue and cream, Playfair Display).
3. Change any words under a slide and the image redraws right away. Click **Use** on another hook to swap the cover. You can add a real photo behind the cover slide.
4. Click **Post to Instagram** to post every slide as one carousel, or **Download all images** to post them yourself on Instagram or TikTok (TikTok photo mode works well with these).

What makes these spread: a cover that stops the scroll, one idea per slide, and a last slide that asks people to save it or send it to a business-owner friend. Saves and shares count for more on Instagram than likes do.

For a cover photo, use your own photos or ones you have permission to use.
