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
      def: "Websites for local businesses from $5 · You pay when it’s done" },
    { key: "announce_link", group: "home_top", label: "Announcement bar link text", type: "text", def: "See plans" },
    { key: "hero_photo", group: "home_top", label: "Background photo (top of homepage)", type: "image", def: "images/hero.jpg" },
    { key: "hero_kicker", group: "home_top", label: "Small line above the heading", type: "text", def: "Websites for local businesses · Starting at $5" },
    { key: "hero_title", group: "home_top", label: "Heading", type: "text", def: "A website that books customers for you." },
    { key: "hero_sub", group: "home_top", label: "Subheading (what we do)", type: "textarea",
      def: "You’re busy running your business. We design a website that takes bookings around the clock and helps new customers find you on Google, so you spend less time answering calls and more time doing the work. No ridiculous prices, and you only pay once your site is done." },
    { key: "hero_cta", group: "home_top", label: "Button text", type: "text", def: "See plans from $5" },

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
    { key: "closer_title", group: "home_end", label: "Closing heading", type: "text", def: "Fair prices. Real help." },
    { key: "closer_text", group: "home_end", label: "Closing text", type: "textarea",
      def: "Our goal is simple: help local businesses save time and make more money, without charging a ridiculous amount. Pick a plan, answer a few quick questions, and pay once your site is done." },

    // Pricing page
    { key: "pricing_eyebrow", group: "pricing", label: "Small line above the heading", type: "text", def: "Simple, honest pricing" },
    { key: "pricing_title", group: "pricing", label: "Heading", type: "text", def: "Pricing." },
    { key: "pricing_sub", group: "pricing", label: "Description", type: "textarea",
      def: "One price, paid once, and only after your site is done. Pick the plan that fits how many pages you need." },
    { key: "addons_title", group: "pricing", label: "Add-ons heading", type: "text", def: "Add-on services." },
    { key: "addons_sub", group: "pricing", label: "Add-ons description", type: "textarea",
      def: "Add any of these to your plan. We’ll choose the right ones together on your Zoom meeting." },

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
    "Custom website design", "Online booking", "Found on Google", "Mobile-friendly",
    "Contact forms & maps", "Photo galleries", "Online payments", "Starting at $5",
    "Pay when it’s done"
  ],

  /* ---------- Benefits beside the laptop demo ---------- */
  benefits: [
    { title: "Bookings while you work", text: "Customers pick a time and book themselves, day or night, so you stop stopping work to answer the phone." },
    { title: "Found on Google", text: "Your site is set up so people searching nearby can find you before a competitor." },
    { title: "Designed around your business", text: "Your colors, photos, services, and prices. Never a template that looks like everyone else’s." },
    { title: "Pay once, when it’s done", text: "No deposit and no monthly bill. You see your finished site first, then pay." },
    { title: "Prices that make sense", text: "From $5. We’d rather help a business grow than charge a ridiculous amount." }
  ],

  /* ---------- Live demos shown in the laptop ---------- */
  demos: [
    { name: "Your Salon — Book Online", label: "Hair salon · Business plan",
      url: "https://anya-inbusiness19.github.io/salon-demo/",
      text: "A full salon site with stylist menus, step-by-step online booking, a live chat helper, and smooth animations." }
  ],

  /* ---------- Pricing ---------- */
  one_time: true,   /* true = plans are a one-time price, paid when the site is done */
  setup_fee: 0,
  setup_fee_text: "A one-time fee that covers designing, building, and launching your site. Paid once at checkout, then just your monthly plan.",

  plans: [
    { key: "starter", name: "Starter", monthly: 5, yearly: 5, pages: "1–3 pages", badge: "",
      features: ["1–3 pages", "Online booking", "FAQ section", "Services & prices", "Photo gallery & reviews", "Contact form & Google Maps", "Mobile-friendly design"] },
    { key: "business", name: "Business", monthly: 10, yearly: 10, pages: "4–6 pages", badge: "Most popular",
      features: ["4–6 pages", "Everything in Starter", "SEO setup (show up on Google)", "Google Business Profile setup"] },
    { key: "pro", name: "Pro", monthly: 15, yearly: 15, pages: "7–10 pages", badge: "",
      features: ["7–10 pages", "Everything in Business", "Online payments", "Visitor analytics", "Priority build"] }
  ],

  /* unit: "one-time", "month", or "setup" (one-time setup) */
  addons: [
    { key: "addon_gbp", name: "Google Business Profile setup", text: "Show up on Google Maps with the right hours, photos, and services.", price: 50, unit: "one-time" },
    { key: "addon_reminders", name: "Appointment reminders", text: "Automatic email reminders before every appointment, so fewer no-shows.", price: 40, unit: "setup" },
    { key: "addon_followups", name: "Request review & follow-ups", text: "Instant replies to every request, a summary for you, and follow-up emails for anyone who doesn’t book.", price: 25, unit: "month" },
    { key: "addon_winback", name: "Win back past clients", text: "“We miss you” emails with your offer for clients who haven’t been back.", price: 25, unit: "month" },
    { key: "addon_reports", name: "Weekly reports", text: "A short email every week with your requests, bookings, follow-ups, and reviews.", price: 10, unit: "month" },
    { key: "addonAccounts", name: "Customer accounts / member area", text: "A private portal and member access for your customers.", price: 100, unit: "one-time" },
    { key: "addonStore", name: "Online store", text: "Products, options, and a checkout cart.", price: 150, unit: "one-time" }
  ]
};
