// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Reflection {
  id: string;
  user_id: string;
  date: string;
  prompts: any;
  answers: any;
  created_at: string;
}

interface WeeklyReport {
  week_start: string;
  total_reflections: number;
  reflection_dates: string[];
  common_themes: string[];
  mood_summary: {
    positive: number;
    neutral: number;
    negative: number;
  };
  goals_progress: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
  };
}

function generateHTMLTemplate(report: WeeklyReport, userEmail: string): string {
  const weekEnd = new Date(report.week_start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Weekly Report - ${report.week_start} to ${weekEnd.toISOString().split('T')[0]}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #2c3e50; border-bottom: 1px solid #ecf0f1; padding-bottom: 10px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
    .stat-label { color: #7f8c8d; margin-top: 5px; }
    .themes { background: #ecf0f1; padding: 15px; border-radius: 8px; }
    .theme { display: inline-block; background: #3498db; color: white; padding: 5px 10px; margin: 5px; border-radius: 15px; }
    .mood-chart { display: flex; align-items: end; height: 100px; gap: 10px; }
    .mood-bar { background: #e74c3c; width: 60px; border-radius: 5px 5px 0 0; }
    .mood-bar.positive { background: #27ae60; }
    .mood-bar.neutral { background: #f39c12; }
    .mood-bar.negative { background: #e74c3c; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Weekly Reflection Report</h1>
    <p>${userEmail}</p>
    <p>${report.week_start} to ${weekEnd.toISOString().split('T')[0]}</p>
  </div>

  <div class="section">
    <h2>📊 Weekly Overview</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-number">${report.total_reflections}</div>
        <div class="stat-label">Reflections</div>
      </div>
      <div class="stat">
        <div class="stat-number">${report.goals_progress.active_goals}</div>
        <div class="stat-label">Active Goals</div>
      </div>
      <div class="stat">
        <div class="stat-number">${report.goals_progress.completed_goals}</div>
        <div class="stat-label">Completed</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🎯 Goals Progress</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-number">${report.goals_progress.total_goals}</div>
        <div class="stat-label">Total Goals</div>
      </div>
      <div class="stat">
        <div class="stat-number">${report.goals_progress.active_goals}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat">
        <div class="stat-number">${report.goals_progress.completed_goals}</div>
        <div class="stat-label">Completed</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>😊 Mood Summary</h2>
    <div class="mood-chart">
      <div class="mood-bar positive" style="height: ${(report.mood_summary.positive / Math.max(report.mood_summary.positive, report.mood_summary.neutral, report.mood_summary.negative)) * 80}px;"></div>
      <div class="mood-bar neutral" style="height: ${(report.mood_summary.neutral / Math.max(report.mood_summary.positive, report.mood_summary.neutral, report.mood_summary.negative)) * 80}px;"></div>
      <div class="mood-bar negative" style="height: ${(report.mood_summary.negative / Math.max(report.mood_summary.positive, report.mood_summary.neutral, report.mood_summary.negative)) * 80}px;"></div>
    </div>
    <div style="text-align: center; margin-top: 10px;">
      <span style="color: #27ae60;">Positive: ${report.mood_summary.positive}</span> |
      <span style="color: #f39c12;">Neutral: ${report.mood_summary.neutral}</span> |
      <span style="color: #e74c3c;">Negative: ${report.mood_summary.negative}</span>
    </div>
  </div>

  <div class="section">
    <h2>🔍 Common Themes</h2>
    <div class="themes">
      ${report.common_themes.length > 0 
        ? report.common_themes.map(theme => `<span class="theme">${theme}</span>`).join('')
        : '<p>No common themes identified this week.</p>'
      }
    </div>
  </div>

  <div class="section">
    <h2>📅 Reflection Dates</h2>
    <p>You reflected on: ${report.reflection_dates.join(', ')}</p>
  </div>

  <div style="margin-top: 50px; text-align: center; color: #7f8c8d; font-size: 0.9em;">
    <p>Generated by Momentum - Your Personal Growth Companion</p>
  </div>
</body>
</html>
  `;
}

async function htmlToPDF(html: string): Promise<Uint8Array> {
  // For now, we'll create a simple PDF with basic text
  // In production, you'd use a proper HTML-to-PDF library like Puppeteer
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const lines = html.replace(/<[^>]*>/g, '').split('\n').filter(line => line.trim());
  let y = 750;
  
  for (const line of lines.slice(0, 50)) { // Limit to first 50 lines
    if (y < 50) break;
    page.drawText(line.trim(), {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 15;
  }
  
  return await pdfDoc.save();
}

async function aggregateReflections(reflections: Reflection[]): Promise<WeeklyReport> {
  const reflectionDates = reflections.map(r => r.date);
  const totalReflections = reflections.length;
  
  // Extract common themes from answers (simplified)
  const allAnswers = reflections.flatMap(r => 
    Object.values(r.answers).filter(answer => typeof answer === 'string')
  );
  
  const words = allAnswers.flatMap(answer => 
    (answer as string).toLowerCase().split(/\s+/).filter(word => word.length > 3)
  );
  
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const commonThemes = Object.entries(wordCount)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([word, _]) => word);
  
  // Simple mood analysis (in production, use NLP)
  const moodKeywords = {
    positive: ['happy', 'excited', 'great', 'good', 'amazing', 'wonderful', 'progress', 'achieved'],
    negative: ['sad', 'frustrated', 'difficult', 'hard', 'struggling', 'disappointed', 'worried'],
    neutral: ['okay', 'fine', 'normal', 'usual', 'regular']
  };
  
  let positive = 0, neutral = 0, negative = 0;
  
  allAnswers.forEach(answer => {
    const answerLower = (answer as string).toLowerCase();
    if (moodKeywords.positive.some(word => answerLower.includes(word))) positive++;
    else if (moodKeywords.negative.some(word => answerLower.includes(word))) negative++;
    else neutral++;
  });
  
  return {
    week_start: reflectionDates[0] || new Date().toISOString().split('T')[0],
    total_reflections,
    reflection_dates: reflectionDates,
    common_themes: commonThemes,
    mood_summary: { positive, neutral, negative },
    goals_progress: {
      total_goals: 0, // Will be populated from goals table
      active_goals: 0,
      completed_goals: 0
    }
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the date range for the past week (Sunday to Saturday)
    const now = new Date();
    const daysSinceSunday = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceSunday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log(`Processing weekly report for week starting: ${weekStart.toISOString()}`);
    
    // Get all users who have reflections in the past week
    const { data: usersWithReflections, error: usersError } = await supabase
      .from('reflections')
      .select('user_id')
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .not('user_id', 'is', null);
    
    if (usersError) {
      console.error('Error fetching users with reflections:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const uniqueUserIds = [...new Set(usersWithReflections.map(r => r.user_id))];
    console.log(`Found ${uniqueUserIds.length} users with reflections this week`);
    
    const results = [];
    
    for (const userId of uniqueUserIds) {
      try {
        // Get user's reflections for the week
        const { data: reflections, error: reflectionsError } = await supabase
          .from('reflections')
          .select('*')
          .eq('user_id', userId)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])
          .order('date', { ascending: true });
        
        if (reflectionsError) {
          console.error(`Error fetching reflections for user ${userId}:`, reflectionsError);
          continue;
        }
        
        if (!reflections || reflections.length === 0) {
          console.log(`No reflections found for user ${userId}`);
          continue;
        }
        
        // Get user's goals for progress tracking
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('archived', false);
        
        if (goalsError) {
          console.error(`Error fetching goals for user ${userId}:`, goalsError);
        }
        
        // Get user email for the report
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
        const userEmail = userError ? 'Unknown User' : user.user.email || 'Unknown User';
        
        // Aggregate reflections
        const report = await aggregateReflections(reflections);
        
        // Update goals progress
        if (goals) {
          report.goals_progress = {
            total_goals: goals.length,
            active_goals: goals.filter(g => !g.archived).length,
            completed_goals: goals.filter(g => g.archived).length
          };
        }
        
        // Generate HTML template
        const html = generateHTMLTemplate(report, userEmail);
        
        // Convert to PDF
        const pdfBytes = await htmlToPDF(html);
        
        // Upload to Supabase Storage
        const fileName = `weekly-reports/${userId}/${weekStart.toISOString().split('T')[0]}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`Error uploading PDF for user ${userId}:`, uploadError);
          continue;
        }
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('reports')
          .getPublicUrl(fileName);
        
        const pdfUrl = urlData.publicUrl;
        
        // Insert weekly report record
        const { error: insertError } = await supabase
          .from('weekly_reports')
          .insert({
            user_id: userId,
            week_start: weekStart.toISOString().split('T')[0],
            summary: report,
            pdf_url: pdfUrl
          });
        
        if (insertError) {
          console.error(`Error inserting weekly report for user ${userId}:`, insertError);
          continue;
        }
        
        console.log(`Generated weekly report for user ${userId}: ${pdfUrl}`);
        results.push({
          user_id: userId,
          email: userEmail,
          pdf_url: pdfUrl,
          reflections_count: reflections.length
        });
        
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Weekly reports generated successfully',
        week_start: weekStart.toISOString().split('T')[0],
        users_processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Weekly report job error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 