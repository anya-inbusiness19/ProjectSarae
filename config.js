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

  // --- Brevo "Not ready to book yet?" form (Brevo → Contacts → Forms → Share/Embed → form action URL) ---
  brevoFormUrl: "https://cf8937b4.sibforms.com/serve/MUIFANGeBrLAHlKVtfGmEx7WtBrZJm8ozwyC5_xJtQZZcJ0orJDnP64g46fXp65XWiI47vIvf_YZ66LVja1nsERGKvfLkZQwe_ig0g2BrAatFuQ7jjZHZMK3TyOQZ-jLz7Hc42Z65sYYbOTqXTH75Eaqiqe_8pw7VIxKcEN23sALkRAT9zen-Ysc1VdxEnPU7WDKtFJOU4nCAH-gZA==",

  // --- Zoom booking (Cal.com or Calendly link) ---
  bookingLink: "https://cal.com/projectsarae/30min"   // e.g. "https://cal.com/anya-sarae/zoom-consultation"
};
