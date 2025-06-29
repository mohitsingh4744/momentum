-- Create stripe_customers table to link Stripe customers to our users
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_subscriptions table
CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'unpaid', etc.
  plan_id TEXT NOT NULL, -- 'free', 'starter', 'pro'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for stripe_customers table
CREATE POLICY "Users can view their own customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (for webhook)
CREATE POLICY "Service role can manage customers" ON stripe_customers
    FOR ALL USING (true);

-- Create policies for stripe_subscriptions table
CREATE POLICY "Users can view their own subscriptions" ON stripe_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (for webhook)
CREATE POLICY "Service role can manage subscriptions" ON stripe_subscriptions
    FOR ALL USING (true);

-- Create indexes for efficient queries
CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX idx_stripe_subscriptions_user_id ON stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subscriptions_stripe_subscription_id ON stripe_subscriptions(stripe_subscription_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_stripe_customers_updated_at 
    BEFORE UPDATE ON stripe_customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_stripe_tables_updated_at();

CREATE TRIGGER update_stripe_subscriptions_updated_at 
    BEFORE UPDATE ON stripe_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_stripe_tables_updated_at(); 