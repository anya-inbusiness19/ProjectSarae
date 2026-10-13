/* =========================================================
   PROJECT SARAE — SITE SETTINGS
   This is the only file you need to edit to connect everything.
   Leave a value as "" until you have it — the site still works.
   Stripe payment links are NOT stored here. You add them in your
   admin page, so they stay hidden from the public.
   ========================================================= */
window.SITE_CONFIG = {
  businessName: "Project Sarae",
  ownerName: "A’Nya Sarae",
  legalName: "A’Nya Hill",            // your legal name, used in the contract
  state: "Alabama",                   // used in the contract (governing law)
  email: "anya.sarae@yahoo.com",
  instagram: "projectsarae",          // handle only, no @

  // --- Supabase (reviews, admin login, analytics, photos, private checkout) ---
  // Supabase → Project Settings → API
  supabaseUrl: "",                    // e.g. "https://abcd1234.supabase.co"
  supabaseAnonKey: "",                // the "anon public" key

  // --- Zoom booking (Cal.com or Calendly link) ---
  bookingLink: ""                     // e.g. "https://cal.com/anya-sarae/zoom-consultation"
};
