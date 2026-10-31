# Admin tools setup: Sales, Outreach, Content Studio (all free)

Your admin page now has three new tabs. Each one shows a "not connected yet" note until you finish its step below, so you can do these in any order. **Outreach works as soon as you finish step 1.**

Your secret keys go into Supabase (step 2), never into the site's code.

---

## 1. Add the new tables (2 minutes)
1. Supabase → **SQL Editor → New query**.
2. Paste everything from `supabase-tools-setup.sql` and click **Run**.

This adds your outreach tracker, saved scripts, private settings, and a `content-media` folder for videos you post.

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

## 4. Content Studio, AI scripts: Gemini (3 minutes, free)
1. Go to **aistudio.google.com** and sign in with your Google account.
2. Click **Get API key → Create API key**.
3. In Supabase Secrets, add `GEMINI_API_KEY` = that key.

The free tier covers a few scripts a day. If Google renames its model, add a secret `GEMINI_MODEL` with the new name.

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

## How to use it

**Sales:** revenue, money after fees, monthly recurring, active clients, Stripe balance, and recent payments.

**Outreach:**
- Add each business you find.
- Click **Email** to open a pre-filled message in your own email. Sending one at a time from your real inbox is what gets replies.
- After you email someone, the business moves to **Contacted** with a follow-up date 3 days later.
- Edit the template once and replace `[Your mailing address here]` with a real mailing address. A PO box is fine. US law (CAN-SPAM) requires it in cold emails, plus the opt-out line.
- If someone says no thanks, set them to **Not now** and don't email them again.

**Content Studio:**
1. Type a topic and click **Write it**. You get 3 hooks, a character description, and scenes with copy-paste video prompts, plus a caption.
2. Make each scene in Kling, Seedance, or Pika (free plans). Paste the character description every time so the character looks the same.
3. Put the clips together in CapCut. Export as 1080p, 9:16, .mp4, under 50 MB.
4. Upload the video, click **Use this caption for posting**, and then **Post to Instagram**.

Use original characters only. Don't use Pixar, Disney, or other studio characters.
