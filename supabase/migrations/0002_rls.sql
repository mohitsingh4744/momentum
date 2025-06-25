-- Enable Row-Level Security on all tables
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for goals table
CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for reflections table
CREATE POLICY "Users can view their own reflections" ON reflections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections" ON reflections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections" ON reflections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections" ON reflections
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for weekly_reports table
CREATE POLICY "Users can view their own weekly reports" ON weekly_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly reports" ON weekly_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly reports" ON weekly_reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly reports" ON weekly_reports
    FOR DELETE USING (auth.uid() = user_id); 