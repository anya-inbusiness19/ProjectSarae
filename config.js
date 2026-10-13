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
  instagram: "official.projectsarae",          // handle only, no @

  // --- Supabase (reviews, admin login, analytics, photos, private checkout) ---
  // Supabase → Project Settings → API
  supabaseUrl: "https://skxwnhlnzylworsfxluw.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNreHduaGxuenlsd29yc2Z4bHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzAxNTQsImV4cCI6MjEwNzA0NjE1NH0.dRl7RBB4NUwXeTKzOcUufnerjgwwGs03VkzJPC1MszE",

  // --- Zoom booking (Cal.com or Calendly link) ---
  bookingLink: ""                     // e.g. "https://cal.com/anya-sarae/zoom-consultation"
};
