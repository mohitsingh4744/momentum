import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    id: string
    email: string
    created_at: string
    [key: string]: any
  }
  old_record: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const payload: AuthWebhookPayload = await req.json()
    
    // Only process INSERT events on auth.users table
    if (payload.type !== 'INSERT' || payload.table !== 'users' || payload.schema !== 'auth') {
      return new Response(
        JSON.stringify({ message: 'Ignored non-INSERT event or wrong table' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const { id: userId, email, created_at } = payload.record

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate the first day of the current month
    const now = new Date(created_at)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStartISO = monthStart.toISOString()

    // Insert default quota row for the new user
    const { data, error } = await supabase
      .from('gpt_token_usage')
      .insert({
        user_id: userId,
        month_start: monthStartISO,
        tokens_used: 0,
        tokens_limit: 100000, // Default monthly limit
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error inserting gpt_token_usage:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create user quota' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log(`Created default quota for user ${userId} (${email})`)

    return new Response(
      JSON.stringify({ 
        message: 'User quota created successfully',
        user_id: userId,
        quota: data[0]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 