/**
 * Test script for Leads domain sync
 */

import { leadsCoreAgent } from '../lib/sync/agents/01-leads-core';

async function testLeadsSync() {
  console.log('🚀 Starting Leads Domain Sync Test\n');
  console.log('=' .repeat(60));

  try {
    // Test leads core sync
    console.log('\n📊 Syncing Leads Core...\n');
    const result = await leadsCoreAgent.sync(true);

    console.log('\n✅ Sync completed!');
    console.log('=' .repeat(60));
    console.log('\n📈 Results:');
    console.log(`  Total items: ${result.total}`);
    console.log(`  Created: ${result.created}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Errors: ${result.errors}`);
    console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log('\n' + '=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

testLeadsSync()
  .then(() => {
    console.log('\n✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
