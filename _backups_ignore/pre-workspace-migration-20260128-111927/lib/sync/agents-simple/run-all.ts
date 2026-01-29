/**
 * CV CRM Sync Orchestrator
 *
 * Runs all 5 sync agents to pull data from CV CRM API
 * Total records: ~64,688
 */

import dotenv from 'dotenv';
import { syncLeadsCore } from './01-leads-core';
import { syncLeadsInteracoes } from './02-leads-interacoes';
import { syncLeadsTarefas } from './03-leads-tarefas';
import { syncAtendimentosCore } from './04-atendimentos-core';
import { syncAssistenciasCore } from './05-assistencias-core';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface SyncResult {
  agent: string;
  status: 'success' | 'failed';
  duration: number;
  error?: string;
}

async function runAllAgents(tenantId: number, parallel = false): Promise<void> {
  console.log('\n🚀 CV CRM Complete Sync Starting...');
  console.log('=' .repeat(80));
  console.log(`Tenant ID: ${tenantId}`);
  console.log('Target: ~64,688 records across 5 endpoints');
  console.log('Mode:', parallel ? 'PARALLEL' : 'SEQUENTIAL');
  console.log('=' .repeat(80));

  const startTime = Date.now();
  const results: SyncResult[] = [];

  const agents = [
    { name: 'leads-core', fn: syncLeadsCore, records: '~19,642' },
    { name: 'leads-interacoes', fn: syncLeadsInteracoes, records: '~35,305' },
    { name: 'leads-tarefas', fn: syncLeadsTarefas, records: '~8,182' },
    { name: 'atendimentos-core', fn: syncAtendimentosCore, records: '~1,558' },
    { name: 'assistencias-core', fn: syncAssistenciasCore, records: '~1' }
  ];

  if (parallel) {
    console.log('\n⚡ Running all agents in PARALLEL...\n');

    const promises = agents.map(async (agent) => {
      const agentStart = Date.now();
      try {
        await agent.fn(tenantId, true);
        const duration = (Date.now() - agentStart) / 1000;
        results.push({ agent: agent.name, status: 'success', duration });
      } catch (error) {
        const duration = (Date.now() - agentStart) / 1000;
        results.push({
          agent: agent.name,
          status: 'failed',
          duration,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.all(promises);

  } else {
    console.log('\n📋 Running agents SEQUENTIALLY...\n');

    for (const agent of agents) {
      console.log(`\n▶️  Agent ${agents.indexOf(agent) + 1}/5: ${agent.name} (${agent.records} records)`);
      const agentStart = Date.now();

      try {
        await agent.fn(tenantId, true);
        const duration = (Date.now() - agentStart) / 1000;
        results.push({ agent: agent.name, status: 'success', duration });
        console.log(`✅ ${agent.name} completed in ${duration.toFixed(2)}s\n`);
      } catch (error) {
        const duration = (Date.now() - agentStart) / 1000;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ agent: agent.name, status: 'failed', duration, error: errorMsg });
        console.error(`❌ ${agent.name} failed in ${duration.toFixed(2)}s: ${errorMsg}\n`);
      }
    }
  }

  // Summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('\n' + '=' .repeat(80));
  console.log('📊 SYNC SUMMARY');
  console.log('=' .repeat(80));
  console.log(`Total Duration: ${totalDuration}s`);
  console.log(`Successful: ${successful}/${agents.length}`);
  console.log(`Failed: ${failed}/${agents.length}`);
  console.log('\nAgent Results:');

  results.forEach((result) => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`  ${status} ${result.agent.padEnd(25)} ${result.duration.toFixed(2)}s`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  console.log('=' .repeat(80) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const tenantId = args.find(arg => !arg.startsWith('-')) ? parseInt(args.find(arg => !arg.startsWith('-'))!) : 1;
const parallel = args.includes('--parallel') || args.includes('-p');

// Run
if (require.main === module) {
  console.log(`Running sync for tenant_id: ${tenantId}`);
  console.log(`Usage: npx tsx lib/sync/agents-simple/run-all.ts [tenant_id] [--parallel]\n`);

  runAllAgents(tenantId, parallel)
    .then(() => {
      console.log('✅ All syncs completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sync orchestrator failed:', error);
      process.exit(1);
    });
}
