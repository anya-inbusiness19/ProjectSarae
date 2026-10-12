/* =========================================================
   PROJECT SARAE — SITE SETTINGS
   This is the only file you need to edit to connect everything.
   Leave a value as "" until you have it — the site still works.
   ========================================================= */
window.SITE_CONFIG = {
  businessName: "Project Sarae",
  ownerName: "A’Nya Sarae",
  email: "anya.sarae@yahoo.com",
  instagram: "projectsarae",          // handle only, no @

  // --- Supabase (reviews, admin login, analytics, photos) ---
  // Supabase → Project Settings → API
  supabaseUrl: "",                    // e.g. "https://abcd1234.supabase.co"
  supabaseAnonKey: "",                // the "anon public" key

  // --- Zoom booking (Cal.com or Calendly link) ---
  bookingLink: "",                    // e.g. "https://cal.com/anya-sarae/zoom-consultation"

  // --- Stripe Payment Links (Stripe → Payment Links → copy link) ---
  stripe: {
    starterMonthly:  "",
    businessMonthly: "",
    proMonthly:      "",
    starterYearly:   "",
    businessYearly:  "",
    proYearly:       "",
    addonAccounts:   "",
    addonStore:      ""
  }
};
