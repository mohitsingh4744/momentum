#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-check...');

// Check if Docker is running
function checkDocker() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    console.log('✅ Docker is running');
    return true;
  } catch (error) {
    console.error('❌ Docker is not running. Please start Docker Desktop.');
    return false;
  }
}

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    console.log('✅ Supabase CLI is installed');
    return true;
  } catch (error) {
    console.error('❌ Supabase CLI is not installed. Please install it with: brew install supabase/tap/supabase');
    return false;
  }
}

// Check if Supabase is running and healthy
function checkSupabaseHealth() {
  try {
    // Check if supabase is running
    const status = execSync('supabase status', { encoding: 'utf8' });
    
    if (status.includes('API URL: http://127.0.0.1:54321')) {
      console.log('✅ Supabase is running');
      
      // Test the API endpoint
      try {
        execSync('curl -s http://127.0.0.1:54321/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"', { stdio: 'ignore' });
        console.log('✅ Supabase API is responding');
        return true;
      } catch (error) {
        console.log('⚠️  Supabase API not responding, starting Supabase...');
        return startSupabase();
      }
    } else {
      console.log('⚠️  Supabase not running, starting...');
      return startSupabase();
    }
  } catch (error) {
    console.log('⚠️  Supabase not running, starting...');
    return startSupabase();
  }
}

// Start Supabase
function startSupabase() {
  try {
    console.log('🚀 Starting Supabase...');
    execSync('supabase start', { stdio: 'inherit' });
    console.log('✅ Supabase started successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to start Supabase:', error.message);
    return false;
  }
}

// Check if node_modules exist in all packages
function checkDependencies() {
  const packages = [
    'apps/web',
    'apps/edge', 
    'packages/db'
  ];
  
  let allInstalled = true;
  
  for (const pkg of packages) {
    const nodeModulesPath = path.join(pkg, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(`⚠️  Installing dependencies for ${pkg}...`);
      try {
        execSync('pnpm install', { cwd: pkg, stdio: 'inherit' });
        console.log(`✅ Dependencies installed for ${pkg}`);
      } catch (error) {
        console.error(`❌ Failed to install dependencies for ${pkg}`);
        allInstalled = false;
      }
    }
  }
  
  if (allInstalled) {
    console.log('✅ All dependencies are installed');
  }
  
  return allInstalled;
}

// Main pre-check function
function runPrecheck() {
  console.log('🔍 Running environment pre-check...\n');
  
  const checks = [
    { name: 'Docker', fn: checkDocker },
    { name: 'Supabase CLI', fn: checkSupabaseCLI },
    { name: 'Supabase Health', fn: checkSupabaseHealth },
    { name: 'Dependencies', fn: checkDependencies }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    console.log(`\n🔍 Checking ${check.name}...`);
    if (!check.fn()) {
      allPassed = false;
      console.error(`❌ ${check.name} check failed`);
    }
  }
  
  if (allPassed) {
    console.log('\n✅ All pre-checks passed! Ready to run tests and linting.');
    process.exit(0);
  } else {
    console.error('\n❌ Some pre-checks failed. Please fix the issues above before running tests or linting.');
    process.exit(1);
  }
}

// Run the pre-check
runPrecheck(); 