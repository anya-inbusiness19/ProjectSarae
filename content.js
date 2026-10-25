/* =========================================================
   PROJECT SARAE — DEFAULT SITE CONTENT
   Every text, photo, price and add-on on the site starts with
   the defaults below. You change them in your admin page
   (admin.html → Site content / Pricing & add-ons). Anything you
   save there replaces the default; clearing a field brings the
   default back. You never need to edit this file.
   ========================================================= */
window.SITE_CONTENT = {

  /* ---------- Simple text + photo fields ---------- */
  fields: [
    // Homepage: top of the page
    { key: "announce_text", group: "home_top", label: "Announcement bar (top of homepage)", type: "text",
      def: "Now booking new websites for this season · Free 30-minute Zoom consultation" },
    { key: "announce_link", group: "home_top", label: "Announcement bar link text", type: "text", def: "Book now" },
    { key: "hero_photo", group: "home_top", label: "Background photo (top of homepage)", type: "image", def: "images/hero.jpg" },
    { key: "hero_kicker", group: "home_top", label: "Small line above the heading", type: "text", def: "Project Sarae Web Design" },
    { key: "hero_title", group: "home_top", label: "Heading", type: "text", def: "More clients. Less work." },
    { key: "hero_sub", group: "home_top", label: "Subheading (what we do)", type: "textarea",
      def: "AI-powered websites, lead generation, ads, and marketing automation for local businesses. We bring you more clients and follow up for you, so you never touch anything technical." },
    { key: "hero_cta", group: "home_top", label: "Button text", type: "text", def: "Book a Zoom meeting" },

    // Homepage: live demo
    { key: "demo_eyebrow", group: "home_demo", label: "Small line above the demo heading", type: "text", def: "Live demo" },
    { key: "demo_title", group: "home_demo", label: "Demo heading", type: "text", def: "See what we can build for you." },
    { key: "demo_sub", group: "home_demo", label: "Demo description", type: "textarea",
      def: "These are real, working sites. Click the laptop screen to scroll, browse, and even try booking an appointment." },
    { key: "benefits_title", group: "home_demo", label: "Side panel heading", type: "text", def: "When you work with us" },

    // Homepage: reviews + closing
    { key: "reviews_title", group: "home_end", label: "Reviews heading", type: "text", def: "What clients say." },
    { key: "reviews_sub", group: "home_end", label: "Reviews description", type: "text",
      def: "Honest feedback from the businesses we’ve worked with." },
    { key: "closer_title", group: "home_end", label: "Closing heading", type: "text", def: "Let’s build yours." },
    { key: "closer_text", group: "home_end", label: "Closing text", type: "textarea",
      def: "Book a free Zoom meeting. We’ll plan your site together, and your first draft follows soon after you sign up." },

    // Pricing page
    { key: "pricing_eyebrow", group: "pricing", label: "Small line above the heading", type: "text", def: "Transparent plans" },
    { key: "pricing_title", group: "pricing", label: "Heading", type: "text", def: "Pricing." },
    { key: "pricing_sub", group: "pricing", label: "Description", type: "textarea",
      def: "Pick the growth plan that fits, or start with just a website. Book a free Zoom meeting first, and check out privately after we talk." },
    { key: "addons_title", group: "pricing", label: "Add-ons heading", type: "text", def: "Website packages." },
    { key: "addons_sub", group: "pricing", label: "Add-ons description", type: "textarea",
      def: "Just need a website? Pick the AI-powered site, or go fully custom. Either one can be added to a plan too." },

    // Booking page
    { key: "book_eyebrow", group: "book", label: "Small line above the heading", type: "text", def: "Free consultation" },
    { key: "book_title", group: "book", label: "Heading", type: "text", def: "Book a Zoom meeting." },
    { key: "book_sub", group: "book", label: "Description", type: "textarea",
      def: "Pick a time that works for you. We’ll talk about your business, what your site needs, and which plan fits. No pressure." }
  ],

  groups: {
    home_top: "Homepage: top section",
    home_demo: "Homepage: live demo",
    home_end: "Homepage: reviews & closing",
    pricing: "Pricing page",
    book: "Booking page"
  },

  /* ---------- Sliding services bar (under the top section) ---------- */
  ticker: [
    "AI-powered websites", "AI chatbot & employee", "Automation setup", "Referral programs",
    "Local partnerships", "Google reviews", "Lead generation", "AI follow-up",
    "Facebook ads", "AI UGC videos", "Marketing automation", "Google Ads", "Local Services Ads"
  ],

  /* ---------- Benefits beside the laptop demo ---------- */
  benefits: [
    { title: "Designed around your business", text: "A custom layout with your colors, photos, services, and prices. Never a template that looks like everyone else." },
    { title: "Clients book while you work", text: "Online booking, reminders, and payments run around the clock, so fewer missed calls and no-shows." },
    { title: "Found on Google", text: "Set up for local search and Google Maps, so nearby customers find you before a competitor." },
    { title: "Changes in one text", text: "New hours, prices, or photos? Send them over and we update your site for you." },
    { title: "One simple monthly price", text: "Hosting, updates, and support are included, and your domain is registered in your name." }
  ],

  /* ---------- Live demos shown in the laptop ---------- */
  demos: [
    { name: "Your Salon — Book Online", label: "Hair salon · Business plan",
      url: "https://anya-inbusiness19.github.io/salon-demo/",
      text: "A full salon site with stylist menus, step-by-step online booking, a live chat helper, and smooth animations." }
  ],

  /* ---------- Pricing ---------- */
  setup_fee: 180,
  setup_fee_text: "A one-time fee that covers designing, building, and launching your site. Paid once at checkout, then just your monthly plan.",

  plans: [
    { key: "starter", name: "Essentials", monthly: 500, yearly: 5000, badge: "",
      features: ["AI-powered website", "Website chatbot & AI employee that answers clients 24/7", "Basic automation setup (booking, reminders, follow-ups)", "Referral program", "Local partnership outreach", "Review collection on Google"] },
    { key: "business", name: "Growth", monthly: 1500, yearly: 15000, badge: "Most popular",
      features: ["Starting price, final quote on our Zoom call", "Everything in Essentials", "Lead generation with AI follow-up", "Facebook ads with AI-made UGC videos", "Complete marketing automation"] },
    { key: "pro", name: "Premium", monthly: 2500, yearly: 25000, badge: "",
      features: ["Starting price, final quote on our Zoom call", "Everything in Growth", "Google Ads management", "Google Local Services Ads (LSA)"] }
  ],

  /* unit: "one-time", "month", or "setup" (one-time setup) */
  addons: [
    { key: "addonAiWebsite", name: "AI-powered website", text: "A fast, professional site built with AI, with hosting, updates, and support included.", price: 150, unit: "month" },
    { key: "addonCustomWebsite", name: "Custom-built website", text: "A fully custom site designed and developed from scratch around your business.", price: 5000, unit: "one-time" }
  ]
};
