#!/usr/bin/env node

/**
 * Script to update existing schedules with notification times
 * Run this once to fix existing schedules in your database
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Running schedule update migration...\n');

try {
  // Run the TypeScript seeder script
  const scriptPath = path.join(__dirname, '../src/seeders/update-existing-schedules.ts');
  
  // Use ts-node to run the TypeScript file
  execSync(`npx ts-node ${scriptPath}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n🎉 Migration completed successfully!');
} catch (error) {
  console.error('\n💥 Migration failed:', error.message);
  process.exit(1);
}
