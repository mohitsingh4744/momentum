// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TODO: Replace with your actual OpenAI API key in production
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "sk-test";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_MONTHLY_LIMIT = 100_000;

function getMonthStartISO(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { prompt, max_tokens, user_id } = body;
  if (!prompt || !max_tokens || !user_id) {
    return new Response("Missing required fields", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const monthStartISO = getMonthStartISO(now);

  // 1. Check quota
  let { data: usageRows, error: usageError } = await supabase
    .from('gpt_token_usage')
    .select('*')
    .eq('user_id', user_id)
    .eq('month_start', monthStartISO)
    .maybeSingle();

  if (usageError) {
    return new Response(JSON.stringify({ error: 'Failed to check quota', details: usageError }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let usage = usageRows;
  if (!usage) {
    // Create a new quota row for this user/month
    const { data: newUsage, error: insertError } = await supabase
      .from('gpt_token_usage')
      .insert({
        user_id,
        month_start: monthStartISO,
        tokens_used: 0,
        tokens_limit: DEFAULT_MONTHLY_LIMIT,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .maybeSingle();
    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to create quota row', details: insertError }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    usage = newUsage;
  }

  if (usage.tokens_used + max_tokens > usage.tokens_limit) {
    return new Response(JSON.stringify({ error: 'Over monthly token limit' }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  // 2. Proxy to OpenAI
  const openaiPayload = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens,
  };
  let openaiResp, openaiData;
  try {
    openaiResp = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });
    openaiData = await openaiResp.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to contact OpenAI', details: String(err) }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  // Defensive: check OpenAI error
  if (!openaiResp.ok) {
    return new Response(JSON.stringify({ error: 'OpenAI error', details: openaiData }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  // 3. Record usage in DB (atomic)
  const tokensUsed = openaiData.usage?.total_tokens ?? max_tokens;
  const { error: updateError } = await supabase
    .from('gpt_token_usage')
    .update({
      tokens_used: usage.tokens_used + tokensUsed,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user_id)
    .eq('month_start', monthStartISO);
  if (updateError) {
    return new Response(JSON.stringify({ error: 'Failed to record usage', details: updateError }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // 4. Return OpenAI response
  return new Response(JSON.stringify({
    ok: true,
    openai: openaiData,
    tokens_used: tokensUsed,
    quota: {
      used: usage.tokens_used + tokensUsed,
      limit: usage.tokens_limit,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}); 