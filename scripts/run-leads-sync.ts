import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import the agent
import { leadsCoreAgent } from '../lib/sync/agents/01-leads-core';
import { dbQuery } from '../lib/sync/db-cli-adapter';

// Override the global dbQuery used by the agent if possible, 
// but since it's imported from @/lib/db inside the file, 
// we might need a different approach if it fails.
// A common trick is to use a module alias or just run it and see.

async function main() {
  console.log("--- Running Leads Sync (Agent 01) ---");
  
  try {
    // We'll try to run it. If it fails due to 'server-only', 
    // we'll have to use a more aggressive mock or modify the BaseAgent.
    const result = await leadsCoreAgent.sync(true); // Full sync for testing
    console.log("Sync Result:", result);
  } catch (error) {
    console.error("Sync failed:", error);

    if (error instanceof Error && error.message.includes('server-only')) {
        console.log("\nTIP: The agent is trying to import 'server-only' via lib/db.");
        console.log("I will now try a more aggressive approach.");
    }
  }
}

main().then(() => process.exit(0));
