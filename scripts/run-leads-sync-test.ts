import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import the agent
import { leadsCoreAgent } from '../lib/sync/agents/01-leads-core';

async function main() {
  console.log("--- Running Leads Sync (Agent 01) - TEST LIMIT 100 ---");
  
  try {
    // Sync with limit
    const results = await leadsCoreAgent.syncTable(
      'cvcrm_leads',
      '/api/v1/comercial/leads',
      'CVCRM_TOKEN_LEAD',
      { fullSync: true, limit: 100, batchSize: 50 }
    );

    console.log("Sync Result:", {
      total: results.total,
      created: results.created,
      updated: results.updated,
      errors: results.errors,
      duration: `${(results.duration / 1000).toFixed(2)}s`,
    });
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

main().then(() => process.exit(0));
