// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://esm.sh/@supabase/functions-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata: {
    plan_id?: string;
  };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

interface StripeCustomer {
  id: string;
  metadata: {
    user_id?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400, headers: corsHeaders });
    }

    // Verify the webhook signature
    let event: StripeEvent;
    try {
      // In a real implementation, you would use Stripe's verify function
      // For now, we'll parse the JSON directly (in production, use proper verification)
      event = JSON.parse(body);
    } catch (err) {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    // Only process subscription events
    if (!event.type.startsWith('customer.subscription.')) {
      return new Response(
        JSON.stringify({ message: 'Ignored non-subscription event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const subscription = event.data.object as StripeSubscription;

    // Get the customer to find the user_id
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (customerError || !customerData) {
      console.error('Customer not found:', subscription.customer);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const userId = customerData.user_id;
    const planId = subscription.metadata?.plan_id || 'starter'; // Default to starter if not specified

    // Determine the role based on the plan
    const roleMap: Record<string, string> = {
      'free': 'free',
      'starter': 'starter',
      'pro': 'pro'
    };
    const role = roleMap[planId] || 'free';

    // Convert timestamps to ISO strings
    const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        // Upsert the subscription
        const { error: upsertError } = await supabase
          .from('stripe_subscriptions')
          .upsert({
            stripe_subscription_id: subscription.id,
            user_id: userId,
            stripe_customer_id: subscription.customer,
            status: subscription.status,
            plan_id: planId,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'stripe_subscription_id'
          });

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError);
          return new Response(
            JSON.stringify({ error: 'Failed to update subscription' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Update user role if subscription is active
        if (subscription.status === 'active') {
          const { error: roleError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { role }
          });

          if (roleError) {
            console.error('Error updating user role:', roleError);
            // Don't fail the webhook for role update errors
          }
        }
        break;

      case 'customer.subscription.deleted':
        // Mark subscription as canceled
        const { error: deleteError } = await supabase
          .from('stripe_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (deleteError) {
          console.error('Error updating subscription status:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to update subscription status' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Downgrade user to free tier
        const { error: downgradeError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: 'free' }
        });

        if (downgradeError) {
          console.error('Error downgrading user:', downgradeError);
          // Don't fail the webhook for role update errors
        }
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    console.log(`Processed ${event.type} for subscription ${subscription.id}`);

    return new Response(
      JSON.stringify({ 
        message: 'Webhook processed successfully',
        event_type: event.type,
        subscription_id: subscription.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 