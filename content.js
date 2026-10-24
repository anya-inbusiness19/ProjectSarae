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
    { key: "hero_title", group: "home_top", label: "Heading", type: "text", def: "Your business. Beautifully online." },
    { key: "hero_sub", group: "home_top", label: "Subheading (what we do)", type: "textarea",
      def: "We design, launch, and maintain professional websites for local businesses, with online booking, payments, and follow-ups built in. You never touch anything technical." },
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
      def: "Pick the plan that fits, then add only the services you need. Book a free Zoom meeting first, and check out privately after we talk." },
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
    "Website design", "Google Business Profile setup", "Online booking", "Appointment reminders",
    "Online payments", "Follow-up emails", "Win back past clients",
    "Social media scheduling", "Weekly reports", "Online store", "Member area"
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
    { key: "starter", name: "Starter", monthly: 50, yearly: 500, badge: "",
      features: ["Free projectsarae.com web address", "Fast, reliable hosting", "Contact form & Google Maps", "1 update per month"] },
    { key: "business", name: "Business", monthly: 80, yearly: 800, badge: "Most popular",
      features: ["Your own domain (registered in your name)", "Online payments", "Booking and scheduling", "Live customer chat", "Up to 3 updates per month"] },
    { key: "pro", name: "Pro", monthly: 120, yearly: 1200, badge: "",
      features: ["Everything in Business", "Customer sign-ups & accounts", "Sales and money dashboard", "Up to 8 updates per month", "Same-day priority support"] }
  ],

  /* unit: "one-time", "month", or "setup" (one-time setup) */
  addons: [
    { key: "addon_gbp", name: "Google Business Profile setup", text: "Show up on Google Maps with the right hours, photos, and services.", price: 50, unit: "one-time" },
    { key: "addon_reminders", name: "Appointment reminders", text: "Automatic email reminders before every appointment, so fewer no-shows.", price: 40, unit: "setup" },
    { key: "addon_followups", name: "Request review & follow-ups", text: "Instant replies to every request, a summary for you, and follow-up emails for anyone who doesn’t book.", price: 25, unit: "month" },
    { key: "addon_winback", name: "Win back past clients", text: "“We miss you” emails with your offer for clients who haven’t been back.", price: 25, unit: "month" },
    { key: "addon_social", name: "Social media scheduling", text: "8 posts a month. You send photos; we write captions and schedule them.", price: 40, unit: "month" },
    { key: "addon_reports", name: "Weekly reports", text: "A short email every week with your requests, bookings, follow-ups, and reviews.", price: 10, unit: "month" },
    { key: "addonAccounts", name: "Customer accounts / member area", text: "A private portal and member access for your customers.", price: 100, unit: "one-time" },
    { key: "addonStore", name: "Online store", text: "Products, options, and a checkout cart.", price: 150, unit: "one-time" }
  ]
};
