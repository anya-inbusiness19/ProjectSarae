// Supabase Edge Function: stripe-webhook
// Stripe calls this when someone finishes paying. It marks their order as paid,
// which makes the "order-notify" function email you ("You made a sale") and the customer.
// In Supabase, turn OFF "Verify JWT" for this function (Stripe can't send a Supabase login).

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, Stripe.createSubtleCryptoProvider());
  } catch (err) {
    return new Response(`Bad signature: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.client_reference_id) {
      const { error } = await db.from("orders")
        .update({ paid: true, paid_at: new Date().toISOString(), stripe_customer: (s.customer as string) ?? null })
        .eq("id", s.client_reference_id).eq("paid", false);
      if (error) return new Response(error.message, { status: 500 });
    }
  }
  return new Response("ok");
});
