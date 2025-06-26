#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running simple pre-check...');

// Check if Docker is running
try {
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker is running');
} catch (error) {
  console.error('❌ Docker is not running. Please start Docker Desktop.');
  process.exit(1);
}

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'ignore' });
  console.log('✅ Supabase CLI is installed');
} catch (error) {
  console.error('❌ Supabase CLI is not installed. Please install it with: brew install supabase/tap/supabase');
  process.exit(1);
}

// Stop any running Supabase instances to avoid conflicts
try {
  console.log('🛑 Stopping any running Supabase instances...');
  execSync('supabase stop', { stdio: 'ignore' });
  console.log('✅ Stopped existing Supabase instances');
} catch (error) {
  console.log('⚠️  No running Supabase instances to stop');
}

// Start Supabase fresh
try {
  console.log('🚀 Starting Supabase...');
  execSync('supabase start', { stdio: 'ignore' });
  console.log('✅ Supabase is running');
  
  // Wait a moment for containers to stabilize
  console.log('⏳ Waiting for containers to stabilize...');
  execSync('sleep 3', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Failed to start Supabase:', error.message);
  process.exit(1);
}

// Check dependencies
const packages = ['apps/web', 'apps/edge', 'packages/db'];
for (const pkg of packages) {
  const nodeModulesPath = path.join(pkg, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(`⚠️  Installing dependencies for ${pkg}...`);
    try {
      execSync('pnpm install', { cwd: pkg, stdio: 'ignore' });
      console.log(`✅ Dependencies installed for ${pkg}`);
    } catch (error) {
      console.error(`❌ Failed to install dependencies for ${pkg}`);
      process.exit(1);
    }
  }
}

console.log('✅ All pre-checks passed! Ready to run tests and linting.'); 