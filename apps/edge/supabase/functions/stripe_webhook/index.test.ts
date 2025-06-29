import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const EDGE_URL = "http://localhost:54321/functions/v1/stripe_webhook";

// Helper function to create unique test data
function createTestEvent(type: string, customerId: string, subscriptionId: string, planId: string = "pro") {
  return {
    id: `evt_test_${type}_${Date.now()}`,
    type: `customer.subscription.${type}`,
    data: {
      object: {
        id: subscriptionId,
        customer: customerId,
        status: type === "deleted" ? "canceled" : "active",
        metadata: {
          plan_id: planId
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
        cancel_at_period_end: type === "deleted"
      }
    }
  };
}

Deno.test("stripe_webhook: subscription created", async () => {
  // Setup: create a test user and customer
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a test user
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-stripe-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;
  const customerId = `cus_test_${Date.now()}`;
  const subscriptionId = `sub_test_${Date.now()}`;
  
  // Create a test customer record
  const { error: customerError } = await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      stripe_customer_id: customerId,
      email: user.user.email
    });
  
  if (customerError) {
    console.error("Error creating customer:", customerError);
    throw customerError;
  }

  // Call the webhook
  const event = createTestEvent("created", customerId, subscriptionId, "pro");
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "stripe-signature": "test_signature"
    },
    body: JSON.stringify(event),
  });
  
  console.log("Subscription created response status:", resp.status);
  const data = await resp.json();
  console.log("Subscription created response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Webhook processed successfully");
  assertEquals(data.event_type, "customer.subscription.created");
  assertEquals(data.subscription_id, subscriptionId);
  
  // Verify subscription was created in database
  const { data: subscription, error: subError } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  assertEquals(subError, null);
  assertEquals(subscription?.status, 'active');
  assertEquals(subscription?.plan_id, 'pro');
  assertEquals(subscription?.user_id, userId);
});

Deno.test("stripe_webhook: subscription updated", async () => {
  // Setup: create a test user and customer
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a test user
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-stripe-update-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;
  const customerId = `cus_test_update_${Date.now()}`;
  const subscriptionId = `sub_test_update_${Date.now()}`;
  
  // Create a test customer record
  const { error: customerError } = await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      stripe_customer_id: customerId,
      email: user.user.email
    });
  
  if (customerError) {
    console.error("Error creating customer:", customerError);
    throw customerError;
  }

  // Call the webhook
  const event = createTestEvent("updated", customerId, subscriptionId, "starter");
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "stripe-signature": "test_signature"
    },
    body: JSON.stringify(event),
  });
  
  console.log("Subscription updated response status:", resp.status);
  const data = await resp.json();
  console.log("Subscription updated response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Webhook processed successfully");
  assertEquals(data.event_type, "customer.subscription.updated");
  assertEquals(data.subscription_id, subscriptionId);
  
  // Verify subscription was updated in database
  const { data: subscription, error: subError } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  assertEquals(subError, null);
  assertEquals(subscription?.status, 'active');
  assertEquals(subscription?.plan_id, 'starter'); // Should be updated to starter
  assertEquals(subscription?.user_id, userId);
});

Deno.test("stripe_webhook: subscription deleted", async () => {
  // Setup: create a test user and customer
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a test user
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test-stripe-delete-${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  
  if (userError) {
    console.error("Error creating user:", userError);
    throw userError;
  }
  
  const userId = user.user.id;
  const customerId = `cus_test_delete_${Date.now()}`;
  const subscriptionId = `sub_test_delete_${Date.now()}`;
  
  // Create a test customer record
  const { error: customerError } = await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      stripe_customer_id: customerId,
      email: user.user.email
    });
  
  if (customerError) {
    console.error("Error creating customer:", customerError);
    throw customerError;
  }

  // Create an existing subscription first
  const { error: subError } = await supabase
    .from('stripe_subscriptions')
    .insert({
      stripe_subscription_id: subscriptionId,
      user_id: userId,
      stripe_customer_id: customerId,
      status: 'active',
      plan_id: 'pro',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false
    });
  
  if (subError) {
    console.error("Error creating subscription:", subError);
    throw subError;
  }

  // Call the webhook
  const event = createTestEvent("deleted", customerId, subscriptionId, "pro");
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "stripe-signature": "test_signature"
    },
    body: JSON.stringify(event),
  });
  
  console.log("Subscription deleted response status:", resp.status);
  const data = await resp.json();
  console.log("Subscription deleted response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Webhook processed successfully");
  assertEquals(data.event_type, "customer.subscription.deleted");
  assertEquals(data.subscription_id, subscriptionId);
  
  // Verify subscription was marked as canceled in database
  const { data: subscription, error: subQueryError } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  assertEquals(subQueryError, null);
  assertEquals(subscription?.status, 'canceled');
});

Deno.test("stripe_webhook: ignores non-subscription events", async () => {
  const nonSubscriptionEvent = {
    id: "evt_test_other",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_test_123",
        amount: 1000
      }
    }
  };

  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "stripe-signature": "test_signature"
    },
    body: JSON.stringify(nonSubscriptionEvent),
  });
  
  console.log("Non-subscription event response status:", resp.status);
  const data = await resp.json();
  console.log("Non-subscription event response data:", data);
  
  assertEquals(resp.status, 200);
  assertEquals(data.message, "Ignored non-subscription event");
});

Deno.test("stripe_webhook: missing signature returns 400", async () => {
  const event = createTestEvent("created", "cus_test_400", "sub_test_400");
  
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event),
  });
  
  assertEquals(resp.status, 400);
  const data = await resp.text();
  assertEquals(data, "Missing Stripe signature");
}); 