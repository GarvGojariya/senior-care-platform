#!/usr/bin/env ts-node

import { seedDatabase } from './database-seeder';

async function runSeeder() {
  try {
    await seedDatabase();
    console.log('🎉 Seeder completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeder failed:', error);
    process.exit(1);
  }
}

runSeeder(); 