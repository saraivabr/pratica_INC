/**
 * Test Sync Execution Script
 * Tests the sync infrastructure by running a single domain
 */

import { syncLeadsDomain, getAgentStats } from '../lib/sync/agents';

async function main() {
  console.log('\n🚀 Testing CV CRM Sync Infrastructure\n');
  console.log('='.repeat(60));

  // Show system stats
  const stats = getAgentStats();
  console.log('\n📊 System Status:');
  console.log(`   Total Agents: ${stats.total}`);
  console.log(`   Implemented: ${stats.implemented}`);
  console.log(`   Completion: ${stats.completion}%`);
  console.log(`   Total Endpoints: ${stats.endpoints}`);
  console.log(`   Total Tables: ${stats.tables}`);

  console.log('\n' + '='.repeat(60));
  console.log('\n🔄 Executing Leads Domain Sync (5 agents)...\n');

  try {
    const results = await syncLeadsDomain(true);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Sync Execution Test Complete!');
    console.log('='.repeat(60));
    console.log('\nResults:', JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();
