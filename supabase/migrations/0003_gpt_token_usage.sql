-- Create gpt_token_usage table for tracking user quotas
CREATE TABLE gpt_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_limit INTEGER NOT NULL DEFAULT 100000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one quota record per user per month
  UNIQUE(user_id, month_start)
);

-- Enable RLS on gpt_token_usage table
ALTER TABLE gpt_token_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for gpt_token_usage table
CREATE POLICY "Users can view their own token usage" ON gpt_token_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own token usage" ON gpt_token_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert (for webhook)
CREATE POLICY "Service role can insert token usage" ON gpt_token_usage
    FOR INSERT WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_gpt_token_usage_user_month ON gpt_token_usage(user_id, month_start);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_gpt_token_usage_updated_at 
    BEFORE UPDATE ON gpt_token_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 