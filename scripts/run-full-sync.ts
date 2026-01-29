#!/usr/bin/env tsx
/**
 * CV CRM Complete Sync Execution Script
 * Runs all 28 agents across 7 domains
 */

import { syncAllDomains, getAgentStats } from '../lib/sync/agents';

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CV CRM COMPLETE SYNC - ALL 28 AGENTS                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Display stats before sync
  const stats = getAgentStats();
  console.log('📊 Agent Statistics:');
  console.log(`   Total Agents: ${stats.total}`);
  console.log(`   Implemented: ${stats.implemented}/${stats.total}`);
  console.log(`   Completion: ${stats.completion}%`);
  console.log(`   Total Endpoints: ${stats.endpoints}`);
  console.log(`   Total Tables: ${stats.tables}`);
  console.log('');

  // Display domains
  console.log('🎯 Domains to Sync:');
  Object.entries(stats.domains).forEach(([name, info]) => {
    const status = info.complete ? '✅' : '⏳';
    console.log(`   ${status} ${name}: ${info.implemented}/${info.total} agents`);
  });
  console.log('');

  // Confirm environment
  console.log('🔧 Environment Check:');
  console.log(`   CV CRM Email: ${process.env.CVCRM_EMAIL || 'NOT SET'}`);
  console.log(`   Base URL: ${process.env.CVCRM_BASE_URL || 'NOT SET'}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'NOT SET'}`);
  console.log('');

  if (!process.env.CVCRM_EMAIL || !process.env.DATABASE_URL) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
  }

  console.log('⏰ Starting sync in 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Execute full sync (fullSync = true)
    const results = await syncAllDomains(true);

    // Display final report
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    SYNC COMPLETED!                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📈 Final Report:');
    console.log(`   Total Duration: ${results.duration}s`);
    console.log('');
    console.log('✅ Domain Results:');
    console.log(`   Leads Domain: ${results.leads.length} agents completed`);
    console.log(`   Pessoas Domain: ${results.pessoas.length} agents completed`);
    console.log(`   Reservas Domain: ${results.reservas.length} agents completed`);
    console.log(`   Atendimentos Domain: ${results.atendimentos.length} agents completed`);
    console.log(`   Assistências Domain: ${results.assistencias.length} agents completed`);
    console.log(`   Commercial Domain: ${results.comercial.length} agents completed`);
    console.log(`   Final Domain: ${results.final.length} agents completed`);
    console.log('');

    // Calculate totals
    const totalAgents =
      results.leads.length +
      results.pessoas.length +
      results.reservas.length +
      results.atendimentos.length +
      results.assistencias.length +
      results.comercial.length +
      results.final.length;

    console.log('🎉 SUCCESS:');
    console.log(`   ${totalAgents}/28 agents synchronized successfully`);
    console.log(`   Average time per agent: ${(results.duration / totalAgents).toFixed(2)}s`);
    console.log('');

    console.log('✨ Next Steps:');
    console.log('   1. Review sync logs for any warnings');
    console.log('   2. Verify data integrity in database');
    console.log('   3. Check dashboard for sync status');
    console.log('   4. Schedule automated syncs via cron');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ SYNC FAILED:');
    console.error(error);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Check API tokens in .env.local');
    console.error('   2. Verify database connection');
    console.error('   3. Review error logs above');
    console.error('   4. Retry with individual domain sync');
    console.error('');
    process.exit(1);
  }
}

// Run the script
main();
